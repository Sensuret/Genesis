-- =====================================================================
-- New RPC: register_ea_account
--
-- Called from the receive-trade Edge Function on every EA heartbeat ping
-- (kind: "heartbeat"). Just upserts the per-account `trade_files` row
-- so the Genesis app shows the account as online even before the user
-- has closed any trades.
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
           last_synced_at = now()
     where id = v_file_id;
  end if;

  return v_file_id;
end;
$$;

grant execute on function public.register_ea_account(
  uuid, text, text, text, text, text
) to service_role;
