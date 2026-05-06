// Supabase Edge Function — receive-trade
// ---------------------------------------------------------------------------
// Endpoint hit by the Genesis MT4 / MT5 Expert Advisor on every trade open,
// close or amendment. Authenticates the EA by API key, then upserts the
// trade into `public.trades` via the `ingest_ea_trade` SECURITY DEFINER
// function so the row is associated with the correct user without exposing
// service-role credentials to the EA.
//
// Deploy:
//   supabase functions deploy receive-trade --project-ref <ref> --no-verify-jwt
//
// Required project secrets (set via `supabase secrets set` or the dashboard):
//   SUPABASE_URL              (auto-provided)
//   SUPABASE_SERVICE_ROLE_KEY (auto-provided)
//
// Request format (POST application/json):
//   Headers: X-Api-Key: gs_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
//   Body: {
//     account_number: "12345678",
//     account_name:   "Live HFM USD",
//     broker:         "HF Markets",
//     server:         "HFM-Live",
//     platform:       "MT4" | "MT5",
//     ticket:         "987654321",
//     symbol:         "XAUUSD",
//     type:           "buy" | "sell",
//     lots:           0.10,
//     open_price:     2375.10,
//     close_price:    2390.20,    // null while open
//     sl:             2370.00,
//     tp:             2395.00,
//     profit:         151.00,
//     swap:           -0.42,
//     commission:     -2.10,
//     open_time:      "2025-01-15T08:30:12Z",
//     close_time:     "2025-01-15T11:42:01Z" | null
//   }
// ---------------------------------------------------------------------------

// deno-lint-ignore-file no-explicit-any

// @ts-ignore -- Deno-only import; resolved at deploy time on Supabase Edge.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const Deno: { env: { get(key: string): string | undefined }; serve(handler: (req: Request) => Response | Promise<Response>): void };

const CORS_HEADERS: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type, x-api-key",
  "access-control-allow-methods": "POST, OPTIONS"
};

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json",
      ...CORS_HEADERS
    }
  });
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

type TradePayload = {
  // "heartbeat" → register/refresh the trade_files row only, no trade
  // upsert. Anything else (or missing) is treated as a normal trade.
  kind?: string | null;
  account_number: string;
  account_name?: string | null;
  broker?: string | null;
  server?: string | null;
  platform?: "MT4" | "MT5" | null;
  ticket: string | number;
  symbol?: string | null;
  type?: string | null;
  lots?: number | null;
  open_price?: number | null;
  close_price?: number | null;
  sl?: number | null;
  tp?: number | null;
  profit?: number | null;
  swap?: number | null;
  commission?: number | null;
  open_time?: string | null;
  close_time?: string | null;
};

function requireString(v: unknown, name: string): string {
  if (typeof v === "string" && v.trim()) return v.trim();
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  throw new Error(`Missing or invalid \`${name}\``);
}

function optionalNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function optionalIso(v: unknown): string | null {
  if (!v) return null;
  if (typeof v !== "string") return null;
  // Accept "YYYY-MM-DD HH:MM:SS" (MT format) and ISO-8601 alike.
  const normalized = v.includes("T") ? v : v.replace(" ", "T");
  const d = new Date(normalized.endsWith("Z") ? normalized : `${normalized}Z`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SERVICE_ROLE) {
    return jsonResponse({ error: "Server misconfigured" }, 500);
  }

  const apiKey = req.headers.get("x-api-key") ?? req.headers.get("X-Api-Key");
  if (!apiKey || !apiKey.trim()) {
    return jsonResponse({ error: "Missing X-Api-Key header" }, 401);
  }

  let body: TradePayload;
  try {
    body = (await req.json()) as TradePayload;
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const isHeartbeat = body.kind === "heartbeat";

  let accountNumber: string;
  let ticket: string;
  try {
    accountNumber = requireString(body.account_number, "account_number");
    // Heartbeat payloads carry a sentinel "heartbeat" ticket so this stays
    // a string field, but we never write it into the trades table.
    ticket = isHeartbeat ? "heartbeat" : requireString(body.ticket, "ticket");
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 400);
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const keyHash = await sha256Hex(apiKey.trim());
  const { data: keyRow, error: keyErr } = await supabase
    .from("genesis_api_keys")
    .select("id, user_id, revoked_at")
    .eq("key_hash", keyHash)
    .maybeSingle();

  if (keyErr) {
    return jsonResponse({ error: "Auth lookup failed" }, 500);
  }
  if (!keyRow || keyRow.revoked_at) {
    return jsonResponse({ error: "Invalid or revoked API key" }, 401);
  }

  if (isHeartbeat) {
    // Heartbeat path: just register/refresh the trade_files row so the
    // Genesis app sees the account online. No trade rows touched.
    const { error: hbErr } = await supabase.rpc("register_ea_account", {
      p_user_id: keyRow.user_id,
      p_account_number: accountNumber,
      p_account_name: body.account_name ?? null,
      p_broker: body.broker ?? null,
      p_server: body.server ?? null,
      p_platform: body.platform ?? null
    });
    if (hbErr) {
      return jsonResponse({ error: hbErr.message }, 500);
    }
    await supabase
      .from("genesis_api_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", keyRow.id);
    return jsonResponse({ ok: true, kind: "heartbeat" });
  }

  const { error: rpcErr, data: ingested } = await supabase.rpc("ingest_ea_trade", {
    p_user_id: keyRow.user_id,
    p_account_number: accountNumber,
    p_account_name: body.account_name ?? null,
    p_broker: body.broker ?? null,
    p_server: body.server ?? null,
    p_platform: body.platform ?? null,
    p_ticket: ticket,
    p_symbol: body.symbol ?? null,
    p_side: body.type ?? null,
    p_lots: optionalNumber(body.lots),
    p_open_price: optionalNumber(body.open_price),
    p_close_price: optionalNumber(body.close_price),
    p_sl: optionalNumber(body.sl),
    p_tp: optionalNumber(body.tp),
    p_profit: optionalNumber(body.profit),
    p_swap: optionalNumber(body.swap),
    p_commission: optionalNumber(body.commission),
    p_open_time: optionalIso(body.open_time),
    p_close_time: optionalIso(body.close_time)
  });

  if (rpcErr) {
    return jsonResponse({ error: rpcErr.message }, 500);
  }

  // Touch last_used_at on the key (best-effort).
  await supabase
    .from("genesis_api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", keyRow.id);

  return jsonResponse({ ok: true, trade_id: ingested ?? null });
});
