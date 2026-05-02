-- =====================================================================
-- GƎNƎSIS — Trade Analytics SaaS
-- Full Supabase schema with RLS policies, triggers, and storage setup.
-- Run from the SQL editor or `psql` against your Supabase project.
-- Idempotent: safe to re-run.
-- =====================================================================

create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

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
