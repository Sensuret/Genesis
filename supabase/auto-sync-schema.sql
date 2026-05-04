-- ============================================================================
-- Auto-Sync Trades Schema
-- Run this AFTER the base schema.sql. It creates the synced_trades table,
-- indexes, and RLS policies for the MT4/MT5 EA → Supabase pipeline.
-- Idempotent — safe to re-run.
-- ============================================================================

-- Synced trades table (receives data from the EA via Edge Function)
CREATE TABLE IF NOT EXISTS synced_trades (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_number text NOT NULL,
  account_name  text,
  broker        text,
  server        text,
  platform      text CHECK (platform IN ('MT4', 'MT5')),
  ticket        bigint NOT NULL,
  symbol        text,
  type          text CHECK (type IN ('buy', 'sell')),
  lots          numeric(12, 4),
  open_price    numeric(18, 8),
  close_price   numeric(18, 8),
  sl            numeric(18, 8),
  tp            numeric(18, 8),
  profit        numeric(18, 4),
  swap          numeric(18, 4),
  commission    numeric(18, 4),
  open_time     timestamptz,
  close_time    timestamptz,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now(),

  -- Upsert key: one row per ticket per account
  UNIQUE (account_number, ticket)
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_synced_trades_user_id       ON synced_trades (user_id);
CREATE INDEX IF NOT EXISTS idx_synced_trades_account       ON synced_trades (account_number);
CREATE INDEX IF NOT EXISTS idx_synced_trades_ticket        ON synced_trades (ticket);
CREATE INDEX IF NOT EXISTS idx_synced_trades_open_time     ON synced_trades (open_time);
CREATE INDEX IF NOT EXISTS idx_synced_trades_user_account  ON synced_trades (user_id, account_number);

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_synced_trades_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_synced_trades_updated_at ON synced_trades;
CREATE TRIGGER set_synced_trades_updated_at
  BEFORE UPDATE ON synced_trades
  FOR EACH ROW
  EXECUTE FUNCTION update_synced_trades_updated_at();

-- Row Level Security
ALTER TABLE synced_trades ENABLE ROW LEVEL SECURITY;

-- Users can only read/write their own synced trades
DROP POLICY IF EXISTS "Users read own synced trades" ON synced_trades;
CREATE POLICY "Users read own synced trades" ON synced_trades
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own synced trades" ON synced_trades;
CREATE POLICY "Users insert own synced trades" ON synced_trades
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own synced trades" ON synced_trades;
CREATE POLICY "Users update own synced trades" ON synced_trades
  FOR UPDATE USING (auth.uid() = user_id);

-- Service role can upsert on behalf of any user (used by the Edge Function)
DROP POLICY IF EXISTS "Service role full access synced trades" ON synced_trades;
CREATE POLICY "Service role full access synced trades" ON synced_trades
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- API keys table — maps an opaque key to a user_id so the EA can authenticate
-- without embedding Supabase credentials.
-- ============================================================================
CREATE TABLE IF NOT EXISTS api_keys (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key_hash   text NOT NULL UNIQUE,
  label      text DEFAULT 'Default',
  created_at timestamptz DEFAULT now(),
  revoked_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_api_keys_user    ON api_keys (user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash    ON api_keys (key_hash);

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own api keys" ON api_keys;
CREATE POLICY "Users manage own api keys" ON api_keys
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role api keys" ON api_keys;
CREATE POLICY "Service role api keys" ON api_keys
  FOR ALL USING (auth.role() = 'service_role');
