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

string g_endpoint = "";
string g_seenFile = "";
datetime g_lastPoll = 0;

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
//| OnInit                                                           |
//+------------------------------------------------------------------+
int OnInit()
{
  g_endpoint = TrimTrailingSlash(SupabaseUrl) + "/functions/v1/receive-trade";
  g_seenFile = "Genesis\\seen_" + IntegerToString(AccountNumber()) + ".csv";
  EventSetTimer(PollSeconds);
  Print("[Genesis] EA initialised. Endpoint=", g_endpoint, " Account=", AccountNumber());
  // Seed the seen-set so we don't blast the server with old history every restart.
  EnsureSeenFolder();
  // Heartbeat first so the Genesis wizard flips to Connected even when
  // there are zero closed trades in the lookback window.
  SendHeartbeat();
  // Initial backfill of recent history
  BackfillHistory();
  return INIT_SUCCEEDED;
}

void OnDeinit(const int reason)
{
  EventKillTimer();
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
//| WebRequest POST                                                  |
//+------------------------------------------------------------------+
bool PostJson(string body)
{
  if(StringLen(GenesisApiKey) < 6 || StringFind(GenesisApiKey, "gs_") != 0)
  {
    Print("[Genesis] Invalid GenesisApiKey input.");
    return false;
  }
  char data[];
  StringToCharArray(body, data, 0, StringLen(body));
  // Drop the trailing null byte so Content-Length matches actual JSON length.
  if(ArraySize(data) > 0 && data[ArraySize(data) - 1] == 0)
    ArrayResize(data, ArraySize(data) - 1);

  char result[];
  string headers = "Content-Type: application/json\r\nX-Api-Key: " + GenesisApiKey + "\r\n";
  string responseHeaders = "";
  int timeout = 10000;
  ResetLastError();
  int status = WebRequest("POST", g_endpoint, headers, timeout, data, result, responseHeaders);
  if(status == -1)
  {
    int err = GetLastError();
    Print("[Genesis] WebRequest failed err=", err, " — make sure the Supabase URL is in Tools → Options → Expert Advisors → Allow WebRequest.");
    return false;
  }
  if(status >= 400)
  {
    string txt = CharArrayToString(result);
    Print("[Genesis] HTTP ", status, " body=", txt);
    return false;
  }
  return true;
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
void ScanOpen()
{
  for(int i = 0; i < OrdersTotal(); i++)
  {
    if(!OrderSelect(i, SELECT_BY_POS, MODE_TRADES)) continue;
    // Skip pending orders.
    if(OrderType() > OP_SELL) continue;
    string fp = Fingerprint(OrderTicket(), false, OrderStopLoss(), OrderTakeProfit(), OrderProfit());
    if(IsSeen(fp)) continue;
    string body = BuildPayload(OrderTicket(), false);
    if(PostJson(body)) MarkSeen(fp);
  }
}

//+------------------------------------------------------------------+
//| Walk recent history                                              |
//+------------------------------------------------------------------+
void ScanHistory()
{
  // HistoryDays = 0 means "everything". Treat any non-positive value as
  // "no cutoff" so the cutoff comparison below always passes.
  datetime cutoff = (HistoryDays <= 0) ? (datetime)0
                                       : TimeCurrent() - (datetime)(HistoryDays * 86400);
  int total = OrdersHistoryTotal();
  if(VerboseLog) Print("[Genesis] ScanHistory cutoff=", TimeToString(cutoff, TIME_DATE), " total=", total);
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
}

void BackfillHistory()
{
  ScanHistory();
  ScanOpen();
  g_lastPoll = TimeCurrent();
}

//+------------------------------------------------------------------+
//| Main loop                                                        |
//+------------------------------------------------------------------+
void OnTimer()
{
  SendHeartbeat();
  ScanOpen();
  ScanHistory();
  g_lastPoll = TimeCurrent();
}

void OnTick()
{
  if(TimeCurrent() - g_lastPoll < 5) return;
  ScanOpen();
  ScanHistory();
  g_lastPoll = TimeCurrent();
}

void OnTrade()
{
  // Fired by MT4 when an order is opened/closed/modified.
  ScanOpen();
  ScanHistory();
  g_lastPoll = TimeCurrent();
}
//+------------------------------------------------------------------+
