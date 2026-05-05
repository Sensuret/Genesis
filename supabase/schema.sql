-- =====================================================================
-- GƎNƎSIS — Trade Analytics SaaS
-- Full Supabase schema with RLS policies, triggers, and storage setup.
-- Run from the SQL editor or `psql` against your Supabase project.
-- Idempotent: safe to re-run.
-- =====================================================================

-- pgcrypto powers `gen_random_bytes()` + `digest()` used by the EA-token
-- generator (`public.generate_genesis_api_key`). On Supabase this lives
-- in the `extensions` schema, so we install it there explicitly and
-- include `extensions` on the function's search_path further down.
create extension if not exists "pgcrypto" with schema extensions;
create extension if not exists "uuid-ossp" with schema extensions;

-- ---------------------------------------------------------------------
-- Helper trigger: keep updated_at in sync.
-- ---------------------------------------------------------------------
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =====================================================================
-- profiles
-- =====================================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  avatar_url text,
  dob date,
  default_currency text default 'USD',
  starting_balance numeric default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles: read own" on public.profiles;
create policy "profiles: read own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles: insert own" on public.profiles;
create policy "profiles: insert own" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own" on public.profiles
  for update using (auth.uid() = id);

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

-- Auto-create a profile row when a new user signs up.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================================
-- trade_files
-- =====================================================================
create table if not exists public.trade_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  source text,
  trade_count int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists trade_files_user_idx on public.trade_files(user_id);

alter table public.trade_files enable row level security;

drop policy if exists "trade_files: read own" on public.trade_files;
create policy "trade_files: read own" on public.trade_files
  for select using (auth.uid() = user_id);

drop policy if exists "trade_files: write own" on public.trade_files;
create policy "trade_files: write own" on public.trade_files
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =====================================================================
-- trades
-- =====================================================================
create table if not exists public.trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  file_id uuid references public.trade_files(id) on delete set null,
  pair text,
  trade_date date,
  session text,
  side text check (side in ('long', 'short')),
  entry numeric,
  stop_loss numeric,
  take_profit numeric,
  exit_price numeric,
  lot_size numeric,
  result_r numeric,
  pnl numeric,
  commissions numeric default 0,
  spread numeric default 0,
  account_balance numeric,
  setup_tag text,
  mistake_tag text,
  emotions text[],
  notes text,
  screenshot_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists trades_user_date_idx on public.trades(user_id, trade_date desc);
create index if not exists trades_user_file_idx on public.trades(user_id, file_id);
create index if not exists trades_user_pair_idx on public.trades(user_id, pair);

alter table public.trades enable row level security;

drop policy if exists "trades: read own" on public.trades;
create policy "trades: read own" on public.trades
  for select using (auth.uid() = user_id);

drop policy if exists "trades: write own" on public.trades;
create policy "trades: write own" on public.trades
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists trades_updated_at on public.trades;
create trigger trades_updated_at
  before update on public.trades
  for each row execute function public.handle_updated_at();

-- =====================================================================
-- setups, mistakes, emotions (per-user catalogs)
-- =====================================================================
create table if not exists public.setups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text,
  unique (user_id, name)
);
alter table public.setups enable row level security;
drop policy if exists "setups: own" on public.setups;
create policy "setups: own" on public.setups
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.mistakes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text,
  unique (user_id, name)
);
alter table public.mistakes enable row level security;
drop policy if exists "mistakes: own" on public.mistakes;
create policy "mistakes: own" on public.mistakes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.emotions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  unique (user_id, name)
);
alter table public.emotions enable row level security;
drop policy if exists "emotions: own" on public.emotions;
create policy "emotions: own" on public.emotions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =====================================================================
-- numerology / astrology profiles
-- =====================================================================
create table if not exists public.numerology_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null,
  dob date not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists numerology_profiles_user_idx on public.numerology_profiles(user_id);

alter table public.numerology_profiles enable row level security;
drop policy if exists "numerology_profiles: own" on public.numerology_profiles;
create policy "numerology_profiles: own" on public.numerology_profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists numerology_profiles_updated_at on public.numerology_profiles;
create trigger numerology_profiles_updated_at
  before update on public.numerology_profiles
  for each row execute function public.handle_updated_at();

create table if not exists public.numerology_others (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null,
  nickname text,
  dob date not null,
  relationship text not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists numerology_others_user_idx on public.numerology_others(user_id);

alter table public.numerology_others enable row level security;
drop policy if exists "numerology_others: own" on public.numerology_others;
create policy "numerology_others: own" on public.numerology_others
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists numerology_others_updated_at on public.numerology_others;
create trigger numerology_others_updated_at
  before update on public.numerology_others
  for each row execute function public.handle_updated_at();

-- =====================================================================
-- playbooks: user-defined trading models with rules + symbol aliases.
-- =====================================================================
create table if not exists public.playbooks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  rules jsonb not null default '{}'::jsonb,
  symbol_aliases text[] not null default array[]::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists playbooks_user_idx on public.playbooks(user_id);

alter table public.playbooks enable row level security;
drop policy if exists "playbooks: own" on public.playbooks;
create policy "playbooks: own" on public.playbooks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists playbooks_updated_at on public.playbooks;
create trigger playbooks_updated_at
  before update on public.playbooks
  for each row execute function public.handle_updated_at();

-- Add playbook_id to trades. Safe to re-run.
alter table public.trades
  add column if not exists playbook_id uuid references public.playbooks(id) on delete set null;
create index if not exists trades_user_playbook_idx on public.trades(user_id, playbook_id);

-- Add precise open/close timestamps + derived duration/pips. Older imports
-- only had `trade_date` (a `date`); these columns let us surface trade
-- duration, intraday session windows, and pips moved per trade. All nullable
-- so existing rows aren't disturbed.
alter table public.trades
  add column if not exists open_time timestamptz,
  add column if not exists close_time timestamptz,
  add column if not exists duration_seconds integer,
  add column if not exists pips numeric;

-- Per-file broker timezone offset (in minutes from UTC). MetaTrader exports
-- print timestamps in the broker's server timezone — typically GMT+2/+3 with
-- DST (FTMO, ICMarkets) or GMT+0 (Pepperstone). Storing the offset per file
-- lets the user override the auto-detected value from Settings, and we can
-- re-bucket trade `session` values when this changes.
alter table public.trade_files
  add column if not exists broker_tz_offset_minutes integer;

-- =====================================================================
-- user_settings: per-user JSON blob for notebook embeds, scratchpad,
-- preferred currency, etc. One row per user.
-- =====================================================================
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;
drop policy if exists "user_settings: own" on public.user_settings;
create policy "user_settings: own" on public.user_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists user_settings_updated_at on public.user_settings;
create trigger user_settings_updated_at
  before update on public.user_settings
  for each row execute function public.handle_updated_at();

-- =====================================================================
-- storage buckets (avatars + trade screenshots)
-- =====================================================================
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('screenshots', 'screenshots', true)
on conflict (id) do nothing;

drop policy if exists "avatars: read public" on storage.objects;
create policy "avatars: read public" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "avatars: upload own" on storage.objects;
create policy "avatars: upload own" on storage.objects
  for insert with check (
    bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "avatars: update own" on storage.objects;
create policy "avatars: update own" on storage.objects
  for update using (
    bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "screenshots: read own" on storage.objects;
create policy "screenshots: read own" on storage.objects
  for select using (
    bucket_id = 'screenshots' and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "screenshots: upload own" on storage.objects;
create policy "screenshots: upload own" on storage.objects
  for insert with check (
    bucket_id = 'screenshots' and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "screenshots: delete own" on storage.objects;
create policy "screenshots: delete own" on storage.objects
  for delete using (
    bucket_id = 'screenshots' and auth.uid()::text = (storage.foldername(name))[1]
  );

-- =====================================================================
-- Auto-sync (MT4 / MT5 Expert Advisor → Supabase Edge Function)
-- ---------------------------------------------------------------------
-- Each user issues one or more API keys (`genesis_api_keys`), pastes the
-- key into the Genesis EA running on a MetaTrader terminal, and the EA
-- POSTs every open / close / update event to the `receive-trade` Edge
-- Function. The Edge Function validates the key (by hash) and upserts
-- into the existing `trades` table — keeping one source of truth so all
-- analytics keep working without modification.
-- =====================================================================

-- ------------------------------- trade_files ------------------------------
-- Each EA-connected MetaTrader account becomes one `trade_files` row so
-- the existing top-bar Accounts picker keeps working — the user can
-- filter analytics by EA-synced account exactly like a manually imported
-- account.
alter table public.trade_files
  add column if not exists sync_kind text not null default 'manual'
    check (sync_kind in ('manual', 'ea', 'broker_api')),
  add column if not exists account_number text,
  add column if not exists account_name text,
  add column if not exists broker text,
  add column if not exists server text,
  add column if not exists platform text check (platform in ('MT4', 'MT5') or platform is null),
  add column if not exists last_synced_at timestamptz;

-- Each (user_id, account_number) maps to a single EA-synced file. Manual
-- imports skip the constraint by leaving account_number null.
create unique index if not exists trade_files_user_account_uniq
  on public.trade_files(user_id, account_number)
  where account_number is not null;

create index if not exists trade_files_user_sync_idx
  on public.trade_files(user_id, sync_kind);

-- ---------------------------------- trades --------------------------------
-- Adds the fields the EA reports for every position so we can dedupe by
-- (user_id, account_number, ticket) and surface broker / platform on a
-- per-trade basis.
alter table public.trades
  add column if not exists ticket text,
  add column if not exists account_number text,
  add column if not exists platform text check (platform in ('MT4', 'MT5') or platform is null),
  add column if not exists broker text,
  add column if not exists server text,
  add column if not exists swap numeric default 0,
  add column if not exists symbol text,
  add column if not exists source text not null default 'manual'
    check (source in ('manual', 'ea', 'broker_api')),
  add column if not exists is_open boolean not null default false,
  add column if not exists last_event_at timestamptz;

create index if not exists trades_user_account_idx
  on public.trades(user_id, account_number);
create index if not exists trades_user_ticket_idx
  on public.trades(user_id, ticket);
create index if not exists trades_user_source_idx
  on public.trades(user_id, source);
create index if not exists trades_user_open_idx
  on public.trades(user_id, is_open);

-- Upsert key for EA writes — the Edge Function uses
--   on conflict (user_id, account_number, ticket) where source = 'ea'
-- to update an existing trade row when a position closes or amends SL/TP.
-- Manual imports never collide (their account_number/ticket can be null).
create unique index if not exists trades_ea_upsert_uniq
  on public.trades(user_id, account_number, ticket)
  where source = 'ea' and account_number is not null and ticket is not null;

-- ----------------------------- genesis_api_keys ---------------------------
-- One row per active EA key. We store SHA-256 hash only (the plaintext
-- key is shown to the user once at creation and never persisted). The
-- Edge Function looks up by hash using the service-role client.
create table if not exists public.genesis_api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null default 'Genesis EA key',
  -- hex(sha256(plaintext)) — 64 chars
  key_hash text not null,
  -- First 4 chars of the plaintext key (`gs_xxxx…`) so the user can
  -- recognise which key is which without revealing the secret.
  key_prefix text not null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

create unique index if not exists genesis_api_keys_hash_uniq
  on public.genesis_api_keys(key_hash);
create index if not exists genesis_api_keys_user_idx
  on public.genesis_api_keys(user_id) where revoked_at is null;

alter table public.genesis_api_keys enable row level security;
drop policy if exists "genesis_api_keys: own" on public.genesis_api_keys;
-- Users can SELECT/UPDATE/DELETE their own keys (label rename, revoke,
-- delete). They never INSERT directly — the `generate_genesis_api_key`
-- RPC handles that and returns the plaintext key once.
create policy "genesis_api_keys: own" on public.genesis_api_keys
  for select using (auth.uid() = user_id);
drop policy if exists "genesis_api_keys: update own" on public.genesis_api_keys;
create policy "genesis_api_keys: update own" on public.genesis_api_keys
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "genesis_api_keys: delete own" on public.genesis_api_keys;
create policy "genesis_api_keys: delete own" on public.genesis_api_keys
  for delete using (auth.uid() = user_id);

-- ---------------------------- API key generation --------------------------
-- Returns the plaintext key ONCE; only the SHA-256 hash is stored.
-- Plaintext format: `gs_<32-hex-chars>` so users can paste it into EA inputs.
create or replace function public.generate_genesis_api_key(p_label text default 'Genesis EA key')
returns table (id uuid, plaintext text, key_prefix text, created_at timestamptz)
language plpgsql security definer
-- `extensions` is on the search_path so unqualified `gen_random_bytes()` /
-- `digest()` references still resolve on projects where pgcrypto lives in
-- the `extensions` schema (Supabase's default), AND the calls below are
-- additionally schema-qualified for belt-and-braces safety.
set search_path = public, extensions, pg_temp as $$
declare
  v_user uuid := auth.uid();
  v_raw text;
  v_plain text;
  v_prefix text;
  v_hash text;
  v_id uuid;
  v_created timestamptz;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  v_raw := encode(extensions.gen_random_bytes(16), 'hex');
  v_plain := 'gs_' || v_raw;
  v_prefix := substring(v_plain from 1 for 7); -- 'gs_xxxx'
  v_hash := encode(extensions.digest(v_plain, 'sha256'), 'hex');

  insert into public.genesis_api_keys (user_id, label, key_hash, key_prefix)
  values (v_user, coalesce(nullif(p_label, ''), 'Genesis EA key'), v_hash, v_prefix)
  returning genesis_api_keys.id, genesis_api_keys.created_at
    into v_id, v_created;

  return query select v_id, v_plain, v_prefix, v_created;
end;
$$;

-- ---------------------------- EA trade ingestion --------------------------
-- Called from the `receive-trade` Edge Function with the resolved user_id
-- (looked up from the API-key hash). Idempotent on
-- (user_id, account_number, ticket) for `source = 'ea'`. Also auto-creates
-- a `trade_files` row per (user, account_number) so the top-bar Accounts
-- picker shows the EA-synced account immediately.
create or replace function public.ingest_ea_trade(
  p_user_id uuid,
  p_account_number text,
  p_account_name text,
  p_broker text,
  p_server text,
  p_platform text,
  p_ticket text,
  p_symbol text,
  p_side text,
  p_lots numeric,
  p_open_price numeric,
  p_close_price numeric,
  p_sl numeric,
  p_tp numeric,
  p_profit numeric,
  p_swap numeric,
  p_commission numeric,
  p_open_time timestamptz,
  p_close_time timestamptz
) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_file_id uuid;
  v_trade_id uuid;
  v_is_open boolean := p_close_time is null;
  v_session text;
  v_pnl numeric := coalesce(p_profit, 0) + coalesce(p_swap, 0) + coalesce(p_commission, 0);
begin
  if p_user_id is null then
    raise exception 'Missing user';
  end if;

  -- Find or create the per-account trade_files row.
  select id into v_file_id
    from public.trade_files
    where user_id = p_user_id and account_number = p_account_number;

  if v_file_id is null then
    insert into public.trade_files (
      user_id, name, source, sync_kind, account_number, account_name,
      broker, server, platform, last_synced_at, trade_count
    ) values (
      p_user_id,
      coalesce(nullif(p_account_name, ''), p_broker || ' #' || p_account_number),
      'EA',
      'ea',
      p_account_number,
      p_account_name,
      p_broker,
      p_server,
      p_platform,
      now(),
      0
    )
    returning id into v_file_id;
  else
    update public.trade_files
       set account_name = coalesce(nullif(p_account_name, ''), account_name),
           broker = coalesce(p_broker, broker),
           server = coalesce(p_server, server),
           platform = coalesce(p_platform, platform),
           last_synced_at = now()
     where id = v_file_id;
  end if;

  -- Upsert the trade itself.
  insert into public.trades (
    user_id, file_id, ticket, account_number, platform, broker, server,
    source, symbol, pair, side, lot_size, entry, exit_price, stop_loss,
    take_profit, pnl, swap, commissions, open_time, close_time,
    trade_date, is_open, last_event_at
  ) values (
    p_user_id, v_file_id, p_ticket, p_account_number, p_platform, p_broker, p_server,
    'ea', p_symbol, p_symbol,
    case when lower(coalesce(p_side, '')) in ('buy','long') then 'long'
         when lower(coalesce(p_side, '')) in ('sell','short') then 'short'
         else null end,
    p_lots, p_open_price, p_close_price, p_sl, p_tp, v_pnl,
    coalesce(p_swap, 0), coalesce(p_commission, 0), p_open_time, p_close_time,
    coalesce(p_close_time::date, p_open_time::date), v_is_open, now()
  )
  on conflict (user_id, account_number, ticket)
    where source = 'ea' and account_number is not null and ticket is not null
  do update set
    symbol = excluded.symbol,
    pair = excluded.pair,
    side = excluded.side,
    lot_size = excluded.lot_size,
    entry = excluded.entry,
    exit_price = excluded.exit_price,
    stop_loss = excluded.stop_loss,
    take_profit = excluded.take_profit,
    pnl = excluded.pnl,
    swap = excluded.swap,
    commissions = excluded.commissions,
    open_time = excluded.open_time,
    close_time = excluded.close_time,
    trade_date = excluded.trade_date,
    is_open = excluded.is_open,
    last_event_at = excluded.last_event_at,
    updated_at = now()
  returning id into v_trade_id;

  -- Refresh trade_count on the file row.
  update public.trade_files
     set trade_count = (
       select count(*) from public.trades where file_id = v_file_id
     )
   where id = v_file_id;

  return v_trade_id;
end;
$$;

-- The Edge Function is invoked with the service-role key. Grant explicit
-- execute so it can call the helper without RLS in the way.
grant execute on function public.ingest_ea_trade(
  uuid, text, text, text, text, text, text, text, text, numeric,
  numeric, numeric, numeric, numeric, numeric, numeric, numeric,
  timestamptz, timestamptz
) to service_role;

grant execute on function public.generate_genesis_api_key(text)
  to authenticated;

-- =====================================================================
-- Global preferences (Settings → Global settings)
-- =====================================================================
-- App-wide preferences live on the existing `profiles` row so they're
-- 1:1 with the user. Auto-detect timezone is the default — leaving the
-- column null tells the client to use the viewer's local IANA zone.
alter table public.profiles
  add column if not exists timezone text;
alter table public.profiles
  add column if not exists locale text;
alter table public.profiles
  add column if not exists week_starts_on text default 'monday'
    check (week_starts_on in ('monday', 'sunday', 'saturday'));
alter table public.profiles
  add column if not exists pip_units text default 'pips'
    check (pip_units in ('pips', 'points'));
alter table public.profiles
  add column if not exists preferred_broker text;

-- =====================================================================
-- Audit log (Settings → Log history)
-- =====================================================================
-- Compact event trail: sign-ins, password changes, profile / setting
-- updates, file imports / deletes. Written from client + server with
-- the helper `log_audit_event()` below. RLS scopes reads to the user.
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  summary text not null,
  metadata jsonb not null default '{}'::jsonb,
  ip text,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists audit_log_user_created_idx
  on public.audit_log(user_id, created_at desc);
create index if not exists audit_log_event_type_idx
  on public.audit_log(event_type);

alter table public.audit_log enable row level security;

drop policy if exists "audit_log: read own" on public.audit_log;
create policy "audit_log: read own" on public.audit_log
  for select using (auth.uid() = user_id);

drop policy if exists "audit_log: write own" on public.audit_log;
create policy "audit_log: write own" on public.audit_log
  for insert with check (auth.uid() = user_id);

-- Helper for inserting audit entries from client / server actions.
-- Returns the inserted row id so callers can correlate.
create or replace function public.log_audit_event(
  p_event_type text,
  p_summary text,
  p_metadata jsonb default '{}'::jsonb
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'log_audit_event: no auth.uid()';
  end if;
  insert into public.audit_log (user_id, event_type, summary, metadata)
    values (v_uid, p_event_type, p_summary, coalesce(p_metadata, '{}'::jsonb))
    returning id into v_id;
  return v_id;
end;
$$;

grant execute on function public.log_audit_event(text, text, jsonb)
  to authenticated;
