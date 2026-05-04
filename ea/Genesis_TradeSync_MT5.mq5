//+------------------------------------------------------------------+
//| Genesis_TradeSync_MT5.mq5                                        |
//| Expert Advisor — auto-sync trades to Genesis via Supabase        |
//| Works with any broker. Runs continuously on any chart.           |
//+------------------------------------------------------------------+
#property copyright "Genesis Trading Analytics"
#property link      "https://github.com/Sensuret/Genesis"
#property version   "1.00"

//--- EA inputs
input string GenesisEndpoint = "https://<PROJECT_REF>.supabase.co/functions/v1/receive-trade";
input string ApiKey          = "";  // Your Genesis API key
input int    SyncIntervalSec = 5;   // How often to check for new/changed trades

//--- internal state
datetime g_lastCheck = 0;

//+------------------------------------------------------------------+
int OnInit()
{
   if(StringLen(ApiKey) == 0)
   {
      Alert("Genesis EA: Please enter your API key in the EA inputs.");
      return INIT_FAILED;
   }
   Print("Genesis Trade Sync EA (MT5) initialized. Endpoint: ", GenesisEndpoint);
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
   Print("Genesis Trade Sync EA (MT5) removed. Reason: ", reason);
}

//+------------------------------------------------------------------+
void ScanAndSync()
{
   // Scan open positions
   int total = PositionsTotal();
   for(int i = 0; i < total; i++)
   {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0) continue;

      string symbol    = PositionGetString(POSITION_SYMBOL);
      long   type      = PositionGetInteger(POSITION_TYPE);
      double lots      = PositionGetDouble(POSITION_VOLUME);
      double openPrice = PositionGetDouble(POSITION_PRICE_OPEN);
      double sl        = PositionGetDouble(POSITION_SL);
      double tp        = PositionGetDouble(POSITION_TP);
      double profit    = PositionGetDouble(POSITION_PROFIT);
      double swap      = PositionGetDouble(POSITION_SWAP);
      datetime openTime = (datetime)PositionGetInteger(POSITION_TIME);

      SendTrade((int)ticket, symbol, type == POSITION_TYPE_BUY ? "buy" : "sell",
                lots, openPrice, 0, sl, tp, profit, swap, 0, openTime, 0);
   }

   // Scan deal history (closed trades)
   datetime from = D'2000.01.01';
   datetime to   = TimeCurrent();
   if(!HistorySelect(from, to)) return;

   int deals = HistoryDealsTotal();
   for(int i = 0; i < deals; i++)
   {
      ulong dealTicket = HistoryDealGetTicket(i);
      if(dealTicket == 0) continue;

      long entry = HistoryDealGetInteger(dealTicket, DEAL_ENTRY);
      // Only sync executed deals (entry out = closed trades)
      if(entry != DEAL_ENTRY_OUT && entry != DEAL_ENTRY_INOUT) continue;

      long   dealType   = HistoryDealGetInteger(dealTicket, DEAL_TYPE);
      if(dealType != DEAL_TYPE_BUY && dealType != DEAL_TYPE_SELL) continue;

      string symbol     = HistoryDealGetString(dealTicket, DEAL_SYMBOL);
      double lots       = HistoryDealGetDouble(dealTicket, DEAL_VOLUME);
      double price      = HistoryDealGetDouble(dealTicket, DEAL_PRICE);
      double profit     = HistoryDealGetDouble(dealTicket, DEAL_PROFIT);
      double swap       = HistoryDealGetDouble(dealTicket, DEAL_SWAP);
      double commission = HistoryDealGetDouble(dealTicket, DEAL_COMMISSION);
      datetime dealTime = (datetime)HistoryDealGetInteger(dealTicket, DEAL_TIME);

      // For closed deals, the deal type is reversed (a BUY deal closes a SELL position)
      string tradeType = (dealType == DEAL_TYPE_BUY) ? "sell" : "buy";

      SendTrade((int)dealTicket, symbol, tradeType, lots, 0, price,
                0, 0, profit, swap, commission, 0, dealTime);
   }
}

//+------------------------------------------------------------------+
string TimeToISO(datetime t)
{
   if(t == 0) return "null";
   MqlDateTime dt;
   TimeToStruct(t, dt);
   return StringFormat("\"%04d-%02d-%02d %02d:%02d:%02d\"",
                       dt.year, dt.mon, dt.day, dt.hour, dt.min, dt.sec);
}

//+------------------------------------------------------------------+
void SendTrade(int ticket, string symbol, string type, double lots,
               double openPrice, double closePrice, double sl,
               double tp, double profit, double swap, double commission,
               datetime openTime, datetime closeTime)
{
   // Build JSON payload
   string json = "{";
   json += "\"api_key\":\"" + ApiKey + "\",";
   json += "\"account_number\":\"" + IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN)) + "\",";
   json += "\"account_name\":\"" + AccountInfoString(ACCOUNT_NAME) + "\",";
   json += "\"broker\":\"" + AccountInfoString(ACCOUNT_COMPANY) + "\",";
   json += "\"server\":\"" + AccountInfoString(ACCOUNT_SERVER) + "\",";
   json += "\"platform\":\"MT5\",";
   json += "\"ticket\":" + IntegerToString(ticket) + ",";
   json += "\"symbol\":\"" + symbol + "\",";
   json += "\"type\":\"" + type + "\",";
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
   char   postData[];
   char   result[];
   string resultHeaders;
   string headers = "Content-Type: application/json\r\n";

   int len = StringToCharArray(json, postData, 0, WHOLE_ARRAY, CP_UTF8);
   // Remove trailing null
   if(len > 0) ArrayResize(postData, len - 1);

   int timeout = 5000;
   int retries = 3;

   for(int attempt = 0; attempt < retries; attempt++)
   {
      int res = WebRequest("POST", GenesisEndpoint, headers, timeout,
                           postData, result, resultHeaders);
      if(res == 200)
      {
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
         return;
      }
   }
}
//+------------------------------------------------------------------+
