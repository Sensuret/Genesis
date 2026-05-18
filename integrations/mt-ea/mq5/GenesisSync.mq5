//+------------------------------------------------------------------+
//|                                                  GenesisSync.mq5 |
//|                              Genesis Trading Analytics — Auto-sync|
//|                                            https://genesis08.netlify.app |
//+------------------------------------------------------------------+
//
// MT5 build of the Genesis auto-sync Expert Advisor. Behaviour mirrors
// the MQL4 version — see integrations/mt-ea/README.md for the setup
// guide. Multi-account / multi-user out of the box: same compiled .ex5
// works for any user, any broker, any account; authentication is via
// the `GenesisApiKey` input and (account_number, ticket) is used as the
// upsert key on the Supabase side.
//+------------------------------------------------------------------+
#property strict
#property version   "1.00"
#property description "Genesis Trading Analytics — auto-sync MT5 trades to Supabase."

#include <Trade\PositionInfo.mqh>
#include <Trade\DealInfo.mqh>

input string SupabaseUrl       = "https://YOUR-PROJECT-REF.supabase.co"; // Supabase project URL
input string GenesisApiKey     = "gs_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"; // Generate in Genesis → Settings → Accounts
input string AccountLabel      = "";                                     // Optional friendly label
input int    PollSeconds       = 30;                                     // Background poll while idle
input int    HistoryDays       = 365;                                    // Backfill window in days (0 = all history)
input int    LiveStateSeconds  = 2;                                      // Minimum seconds between live-state posts (Wave 4)
input bool   StreamLiveState   = true;                                   // Push floating P&L / equity / margin every tick
input bool   VerboseLog        = true;                                   // Print every posted/skipped trade

string g_endpoint    = "";
string g_seenFile    = "";
string g_contactFile = "";
datetime g_lastPoll  = 0;
// Reconnection state — set during OnInit, used to flip the EA setup
// wizard to Connected within seconds of a reattach (instead of waiting
// up to PollSeconds for the first OnTimer fire) and to back off on a
// flaky network so we don't hammer the Edge Function with retries.
bool     g_firstTickPingSent  = false;
datetime g_lastSuccessfulPost = 0;
datetime g_backoffUntil       = 0;
int      g_backoffStreak      = 0;
datetime g_lastLiveState      = 0;
int      g_lastOpenCount      = -1;

CPositionInfo  m_pos;
CDealInfo      m_deal;

string TrimTrailingSlash(string s)
{
  while(StringLen(s) > 0 && StringGetCharacter(s, StringLen(s) - 1) == '/')
    s = StringSubstr(s, 0, StringLen(s) - 1);
  return s;
}

string JsonEscape(string s)
{
  string out = "";
  for(int i = 0; i < StringLen(s); i++)
  {
    ushort ch = StringGetCharacter(s, i);
    if(ch == '"')      out += "\\\"";
    else if(ch == '\\') out += "\\\\";
    else if(ch == '\n') out += "\\n";
    else if(ch == '\r') out += "\\r";
    else if(ch == '\t') out += "\\t";
    else                out += ShortToString(ch);
  }
  return out;
}

string Q(string key, string value, bool isLast = false)
{
  return "\"" + key + "\":\"" + JsonEscape(value) + "\"" + (isLast ? "" : ",");
}
string N(string key, double value, bool isLast = false)
{
  return "\"" + key + "\":" + DoubleToString(value, 5) + (isLast ? "" : ",");
}

string FormatTime(datetime t)
{
  if(t <= 0) return "";
  return TimeToString(t, TIME_DATE | TIME_SECONDS);
}

// Persisted timestamp of the last successful contact with the Genesis
// Edge Function. Read on OnInit so we can log a humanised "offline for
// X minutes" message after MT5 restarts, and written after every
// successful POST so the next reattach has a fresh anchor.
datetime ReadLastContactMarker()
{
  if(StringLen(g_contactFile) == 0) return 0;
  int h = FileOpen(g_contactFile, FILE_READ | FILE_TXT | FILE_COMMON);
  if(h == INVALID_HANDLE) return 0;
  datetime t = 0;
  if(!FileIsEnding(h))
  {
    string s = FileReadString(h);
    t = (datetime)StringToInteger(s);
  }
  FileClose(h);
  return t;
}

void WriteLastContactMarker()
{
  if(StringLen(g_contactFile) == 0) return;
  int h = FileOpen(g_contactFile, FILE_WRITE | FILE_TXT | FILE_COMMON);
  if(h == INVALID_HANDLE) return;
  FileWrite(h, (string)(long)TimeCurrent());
  FileClose(h);
}

bool PostJson(string body)
{
  if(StringLen(GenesisApiKey) < 6 || StringFind(GenesisApiKey, "gs_") != 0)
  {
    Print("[Genesis] Invalid GenesisApiKey input.");
    return false;
  }
  // Honour any active backoff so a sustained outage doesn't loop on
  // every tick. OnTimer fires every PollSeconds and will resume the
  // moment the backoff window expires.
  if(g_backoffUntil > 0 && TimeCurrent() < g_backoffUntil)
  {
    if(VerboseLog)
      Print("[Genesis] Backoff active — skipping POST until ",
            TimeToString(g_backoffUntil, TIME_DATE | TIME_SECONDS));
    return false;
  }

  uchar data[];
  StringToCharArray(body, data, 0, StringLen(body));
  if(ArraySize(data) > 0 && data[ArraySize(data) - 1] == 0)
    ArrayResize(data, ArraySize(data) - 1);

  string headers = "Content-Type: application/json\r\nX-Api-Key: " + GenesisApiKey + "\r\n";

  // One immediate retry on transient failures (network timeout, HTTP
  // 5xx). Permanent failures (4xx, missing whitelist) fall through
  // immediately so we don't double-log invalid input.
  for(int attempt = 1; attempt <= 2; attempt++)
  {
    uchar  result[];
    string responseHeaders = "";
    ResetLastError();
    int status = WebRequest("POST", g_endpoint, headers, 10000, data, result, responseHeaders);

    if(status == -1)
    {
      int err = GetLastError();
      if(attempt == 1)
      {
        if(VerboseLog) Print("[Genesis] WebRequest err=", err, " — retrying in 500ms");
        Sleep(500);
        continue;
      }
      Print("[Genesis] WebRequest failed err=", err,
            " — make sure the Supabase URL is in Tools → Options → Expert Advisors → Allow WebRequest, ",
            "and that the toolbar \"Algo Trading\" button is green.");
      g_backoffStreak++;
      // Exponential backoff capped at 5 minutes: 30s, 60s, 120s, 240s, 300s.
      int wait = (int)MathMin(300, 30 * MathPow(2, g_backoffStreak - 1));
      g_backoffUntil = TimeCurrent() + wait;
      Print("[Genesis] Backing off ", wait, "s before next attempt.");
      return false;
    }

    if(status >= 500 && status < 600)
    {
      string txt = CharArrayToString(result);
      if(attempt == 1)
      {
        if(VerboseLog) Print("[Genesis] HTTP ", status, " transient — retrying in 500ms");
        Sleep(500);
        continue;
      }
      Print("[Genesis] HTTP ", status, " body=", txt);
      g_backoffStreak++;
      int wait = (int)MathMin(300, 30 * MathPow(2, g_backoffStreak - 1));
      g_backoffUntil = TimeCurrent() + wait;
      Print("[Genesis] Backing off ", wait, "s before next attempt.");
      return false;
    }

    if(status >= 400)
    {
      string txt = CharArrayToString(result);
      Print("[Genesis] HTTP ", status, " body=", txt);
      // 4xx is a client error — no point retrying, no point backing off either.
      return false;
    }

    g_lastSuccessfulPost = TimeCurrent();
    g_backoffStreak = 0;
    g_backoffUntil = 0;
    WriteLastContactMarker();
    return true;
  }
  return false;
}

// Heartbeat: lets the Genesis app know this account is online even when
// there are no closed trades in the lookback window. Without this, the
// EA setup wizard's "Waiting for first ping…" banner would stay forever
// on a fresh account that hasn't traded in the last `HistoryDays` days.
void SendHeartbeat()
{
  string label = (StringLen(AccountLabel) > 0) ? AccountLabel : AccountInfoString(ACCOUNT_NAME);
  string body = "{";
  body += Q("kind",            "heartbeat");
  body += Q("account_number",  (string)AccountInfoInteger(ACCOUNT_LOGIN));
  body += Q("account_name",    label);
  body += Q("broker",          AccountInfoString(ACCOUNT_COMPANY));
  body += Q("server",          AccountInfoString(ACCOUNT_SERVER));
  body += Q("platform",        "MT5");
  body += Q("ticket",          "heartbeat", true);
  body += "}";
  PostJson(body);
}

string SideFromType(ENUM_POSITION_TYPE t)
{
  if(t == POSITION_TYPE_BUY)  return "buy";
  if(t == POSITION_TYPE_SELL) return "sell";
  return "";
}

string DealSideFromType(ENUM_DEAL_TYPE t)
{
  if(t == DEAL_TYPE_BUY)  return "buy";
  if(t == DEAL_TYPE_SELL) return "sell";
  return "";
}

void EnsureSeenFolder()
{
  int h = FileOpen(g_seenFile, FILE_READ | FILE_WRITE | FILE_TXT | FILE_COMMON);
  if(h != INVALID_HANDLE) FileClose(h);
}

bool IsSeen(string fingerprint)
{
  int h = FileOpen(g_seenFile, FILE_READ | FILE_TXT | FILE_COMMON);
  if(h == INVALID_HANDLE) return false;
  bool found = false;
  while(!FileIsEnding(h))
  {
    string line = FileReadString(h);
    if(line == fingerprint) { found = true; break; }
  }
  FileClose(h);
  return found;
}

void MarkSeen(string fingerprint)
{
  int h = FileOpen(g_seenFile, FILE_READ | FILE_WRITE | FILE_TXT | FILE_COMMON);
  if(h == INVALID_HANDLE) return;
  FileSeek(h, 0, SEEK_END);
  FileWrite(h, fingerprint);
  FileClose(h);
}

string Fingerprint(string ticket, bool closed, double sl, double tp, double profit)
{
  return ticket + "|" + (closed ? "C" : "O") +
         "|" + DoubleToString(sl, 5) + "|" + DoubleToString(tp, 5) +
         "|" + DoubleToString(profit, 2);
}

//+------------------------------------------------------------------+
//| Live-state push — open positions + account snapshot in one call. |
//| Throttled to LiveStateSeconds. Cheap on the wire: even 5 open    |
//| positions are well under 1 KB. Drives the Genesis Reports /      |
//| Day View / Dashboard live floating-P&L tick.                     |
//+------------------------------------------------------------------+
void SendLiveState()
{
  if(!StreamLiveState) return;
  if(LiveStateSeconds > 0 && TimeCurrent() - g_lastLiveState < LiveStateSeconds) return;

  // When there are no open positions, send the snapshot every 30s
  // instead of every 2s — the equity/margin numbers only change with
  // swap accrual / deposits while flat.
  if(PositionsTotal() == 0 && g_lastOpenCount == 0
     && TimeCurrent() - g_lastLiveState < 30)
    return;

  string label = (StringLen(AccountLabel) > 0) ? AccountLabel : AccountInfoString(ACCOUNT_NAME);
  string body = "{";
  body += Q("kind",           "live_state");
  body += Q("account_number", (string)AccountInfoInteger(ACCOUNT_LOGIN));
  body += Q("account_name",   label);
  body += Q("broker",         AccountInfoString(ACCOUNT_COMPANY));
  body += Q("server",         AccountInfoString(ACCOUNT_SERVER));
  body += Q("platform",       "MT5");
  body += Q("ticket",         "tick");

  // Account-level numbers.
  double balance     = AccountInfoDouble(ACCOUNT_BALANCE);
  double equity      = AccountInfoDouble(ACCOUNT_EQUITY);
  double margin      = AccountInfoDouble(ACCOUNT_MARGIN);
  double freeMargin  = AccountInfoDouble(ACCOUNT_MARGIN_FREE);
  double marginLevel = AccountInfoDouble(ACCOUNT_MARGIN_LEVEL);
  body += N("balance",          balance);
  body += N("equity",           equity);
  body += N("margin",           margin);
  body += N("free_margin",      freeMargin);
  body += N("margin_level_pct", marginLevel);

  // Build the positions[] array.
  string posJson = "[";
  double sumFloating = 0.0;
  int posted = 0;
  for(int i = 0; i < PositionsTotal(); i++)
  {
    if(!m_pos.SelectByIndex(i)) continue;
    string sym       = m_pos.Symbol();
    long   ticket    = m_pos.Ticket();
    long   posType   = m_pos.PositionType();
    double lots      = m_pos.Volume();
    double openPrice = m_pos.PriceOpen();
    double curPrice  = m_pos.PriceCurrent();
    double sl        = m_pos.StopLoss();
    double tp        = m_pos.TakeProfit();
    double profit    = m_pos.Profit();
    double swap      = m_pos.Swap();
    datetime openTm  = (datetime)m_pos.Time();
    string side      = (posType == POSITION_TYPE_BUY) ? "buy" : "sell";

    sumFloating += profit + swap;

    if(posted > 0) posJson += ",";
    posJson += "{";
    posJson += Q("ticket",        (string)ticket);
    posJson += Q("symbol",        sym);
    posJson += Q("type",          side);
    posJson += N("lots",          lots);
    posJson += N("open_price",    openPrice);
    posJson += N("current_price", curPrice);
    posJson += N("sl",            sl);
    posJson += N("tp",            tp);
    posJson += N("profit",        profit);
    posJson += N("swap",          swap);
    posJson += N("commission",    0);
    posJson += Q("open_time",     FormatTime(openTm), true);
    posJson += "}";
    posted++;
  }
  posJson += "]";

  body += "\"positions\":" + posJson + ",";
  body += "\"open_positions_count\":" + (string)posted + ",";
  body += N("floating_pnl", sumFloating, true);
  body += "}";

  bool ok = PostJson(body);
  g_lastLiveState = TimeCurrent();
  g_lastOpenCount = posted;
  if(VerboseLog)
    Print("[Genesis] live_state posted=", posted, " floating=",
          DoubleToString(sumFloating, 2), ok ? " ok" : " failed");
}

//+------------------------------------------------------------------+
//| Open positions                                                   |
//+------------------------------------------------------------------+
int ScanOpenPositions()
{
  int posted = 0;
  for(int i = 0; i < PositionsTotal(); i++)
  {
    if(!m_pos.SelectByIndex(i)) continue;
    string ticket = (string)m_pos.Ticket();
    double sl = m_pos.StopLoss();
    double tp = m_pos.TakeProfit();
    double profit = m_pos.Profit();
    string fp = Fingerprint(ticket, false, sl, tp, profit);
    if(IsSeen(fp)) continue;
    string label = (StringLen(AccountLabel) > 0) ? AccountLabel : AccountInfoString(ACCOUNT_NAME);
    string body = "{";
    body += Q("account_number", (string)AccountInfoInteger(ACCOUNT_LOGIN));
    body += Q("account_name",   label);
    body += Q("broker",         AccountInfoString(ACCOUNT_COMPANY));
    body += Q("server",         AccountInfoString(ACCOUNT_SERVER));
    body += Q("platform",       "MT5");
    body += Q("ticket",         ticket);
    body += Q("symbol",         m_pos.Symbol());
    body += Q("type",           SideFromType((ENUM_POSITION_TYPE)m_pos.PositionType()));
    body += N("lots",           m_pos.Volume());
    body += N("open_price",     m_pos.PriceOpen());
    body += "\"close_price\":null,";
    body += N("sl",             sl);
    body += N("tp",             tp);
    body += N("profit",         profit);
    body += N("swap",           m_pos.Swap());
    body += N("commission",     m_pos.Commission());
    body += Q("open_time",      FormatTime((datetime)m_pos.Time()));
    body += "\"close_time\":null";
    body += "}";
    if(PostJson(body))
    {
      MarkSeen(fp);
      posted++;
    }
  }
  return posted;
}

//+------------------------------------------------------------------+
//| History deals — closed positions                                 |
//+------------------------------------------------------------------+
int ScanHistory(bool ignoreHistoryCap = false)
{
  // HistoryDays = 0 means "everything the broker has". MT5's epoch (D'1970')
  // is the safe lower bound that every server accepts. We also force the
  // unbounded scan on EA reattach so a long offline window (laptop off
  // for days) can never silently miss a close — the seen-set still
  // suppresses duplicates so this is free server-side.
  datetime from = (ignoreHistoryCap || HistoryDays <= 0)
    ? (datetime)0
    : TimeCurrent() - (datetime)(HistoryDays * 86400);
  if(!HistorySelect(from, TimeCurrent()))
  {
    if(VerboseLog) Print("[Genesis] HistorySelect failed err=", GetLastError());
    return;
  }
  int total = HistoryDealsTotal();
  if(VerboseLog) Print("[Genesis] ScanHistory from=", TimeToString(from, TIME_DATE),
                       " total_deals=", total, ignoreHistoryCap ? " (full)" : "");
  int posted = 0, skipped = 0;
  for(int i = total - 1; i >= 0; i--)
  {
    ulong dealTicket = HistoryDealGetTicket(i);
    if(dealTicket == 0) continue;
    // CDealInfo::Ticket(ulong) is a setter that returns void in newer
    // MT5 builds — selecting via the index keeps the boolean check we
    // need to skip rows that fail to load.
    if(!m_deal.SelectByIndex(i)) continue;
    if(m_deal.Entry() != DEAL_ENTRY_OUT && m_deal.Entry() != DEAL_ENTRY_OUT_BY) continue; // only closes
    if(m_deal.DealType() != DEAL_TYPE_BUY && m_deal.DealType() != DEAL_TYPE_SELL) continue;

    string positionTicket = (string)m_deal.PositionId();
    if(positionTicket == "" || positionTicket == "0") continue;

    double profit = m_deal.Profit();
    double swap   = m_deal.Swap();
    double commission = m_deal.Commission();
    double exitPrice = m_deal.Price();
    double lots = m_deal.Volume();
    string symbol = m_deal.Symbol();
    datetime closeTime = (datetime)m_deal.Time();

    // Find the open deal for this position to get open price + side + open_time.
    double openPrice = exitPrice;
    string side = "";
    datetime openTime = closeTime;
    for(int j = 0; j < total; j++)
    {
      ulong t2 = HistoryDealGetTicket(j);
      if(t2 == 0) continue;
      if(HistoryDealGetInteger(t2, DEAL_POSITION_ID) != m_deal.PositionId()) continue;
      if(HistoryDealGetInteger(t2, DEAL_ENTRY) != DEAL_ENTRY_IN) continue;
      openPrice = HistoryDealGetDouble(t2, DEAL_PRICE);
      openTime  = (datetime)HistoryDealGetInteger(t2, DEAL_TIME);
      side      = DealSideFromType((ENUM_DEAL_TYPE)HistoryDealGetInteger(t2, DEAL_TYPE));
      break;
    }
    if(StringLen(side) == 0)
    {
      // Fallback: invert close-side because closing buy = sell.
      side = (m_deal.DealType() == DEAL_TYPE_SELL) ? "buy" : "sell";
    }

    string fp = Fingerprint(positionTicket, true, 0, 0, profit);
    if(IsSeen(fp))
    {
      skipped++;
      if(VerboseLog) Print("[Genesis] skipped seen ticket=", positionTicket, " (", symbol, ")");
      continue;
    }

    string label = (StringLen(AccountLabel) > 0) ? AccountLabel : AccountInfoString(ACCOUNT_NAME);
    string body = "{";
    body += Q("account_number", (string)AccountInfoInteger(ACCOUNT_LOGIN));
    body += Q("account_name",   label);
    body += Q("broker",         AccountInfoString(ACCOUNT_COMPANY));
    body += Q("server",         AccountInfoString(ACCOUNT_SERVER));
    body += Q("platform",       "MT5");
    body += Q("ticket",         positionTicket);
    body += Q("symbol",         symbol);
    body += Q("type",           side);
    body += N("lots",           lots);
    body += N("open_price",     openPrice);
    body += N("close_price",    exitPrice);
    body += "\"sl\":null,\"tp\":null,";
    body += N("profit",         profit);
    body += N("swap",           swap);
    body += N("commission",     commission);
    body += Q("open_time",      FormatTime(openTime));
    body += Q("close_time",     FormatTime(closeTime), true);
    body += "}";
    if(PostJson(body))
    {
      MarkSeen(fp);
      posted++;
      if(VerboseLog) Print("[Genesis] posted ticket=", positionTicket, " (", symbol, " ", side, " ", DoubleToString(lots, 2), " profit=", DoubleToString(profit, 2), ")");
    }
  }
  if(VerboseLog) Print("[Genesis] ScanHistory done — posted=", posted, " skipped_seen=", skipped);
  return posted;
}

int OnInit()
{
  g_endpoint    = TrimTrailingSlash(SupabaseUrl) + "/functions/v1/receive-trade";
  g_seenFile    = "Genesis\\seen_"         + (string)AccountInfoInteger(ACCOUNT_LOGIN) + ".csv";
  g_contactFile = "Genesis\\last_contact_" + (string)AccountInfoInteger(ACCOUNT_LOGIN) + ".txt";
  EventSetTimer(PollSeconds);
  EnsureSeenFolder();

  // If we have a prior contact marker, surface the offline window in the
  // Experts log so the trader can see the reconnection happen rather
  // than wondering whether the EA picked back up after MT5 restarted.
  datetime prevContact = ReadLastContactMarker();
  if(prevContact > 0)
  {
    long offlineSeconds = (long)(TimeCurrent() - prevContact);
    long offlineMin = offlineSeconds / 60;
    Print("[Genesis] Reconnecting — last contact ", offlineMin, " minute(s) ago. ",
          "Endpoint=", g_endpoint, " Account=", AccountInfoInteger(ACCOUNT_LOGIN));
  }
  else
  {
    Print("[Genesis] EA initialised. Endpoint=", g_endpoint,
          " Account=", AccountInfoInteger(ACCOUNT_LOGIN));
  }

  // Heartbeat first so the Genesis wizard flips to Connected immediately,
  // even before history is scanned. ScanHistory(true) forces full-history
  // backfill on attach so an extended offline window can't silently miss
  // closes that fell outside the HistoryDays cap.
  SendHeartbeat();
  int closedPosted = ScanHistory(true);
  int openPosted   = ScanOpenPositions();
  WriteLastContactMarker();
  Print("[Genesis] Reconnected — backfilled ", closedPosted,
        " closed trade(s), ", openPosted, " open position(s).");
  g_lastPoll = TimeCurrent();
  return INIT_SUCCEEDED;
}

void OnDeinit(const int reason)
{
  EventKillTimer();
  WriteLastContactMarker();
}

void OnTimer()
{
  SendHeartbeat();
  SendLiveState();
  ScanOpenPositions();
  ScanHistory(false);
  g_lastPoll = TimeCurrent();
}

void OnTick()
{
  // First tick after a fresh attach: send the heartbeat immediately
  // rather than waiting up to PollSeconds for OnTimer to fire. The
  // setup wizard listens for last_synced_at and this is what makes the
  // status chip flip to Connected within seconds of MT5 reopening.
  if(!g_firstTickPingSent)
  {
    SendHeartbeat();
    g_firstTickPingSent = true;
  }

  // Live-state has its own throttle (LiveStateSeconds, default 2s) so
  // it runs more frequently than the 5s scan-debounce below.
  SendLiveState();

  if(TimeCurrent() - g_lastPoll < 5) return;
  ScanOpenPositions();
  ScanHistory(false);
  g_lastPoll = TimeCurrent();
}

void OnTrade()
{
  ScanOpenPositions();
  ScanHistory(false);
  g_lastPoll = TimeCurrent();
}

void OnTradeTransaction(const MqlTradeTransaction &trans,
                        const MqlTradeRequest &req,
                        const MqlTradeResult &res)
{
  if(trans.type == TRADE_TRANSACTION_DEAL_ADD ||
     trans.type == TRADE_TRANSACTION_HISTORY_ADD)
  {
    ScanOpenPositions();
    ScanHistory(false);
    g_lastPoll = TimeCurrent();
  }
}
//+------------------------------------------------------------------+
