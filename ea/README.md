# Genesis Trade Sync — Expert Advisors

Automatically sync trades from MetaTrader 4/5 to your Genesis dashboard.

## Files

| File | Description |
|------|-------------|
| `Genesis_TradeSync_MT4.mq4` | Expert Advisor for MetaTrader 4 |
| `Genesis_TradeSync_MT5.mq5` | Expert Advisor for MetaTrader 5 |
| `ORACLE_VPS_SETUP.md` | Free Oracle Cloud VPS setup guide |

## Architecture

```
MT4/MT5 Terminal (EA)
      │
      │  HTTPS POST (WebRequest)
      ▼
Supabase Edge Function (/receive-trade)
      │
      │  Upsert
      ▼
Supabase Postgres (synced_trades table)
      │
      │  Supabase JS client
      ▼
Genesis Dashboard (Netlify)
```

## Quick Start

1. Run `supabase/auto-sync-schema.sql` in your Supabase SQL editor.
2. Deploy the Edge Function: `supabase functions deploy receive-trade --no-verify-jwt`
3. Generate an API key for your account (UI coming soon).
4. Copy the EA file into your MetaTrader `Experts` folder.
5. Add the Supabase URL to MetaTrader's allowed WebRequest URLs.
6. Attach the EA to any chart and enter your API key.

## Supported Brokers

The EA works with **any broker** that supports MT4/MT5. Tested with:

- HFM
- JustMarkets
- XM
- Exness
- IC Markets
- Capital Markets
