-- =====================================================================
-- Promote sync_kind to 'ea' on EA-side upserts + backfill existing rows.
--
-- Bug: when a user previously imported an account manually (creating
-- a trade_files row with sync_kind='manual'), then later attached the
-- Genesis EA to the same broker account, both `ingest_ea_trade` and
-- `register_ea_account` looked up the existing row by
-- (user_id, account_number) and only updated `last_synced_at` /
-- `account_name` / `broker` / `server` / `platform` — leaving
-- `sync_kind` stuck on 'manual'. The Settings → Connected terminals
-- list filters on `sync_kind = 'ea'`, so the EA-driven account never
-- appeared there even though trades were streaming in fine. The setup
-- wizard's "first ping" detection has the same dependency, so it sat
-- forever on "Waiting for first ping…" while the EA was already
-- working in the background.
--
-- Fix:
--  1. On the EA-side UPDATE branch in both RPCs, also set
--     sync_kind = 'ea'. Once an account is being EA-synced it is the
--     EA's account regardless of how it was originally seeded.
--  2. One-shot backfill: any trade_files row that has at least one
--     `trades` row with source = 'ea' is promoted to sync_kind = 'ea'.
--
-- Idempotent. Paste this whole file into the Supabase SQL editor.
-- =====================================================================

create or replace function public.register_ea_account(
  p_user_id uuid,
  p_account_number text,
  p_account_name text,
  p_broker text,
  p_server text,
  p_platform text
) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_file_id uuid;
begin
  if p_user_id is null then
    raise exception 'Missing user';
  end if;
  if p_account_number is null or length(p_account_number) = 0 then
    raise exception 'Missing account_number';
  end if;

  select id into v_file_id
    from public.trade_files
    where user_id = p_user_id and account_number = p_account_number;

  if v_file_id is null then
    insert into public.trade_files (
      user_id, name, source, sync_kind, account_number, account_name,
      broker, server, platform, last_synced_at, trade_count
    ) values (
      p_user_id,
      coalesce(nullif(p_account_name, ''), coalesce(p_broker, 'EA') || ' #' || p_account_number),
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
           sync_kind = 'ea',
           last_synced_at = now()
     where id = v_file_id;
  end if;

  return v_file_id;
end;
$$;

grant execute on function public.register_ea_account(
  uuid, text, text, text, text, text
) to service_role;

-- ---------------------------------------------------------------------
-- Promote sync_kind on the trade-ingestion path too. Same shape as
-- schema.sql but with the sync_kind = 'ea' on the UPDATE branch.
-- ---------------------------------------------------------------------
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
  v_pnl numeric := coalesce(p_profit, 0) + coalesce(p_swap, 0) + coalesce(p_commission, 0);
begin
  if p_user_id is null then
    raise exception 'Missing user';
  end if;

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
           sync_kind = 'ea',
           last_synced_at = now()
     where id = v_file_id;
  end if;

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

  update public.trade_files
     set trade_count = (
       select count(*) from public.trades where file_id = v_file_id
     )
   where id = v_file_id;

  return v_trade_id;
end;
$$;

grant execute on function public.ingest_ea_trade(
  uuid, text, text, text, text, text, text, text, text, numeric,
  numeric, numeric, numeric, numeric, numeric, numeric, numeric,
  timestamptz, timestamptz
) to service_role;

-- ---------------------------------------------------------------------
-- One-shot backfill: any trade_files row whose `trades` rows include
-- at least one source='ea' record is promoted to sync_kind='ea'. This
-- fixes the existing user(s) whose row is stuck on 'manual'.
-- ---------------------------------------------------------------------
update public.trade_files f
   set sync_kind = 'ea',
       last_synced_at = greatest(coalesce(f.last_synced_at, 'epoch'::timestamptz), now())
 where exists (
   select 1
     from public.trades t
    where t.file_id = f.id
      and t.source = 'ea'
 )
   and (f.sync_kind is distinct from 'ea');
