-- =========================================================================
-- Wave 4 — open-positions live streaming
-- =========================================================================
-- Adds two new tables and the SECURITY DEFINER RPCs the edge function
-- calls. Backwards-compatible: the existing `receive-trade` close-flow
-- and heartbeat path are untouched.
--
-- Apply via Supabase Studio → SQL Editor → New query → paste this file →
-- Run. Idempotent — safe to re-run.
-- =========================================================================

-- ------------------------------------------------------------------------
-- open_positions: one row per currently-open trade per account. Replaced
-- on every live_state tick from the EA. Rows are deleted when the EA's
-- payload no longer contains them (i.e. the position closed).
-- ------------------------------------------------------------------------
create table if not exists public.open_positions (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users(id) on delete cascade,
  account_number       text not null,
  ticket               text not null,
  symbol               text,
  side                 text check (side in ('long', 'short')),
  lot_size             numeric,
  entry                numeric,
  stop_loss            numeric,
  take_profit          numeric,
  current_price        numeric,
  floating_pnl         numeric,
  swap                 numeric default 0,
  commission           numeric default 0,
  open_time            timestamptz,
  last_tick_at         timestamptz not null default now(),
  unique (user_id, account_number, ticket)
);

create index if not exists open_positions_user_idx
  on public.open_positions(user_id, account_number);
create index if not exists open_positions_user_lasttick_idx
  on public.open_positions(user_id, last_tick_at desc);

alter table public.open_positions enable row level security;

drop policy if exists "open_positions: read own" on public.open_positions;
create policy "open_positions: read own" on public.open_positions
  for select using (auth.uid() = user_id);

-- Writes are service-role only (via the edge function). No write policy
-- means anon / authenticated roles cannot insert/update/delete, which is
-- exactly what we want.

-- ------------------------------------------------------------------------
-- ea_account_snapshots: append-only per-tick snapshot of account state
-- (equity, margin, floating P&L). Drives the Reports cards, Day View
-- equity curve, and Dashboard realtime tick.
-- ------------------------------------------------------------------------
create table if not exists public.ea_account_snapshots (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid not null references auth.users(id) on delete cascade,
  account_number           text not null,
  balance                  numeric,
  equity                   numeric,
  margin                   numeric,
  free_margin              numeric,
  margin_level_pct         numeric,
  open_positions_count     int default 0,
  floating_pnl             numeric,
  captured_at              timestamptz not null default now()
);

create index if not exists ea_account_snapshots_user_account_time_idx
  on public.ea_account_snapshots(user_id, account_number, captured_at desc);

alter table public.ea_account_snapshots enable row level security;

drop policy if exists "ea_account_snapshots: read own" on public.ea_account_snapshots;
create policy "ea_account_snapshots: read own" on public.ea_account_snapshots
  for select using (auth.uid() = user_id);

-- ------------------------------------------------------------------------
-- RPC: replace the set of open positions for an account in one call.
-- Removes rows that aren't in the new payload (handles closes between
-- ticks) and upserts the rest.
-- ------------------------------------------------------------------------
create or replace function public.upsert_open_positions(
  p_user_id uuid,
  p_account_number text,
  p_positions jsonb
) returns int
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_count int := 0;
  v_keep_tickets text[];
begin
  if p_user_id is null then
    raise exception 'Missing user';
  end if;
  if p_account_number is null or p_account_number = '' then
    raise exception 'Missing account_number';
  end if;

  -- Tickets in the new payload — anything not in this list is closed
  -- (or moved off-platform) and needs to be removed.
  select coalesce(array_agg(elem->>'ticket'), array[]::text[])
    into v_keep_tickets
    from jsonb_array_elements(coalesce(p_positions, '[]'::jsonb)) elem;

  delete from public.open_positions
    where user_id = p_user_id
      and account_number = p_account_number
      and not (ticket = any(v_keep_tickets));

  insert into public.open_positions (
    user_id, account_number, ticket, symbol, side, lot_size, entry,
    stop_loss, take_profit, current_price, floating_pnl, swap, commission,
    open_time, last_tick_at
  )
  select
    p_user_id,
    p_account_number,
    elem->>'ticket',
    elem->>'symbol',
    case when lower(coalesce(elem->>'type', '')) in ('buy', 'long')  then 'long'
         when lower(coalesce(elem->>'type', '')) in ('sell', 'short') then 'short'
         else null end,
    nullif(elem->>'lots', '')::numeric,
    nullif(elem->>'open_price', '')::numeric,
    nullif(elem->>'sl', '')::numeric,
    nullif(elem->>'tp', '')::numeric,
    nullif(elem->>'current_price', '')::numeric,
    coalesce(nullif(elem->>'profit', '')::numeric, 0)
      + coalesce(nullif(elem->>'swap', '')::numeric, 0)
      + coalesce(nullif(elem->>'commission', '')::numeric, 0),
    coalesce(nullif(elem->>'swap', '')::numeric, 0),
    coalesce(nullif(elem->>'commission', '')::numeric, 0),
    nullif(elem->>'open_time', '')::timestamptz,
    now()
  from jsonb_array_elements(coalesce(p_positions, '[]'::jsonb)) elem
  where (elem->>'ticket') is not null and (elem->>'ticket') <> ''
  on conflict (user_id, account_number, ticket) do update set
    symbol = excluded.symbol,
    side = excluded.side,
    lot_size = excluded.lot_size,
    entry = excluded.entry,
    stop_loss = excluded.stop_loss,
    take_profit = excluded.take_profit,
    current_price = excluded.current_price,
    floating_pnl = excluded.floating_pnl,
    swap = excluded.swap,
    commission = excluded.commission,
    open_time = excluded.open_time,
    last_tick_at = now();

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

grant execute on function public.upsert_open_positions(uuid, text, jsonb)
  to service_role;

-- ------------------------------------------------------------------------
-- RPC: append an account-level snapshot.
-- ------------------------------------------------------------------------
create or replace function public.append_account_snapshot(
  p_user_id uuid,
  p_account_number text,
  p_balance numeric,
  p_equity numeric,
  p_margin numeric,
  p_free_margin numeric,
  p_margin_level_pct numeric,
  p_open_count int,
  p_floating_pnl numeric
) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if p_user_id is null then
    raise exception 'Missing user';
  end if;
  if p_account_number is null or p_account_number = '' then
    raise exception 'Missing account_number';
  end if;

  insert into public.ea_account_snapshots (
    user_id, account_number, balance, equity, margin, free_margin,
    margin_level_pct, open_positions_count, floating_pnl, captured_at
  ) values (
    p_user_id, p_account_number, p_balance, p_equity, p_margin, p_free_margin,
    p_margin_level_pct, p_open_count, p_floating_pnl, now()
  );

  -- Touch the trade_files row so the Genesis app shows the account as
  -- recently active even when no trade-closes have happened.
  update public.trade_files
     set last_synced_at = now()
   where user_id = p_user_id
     and account_number = p_account_number;
end;
$$;

grant execute on function public.append_account_snapshot(
  uuid, text, numeric, numeric, numeric, numeric, numeric, int, numeric
) to service_role;

-- ------------------------------------------------------------------------
-- Realtime: expose the two tables on the supabase_realtime publication
-- so the frontend can subscribe to live position / snapshot changes.
-- ------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    -- alter publication is idempotent only via add-table-if-not-exists
    -- which Postgres doesn't have, so we wrap in an exception handler.
    begin
      alter publication supabase_realtime add table public.open_positions;
    exception when duplicate_object then null;
    end;
    begin
      alter publication supabase_realtime add table public.ea_account_snapshots;
    exception when duplicate_object then null;
    end;
  end if;
end $$;
