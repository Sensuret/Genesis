/**
 * Supabase Edge Function: receive-trade
 *
 * POST /receive-trade
 * Accepts a JSON trade payload from the MT4/MT5 EA and upserts it into
 * the synced_trades table. Authentication is via an api_key provided
 * by the EA (looked up in the api_keys table).
 *
 * Deploy:
 *   supabase functions deploy receive-trade --no-verify-jwt
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-api-key, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface TradePayload {
  api_key: string;
  account_number: string;
  account_name?: string;
  broker?: string;
  server?: string;
  platform?: "MT4" | "MT5";
  ticket: number;
  symbol?: string;
  type?: "buy" | "sell";
  lots?: number;
  open_price?: number;
  close_price?: number;
  sl?: number;
  tp?: number;
  profit?: number;
  swap?: number;
  commission?: number;
  open_time?: string;
  close_time?: string;
}

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const body: TradePayload = await req.json();

    if (!body.api_key || !body.account_number || !body.ticket) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: api_key, account_number, ticket" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create a service-role client for database operations
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Look up the API key to find the user_id
    // In production, hash the key before lookup. For now, simple text match.
    const { data: keyRow, error: keyError } = await supabase
      .from("api_keys")
      .select("user_id, revoked_at")
      .eq("key_hash", body.api_key)
      .maybeSingle();

    if (keyError || !keyRow) {
      return new Response(
        JSON.stringify({ error: "Invalid API key" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (keyRow.revoked_at) {
      return new Response(
        JSON.stringify({ error: "API key has been revoked" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Upsert the trade (ticket + account_number is the unique key)
    const { error: upsertError } = await supabase
      .from("synced_trades")
      .upsert(
        {
          user_id: keyRow.user_id,
          account_number: String(body.account_number),
          account_name: body.account_name ?? null,
          broker: body.broker ?? null,
          server: body.server ?? null,
          platform: body.platform ?? null,
          ticket: body.ticket,
          symbol: body.symbol ?? null,
          type: body.type ?? null,
          lots: body.lots ?? null,
          open_price: body.open_price ?? null,
          close_price: body.close_price ?? null,
          sl: body.sl ?? null,
          tp: body.tp ?? null,
          profit: body.profit ?? null,
          swap: body.swap ?? null,
          commission: body.commission ?? null,
          open_time: body.open_time ?? null,
          close_time: body.close_time ?? null,
        },
        { onConflict: "account_number,ticket" }
      );

    if (upsertError) {
      return new Response(
        JSON.stringify({ error: upsertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, ticket: body.ticket }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Invalid request body" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
