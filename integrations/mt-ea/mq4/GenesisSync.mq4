//+------------------------------------------------------------------+
//|                                                  GenesisSync.mq4 |
//|                              Genesis Trading Analytics — Auto-sync|
//|                                            https://genesis08.netlify.app |
//+------------------------------------------------------------------+
//
// What this Expert Advisor does
// -----------------------------
// On every tick (and once a minute via OnTimer) it walks the open
// positions and the closed-trade history, builds a JSON payload for any
// trade it hasn't already reported, and POSTs it to the Genesis Edge
// Function (`/functions/v1/receive-trade`). On the Genesis side the trade
// is upserted on `(user_id, account_number, ticket)` so re-sending an
// existing trade is harmless — handy when MT4 reconnects / the EA
// restarts.
//
// Multi-account / multi-user — no code edits required:
//   - The EA reports `AccountNumber()`, `AccountName()`, `AccountCompany()`,
//     `AccountServer()` and "MT4" with every trade.
//   - Authentication uses the user's Genesis API key (input below) which
//     already maps to a single Genesis user in the database.
//   - The same .mq4 / .ex4 file works for any user, any broker, any
//     account. Drop it on a chart, paste the API key, attach.
//
// Required setup before attaching:
//   1. Tools → Options → Expert Advisors → "Allow WebRequest for listed
//      URL" and add your Supabase project URL exactly:
//        https://<your-ref>.supabase.co
//   2. Allow live trading + DLL (DLL not actually used; MT prompts).
//   3. Drop the EA on any chart of any symbol — symbol is irrelevant, the
//      EA reads every open position.
//+------------------------------------------------------------------+
#property strict
#property version   "1.00"
#property description "Genesis Trading Analytics — auto-sync MT4 trades to Supabase."

input string SupabaseUrl       = "https://YOUR-PROJECT-REF.supabase.co"; // Supabase project URL
input string GenesisApiKey     = "gs_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"; // Generate in Genesis → Settings → Accounts
input string AccountLabel      = "";                                      // Optional friendly label (defaults to AccountName())
input int    PollSeconds       = 30;                                      // Background poll while idle
input int    HistoryDays       = 365;                                     // Backfill window in days (0 = all history)
input bool   VerboseLog        = true;                                    // Print every posted/skipped trade

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

//+------------------------------------------------------------------+
//| URL-safe trim                                                    |
//+------------------------------------------------------------------+
string TrimTrailingSlash(string s)
{
  while(StringLen(s) > 0 && StringGetCharacter(s, StringLen(s) - 1) == '/')
    s = StringSubstr(s, 0, StringLen(s) - 1);
  return s;
}

//+------------------------------------------------------------------+
//| Persisted last-contact marker (read on OnInit, written on every  |
//| successful POST). Surfaces a human-readable "offline for X min"  |
//| message in the Experts log when MT4 restarts.                    |
//+------------------------------------------------------------------+
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
  FileWrite(h, IntegerToString((int)TimeCurrent()));
  FileClose(h);
}

//+------------------------------------------------------------------+
//| OnInit                                                           |
//+------------------------------------------------------------------+
int OnInit()
{
  g_endpoint    = TrimTrailingSlash(SupabaseUrl) + "/functions/v1/receive-trade";
  g_seenFile    = "Genesis\\seen_"         + IntegerToString(AccountNumber()) + ".csv";
  g_contactFile = "Genesis\\last_contact_" + IntegerToString(AccountNumber()) + ".txt";
  EventSetTimer(PollSeconds);
  EnsureSeenFolder();

  // If we have a prior contact marker, surface the offline window in the
  // Experts log so the trader can see the reconnection happen rather
  // than wondering whether the EA picked back up after MT4 restarted.
  datetime prevContact = ReadLastContactMarker();
  if(prevContact > 0)
  {
    int offlineMin = (int)((TimeCurrent() - prevContact) / 60);
    Print("[Genesis] Reconnecting — last contact ", offlineMin, " minute(s) ago. ",
          "Endpoint=", g_endpoint, " Account=", AccountNumber());
  }
  else
  {
    Print("[Genesis] EA initialised. Endpoint=", g_endpoint, " Account=", AccountNumber());
  }

  // Heartbeat first so the Genesis wizard flips to Connected even when
  // there are zero closed trades in the lookback window. Then a forced
  // full-history scan so an extended offline window can't silently miss
  // closes that fell outside the HistoryDays cap — the seen-set still
  // suppresses duplicates so this is free server-side.
  SendHeartbeat();
  int closedPosted = ScanHistory(true);
  int openPosted   = ScanOpen();
  g_lastPoll = TimeCurrent();
  WriteLastContactMarker();
  Print("[Genesis] Reconnected — backfilled ", closedPosted,
        " closed trade(s), ", openPosted, " open position(s).");
  return INIT_SUCCEEDED;
}

void OnDeinit(const int reason)
{
  EventKillTimer();
  WriteLastContactMarker();
}

//+------------------------------------------------------------------+
//| Helpers — JSON                                                   |
//+------------------------------------------------------------------+
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
string Nullable(string key, double value, bool present, bool isLast = false)
{
  if(!present) return "\"" + key + "\":null" + (isLast ? "" : ",");
  return N(key, value, isLast);
}

string FormatTime(datetime t)
{
  if(t <= 0) return "";
  // ISO-8601 with Z; Edge Function normalises, but we send broker-local
  // time as UTC because MT4 doesn't expose tz, and the broker server is
  // typically GMT+2/+3. The Genesis side accepts either.
  return TimeToString(t, TIME_DATE | TIME_SECONDS) ; // YYYY.MM.DD HH:MM:SS
}

//+------------------------------------------------------------------+
//| WebRequest POST — with one immediate retry on transient failure  |
//| (network timeout, HTTP 5xx) and exponential backoff on sustained |
//| failures so a flaky Wi-Fi blip doesn't drop a single update and  |
//| a Supabase outage doesn't busy-loop on every tick.               |
//+------------------------------------------------------------------+
bool PostJson(string body)
{
  if(StringLen(GenesisApiKey) < 6 || StringFind(GenesisApiKey, "gs_") != 0)
  {
    Print("[Genesis] Invalid GenesisApiKey input.");
    return false;
  }
  if(g_backoffUntil > 0 && TimeCurrent() < g_backoffUntil)
  {
    if(VerboseLog)
      Print("[Genesis] Backoff active — skipping POST until ",
            TimeToString(g_backoffUntil, TIME_DATE | TIME_SECONDS));
    return false;
  }

  char data[];
  StringToCharArray(body, data, 0, StringLen(body));
  // Drop the trailing null byte so Content-Length matches actual JSON length.
  if(ArraySize(data) > 0 && data[ArraySize(data) - 1] == 0)
    ArrayResize(data, ArraySize(data) - 1);

  string headers = "Content-Type: application/json\r\nX-Api-Key: " + GenesisApiKey + "\r\n";
  int timeout = 10000;

  for(int attempt = 1; attempt <= 2; attempt++)
  {
    char result[];
    string responseHeaders = "";
    ResetLastError();
    int status = WebRequest("POST", g_endpoint, headers, timeout, data, result, responseHeaders);

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
  string accLabel = (StringLen(AccountLabel) > 0) ? AccountLabel : AccountName();
  string body = "{";
  body += Q("kind",           "heartbeat");
  body += Q("account_number", IntegerToString(AccountNumber()));
  body += Q("account_name",   accLabel);
  body += Q("broker",         AccountCompany());
  body += Q("server",         AccountServer());
  body += Q("platform",       "MT4");
  body += Q("ticket",         "heartbeat", true);
  body += "}";
  PostJson(body);
}

//+------------------------------------------------------------------+
//| Build payload for a single OrderSelect()ed trade                 |
//+------------------------------------------------------------------+
string BuildPayload(int ticket, bool isHistorical)
{
  string side = (OrderType() == OP_BUY)  ? "buy"
              : (OrderType() == OP_SELL) ? "sell"
              : (OrderType() == OP_BUYLIMIT || OrderType() == OP_BUYSTOP)   ? "buy"
              : (OrderType() == OP_SELLLIMIT || OrderType() == OP_SELLSTOP) ? "sell"
              : "";
  bool closed = isHistorical && OrderCloseTime() > 0;

  string accLabel = (StringLen(AccountLabel) > 0) ? AccountLabel : AccountName();

  string body = "{";
  body += Q("account_number", IntegerToString(AccountNumber()));
  body += Q("account_name",   accLabel);
  body += Q("broker",         AccountCompany());
  body += Q("server",         AccountServer());
  body += Q("platform",       "MT4");
  body += Q("ticket",         IntegerToString(ticket));
  body += Q("symbol",         OrderSymbol());
  body += Q("type",           side);
  body += N("lots",           OrderLots());
  body += N("open_price",     OrderOpenPrice());
  if(closed) body += N("close_price", OrderClosePrice()); else body += "\"close_price\":null,";
  body += N("sl",             OrderStopLoss());
  body += N("tp",             OrderTakeProfit());
  body += N("profit",         OrderProfit());
  body += N("swap",           OrderSwap());
  body += N("commission",     OrderCommission());
  body += Q("open_time",      FormatTime(OrderOpenTime()));
  if(closed) body += Q("close_time", FormatTime(OrderCloseTime()), true);
  else       body += "\"close_time\":null";
  body += "}";
  return body;
}

//+------------------------------------------------------------------+
//| Seen-cache: ticket+state → don't re-send identical events        |
//+------------------------------------------------------------------+
void EnsureSeenFolder()
{
  // Touch the file so subsequent reads succeed.
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

string Fingerprint(int ticket, bool closed, double sl, double tp, double profit)
{
  return IntegerToString(ticket) + "|" + (closed ? "C" : "O") +
         "|" + DoubleToString(sl, 5) + "|" + DoubleToString(tp, 5) +
         "|" + DoubleToString(profit, 2);
}

//+------------------------------------------------------------------+
//| Walk open positions                                              |
//+------------------------------------------------------------------+
int ScanOpen()
{
  int posted = 0;
  for(int i = 0; i < OrdersTotal(); i++)
  {
    if(!OrderSelect(i, SELECT_BY_POS, MODE_TRADES)) continue;
    // Skip pending orders.
    if(OrderType() > OP_SELL) continue;
    string fp = Fingerprint(OrderTicket(), false, OrderStopLoss(), OrderTakeProfit(), OrderProfit());
    if(IsSeen(fp)) continue;
    string body = BuildPayload(OrderTicket(), false);
    if(PostJson(body))
    {
      MarkSeen(fp);
      posted++;
    }
  }
  return posted;
}

//+------------------------------------------------------------------+
//| Walk recent history                                              |
//+------------------------------------------------------------------+
int ScanHistory(bool ignoreHistoryCap = false)
{
  // HistoryDays = 0 means "everything". Treat any non-positive value as
  // "no cutoff" so the cutoff comparison below always passes. We also
  // force the unbounded scan on EA reattach so a long offline window
  // (laptop off for days) can never silently miss a close.
  datetime cutoff = (ignoreHistoryCap || HistoryDays <= 0)
                      ? (datetime)0
                      : TimeCurrent() - (datetime)(HistoryDays * 86400);
  int total = OrdersHistoryTotal();
  if(VerboseLog) Print("[Genesis] ScanHistory cutoff=", TimeToString(cutoff, TIME_DATE),
                       " total=", total, ignoreHistoryCap ? " (full)" : "");
  int posted = 0, skipped = 0;
  for(int i = total - 1; i >= 0; i--)
  {
    if(!OrderSelect(i, SELECT_BY_POS, MODE_HISTORY)) continue;
    if(OrderCloseTime() < cutoff) continue;
    if(OrderType() > OP_SELL) continue; // skip non-trade entries (deposits, etc.)
    string fp = Fingerprint(OrderTicket(), true, OrderStopLoss(), OrderTakeProfit(), OrderProfit());
    if(IsSeen(fp))
    {
      skipped++;
      if(VerboseLog) Print("[Genesis] skipped seen ticket=", OrderTicket(), " (", OrderSymbol(), ")");
      continue;
    }
    string body = BuildPayload(OrderTicket(), true);
    if(PostJson(body))
    {
      MarkSeen(fp);
      posted++;
      if(VerboseLog) Print("[Genesis] posted ticket=", OrderTicket(), " (", OrderSymbol(), " profit=", DoubleToString(OrderProfit(), 2), ")");
    }
  }
  if(VerboseLog) Print("[Genesis] ScanHistory done — posted=", posted, " skipped_seen=", skipped);
  return posted;
}

//+------------------------------------------------------------------+
//| Main loop                                                        |
//+------------------------------------------------------------------+
void OnTimer()
{
  SendHeartbeat();
  ScanOpen();
  ScanHistory(false);
  g_lastPoll = TimeCurrent();
}

void OnTick()
{
  // First tick after a fresh attach: send the heartbeat immediately
  // rather than waiting up to PollSeconds for OnTimer to fire. The
  // setup wizard listens for last_synced_at and this is what makes the
  // status chip flip to Connected within seconds of MT4 reopening.
  if(!g_firstTickPingSent)
  {
    SendHeartbeat();
    g_firstTickPingSent = true;
  }
  if(TimeCurrent() - g_lastPoll < 5) return;
  ScanOpen();
  ScanHistory(false);
  g_lastPoll = TimeCurrent();
}

void OnTrade()
{
  // Fired by MT4 when an order is opened/closed/modified.
  ScanOpen();
  ScanHistory(false);
  g_lastPoll = TimeCurrent();
}
//+------------------------------------------------------------------+
