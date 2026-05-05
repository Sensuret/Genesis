-- =====================================================================
-- Fix: `generate_genesis_api_key` failing with
--      "function gen_random_bytes(integer) does not exist"
--
-- Cause: on Supabase, `pgcrypto` is installed in the `extensions`
-- schema. The original RPC's search_path was `public, pg_temp`, so the
-- unqualified call to `gen_random_bytes()` couldn't resolve.
--
-- This migration:
--   1. Ensures pgcrypto exists in the `extensions` schema.
--   2. Adds `extensions` to the function's search_path.
--   3. Schema-qualifies the calls explicitly for belt-and-braces.
--
-- Idempotent. Paste this whole file into the Supabase SQL editor.
-- =====================================================================

create extension if not exists "pgcrypto" with schema extensions;

create or replace function public.generate_genesis_api_key(p_label text default 'Genesis EA key')
returns table (id uuid, plaintext text, key_prefix text, created_at timestamptz)
language plpgsql security definer
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

grant execute on function public.generate_genesis_api_key(text) to authenticated;
