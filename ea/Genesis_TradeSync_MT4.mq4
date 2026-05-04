//+------------------------------------------------------------------+
//| Genesis_TradeSync_MT4.mq4                                        |
//| Expert Advisor — auto-sync trades to Genesis via Supabase        |
//| Works with any broker. Runs continuously on any chart.           |
//+------------------------------------------------------------------+
#property copyright "Genesis Trading Analytics"
#property link      "https://github.com/Sensuret/Genesis"
#property version   "1.00"
#property strict

//--- EA inputs
input string GenesisEndpoint = "https://<PROJECT_REF>.supabase.co/functions/v1/receive-trade";
input string ApiKey          = "";  // Your Genesis API key
input int    SyncIntervalSec = 5;   // How often to check for new/changed trades

//--- internal state
int    g_lastKnownCount = 0;
int    g_ticketsSent[];
datetime g_lastCheck    = 0;

//+------------------------------------------------------------------+
int OnInit()
{
   if(StringLen(ApiKey) == 0)
   {
      Alert("Genesis EA: Please enter your API key in the EA inputs.");
      return INIT_FAILED;
   }
   Print("Genesis Trade Sync EA initialized. Endpoint: ", GenesisEndpoint);
   // Allow WebRequest — user must add the URL in MT4 Options manually
   ArrayResize(g_ticketsSent, 0);
   ScanAndSync();
   return INIT_SUCCEEDED;
}

//+------------------------------------------------------------------+
void OnTick()
{
   if(TimeCurrent() - g_lastCheck < SyncIntervalSec) return;
   g_lastCheck = TimeCurrent();
   ScanAndSync();
}

//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   Print("Genesis Trade Sync EA removed. Reason: ", reason);
}

//+------------------------------------------------------------------+
void ScanAndSync()
{
   int total = OrdersTotal();
   // Scan open orders
   for(int i = 0; i < total; i++)
   {
      if(!OrderSelect(i, SELECT_BY_POS, MODE_TRADES)) continue;
      if(OrderType() > OP_SELL) continue; // skip pending orders
      SendTrade(OrderTicket(), OrderSymbol(), OrderType(), OrderLots(),
                OrderOpenPrice(), 0, OrderStopLoss(), OrderTakeProfit(),
                OrderProfit(), OrderSwap(), OrderCommission(),
                OrderOpenTime(), 0);
   }

   // Scan closed orders (history)
   int histTotal = OrdersHistoryTotal();
   for(int i = 0; i < histTotal; i++)
   {
      if(!OrderSelect(i, SELECT_BY_POS, MODE_HISTORY)) continue;
      if(OrderType() > OP_SELL) continue;
      SendTrade(OrderTicket(), OrderSymbol(), OrderType(), OrderLots(),
                OrderOpenPrice(), OrderClosePrice(), OrderStopLoss(),
                OrderTakeProfit(), OrderProfit(), OrderSwap(),
                OrderCommission(), OrderOpenTime(), OrderCloseTime());
   }
}

//+------------------------------------------------------------------+
bool AlreadySent(int ticket)
{
   for(int i = 0; i < ArraySize(g_ticketsSent); i++)
   {
      if(g_ticketsSent[i] == ticket) return true;
   }
   return false;
}

//+------------------------------------------------------------------+
void MarkSent(int ticket)
{
   int sz = ArraySize(g_ticketsSent);
   ArrayResize(g_ticketsSent, sz + 1);
   g_ticketsSent[sz] = ticket;
}

//+------------------------------------------------------------------+
string TradeTypeToString(int type)
{
   if(type == OP_BUY)  return "buy";
   if(type == OP_SELL) return "sell";
   return "unknown";
}

//+------------------------------------------------------------------+
string TimeToISO(datetime t)
{
   if(t == 0) return "null";
   return "\"" + TimeToString(t, TIME_DATE | TIME_SECONDS) + "\"";
}

//+------------------------------------------------------------------+
void SendTrade(int ticket, string symbol, int type, double lots,
               double openPrice, double closePrice, double sl,
               double tp, double profit, double swap, double commission,
               datetime openTime, datetime closeTime)
{
   // Build JSON payload
   string json = "{";
   json += "\"api_key\":\"" + ApiKey + "\",";
   json += "\"account_number\":\"" + IntegerToString(AccountNumber()) + "\",";
   json += "\"account_name\":\"" + AccountName() + "\",";
   json += "\"broker\":\"" + AccountCompany() + "\",";
   json += "\"server\":\"" + AccountServer() + "\",";
   json += "\"platform\":\"MT4\",";
   json += "\"ticket\":" + IntegerToString(ticket) + ",";
   json += "\"symbol\":\"" + symbol + "\",";
   json += "\"type\":\"" + TradeTypeToString(type) + "\",";
   json += "\"lots\":" + DoubleToString(lots, 4) + ",";
   json += "\"open_price\":" + DoubleToString(openPrice, 8) + ",";
   json += "\"close_price\":" + DoubleToString(closePrice, 8) + ",";
   json += "\"sl\":" + DoubleToString(sl, 8) + ",";
   json += "\"tp\":" + DoubleToString(tp, 8) + ",";
   json += "\"profit\":" + DoubleToString(profit, 4) + ",";
   json += "\"swap\":" + DoubleToString(swap, 4) + ",";
   json += "\"commission\":" + DoubleToString(commission, 4) + ",";
   json += "\"open_time\":" + TimeToISO(openTime) + ",";
   json += "\"close_time\":" + TimeToISO(closeTime);
   json += "}";

   // Send via WebRequest
   string headers = "Content-Type: application/json\r\n";
   char   postData[];
   char   result[];
   string resultHeaders;

   StringToCharArray(json, postData, 0, WHOLE_ARRAY, CP_UTF8);
   // Remove trailing null
   ArrayResize(postData, ArraySize(postData) - 1);

   int timeout = 5000;
   int retries = 3;

   for(int attempt = 0; attempt < retries; attempt++)
   {
      int res = WebRequest("POST", GenesisEndpoint, headers, timeout,
                           postData, result, resultHeaders);
      if(res == 200)
      {
         string body = CharArrayToString(result, 0, WHOLE_ARRAY, CP_UTF8);
         // Print("Genesis: Synced ticket #", ticket, " → ", body);
         return;
      }
      else if(res == -1)
      {
         int err = GetLastError();
         Print("Genesis: WebRequest failed for ticket #", ticket,
               " (error ", err, "). Add ", GenesisEndpoint,
               " to Tools → Options → Expert Advisors → Allow WebRequest. Retry ", attempt + 1);
         Sleep(1000);
      }
      else
      {
         string body = CharArrayToString(result, 0, WHOLE_ARRAY, CP_UTF8);
         Print("Genesis: HTTP ", res, " for ticket #", ticket, ": ", body);
         return; // Non-retryable HTTP error
      }
   }
}
//+------------------------------------------------------------------+
