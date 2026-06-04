/**
 * Schema-resilient insert / update helpers.
 *
 * Genesis evolves its database schema across PRs (PR #35 added auto-sync
 * columns to `trade_files`, PR #37 added user-preferences columns to
 * `profiles`, etc.). Each migration is shipped as an idempotent SQL block
 * that the user runs once in the Supabase SQL Editor. Until they do, the
 * schema cache served by PostgREST will NOT contain the new columns, and
 * any insert / update referencing them fails with PGRST204:
 *
 *   "Could not find the '<column>' column of '<table>' in the schema cache"
 *
 * Rather than blocking the entire feature on a one-time SQL paste, these
 * helpers try the full payload first and — on a schema-cache miss —
 * progressively drop the offending columns and retry, keeping the core
 * insert / update working with whatever subset of columns the user's
 * project has.
 *
 * The `missingColumns` array on the result tells the caller which keys
 * had to be dropped, so the UI can surface a friendly "apply schema for
 * full features" hint without leaving the save half-done.
 */

import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

// Supabase's generated types are strict about column shapes per table.
// Since this helper is intentionally generic and works with any table /
// any schema-cache state, we type the payload as a plain row and cast
// at the call boundary into Supabase. The runtime behaviour is unaffected.
type Row = Record<string, unknown>;

const SCHEMA_CACHE_PATTERN =
  /Could not find the '([^']+)' column of '([^']+)' in the schema cache/i;

/**
 * Detect whether an error is the "column missing from schema cache"
 * variant we want to recover from. Returns the missing column name when
 * matched, or null when the error is something else (RLS, NOT NULL,
 * unique violation, etc.) and should NOT be silently retried.
 */
function getMissingColumn(error: PostgrestError | null | undefined): string | null {
  if (!error) return null;
  if (error.code === "PGRST204") {
    const match = error.message?.match(SCHEMA_CACHE_PATTERN);
    if (match) return match[1];
    return null;
  }
  // Some PostgREST builds raise the same error with a different code or
  // no code at all but the same human-readable message — fall back to
  // the regex so we still recover.
  if (error.message && SCHEMA_CACHE_PATTERN.test(error.message)) {
    const match = error.message.match(SCHEMA_CACHE_PATTERN);
    if (match) return match[1];
  }
  return null;
}

function withoutKey<T extends Record<string, unknown>>(row: T, key: string): T {
  if (!(key in row)) return row;
  const { [key]: _omit, ...rest } = row;
  return rest as T;
}

export type SchemaResilientResult<T> = {
  data: T | null;
  error: PostgrestError | null;
  /** Column names that had to be dropped because the schema cache
   *  didn't know about them. Empty when the full payload succeeded. */
  missingColumns: string[];
};

/**
 * Insert a single row, retrying with progressively smaller payloads on
 * schema-cache misses. Returns the inserted row (when `.select().single()`
 * was requested) plus the list of dropped columns.
 */
export async function insertOneWithFallback<R = Row>(
  client: SupabaseClient,
  table: string,
  row: Row
): Promise<SchemaResilientResult<R>> {
  let payload: Row = { ...row };
  const missing: string[] = [];
  // Progressive retry: each iteration drops one missing column. Cap at
  // the number of keys to guarantee termination.
  const maxAttempts = Object.keys(row).length + 1;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const { data, error } = await client
      .from(table)
      // Cast through `unknown` because Supabase's generated insert type
      // depends on the table-specific row shape we deliberately don't
      // know in this generic helper.
      .insert(payload as unknown as never)
      .select()
      .single<R>();
    if (!error) {
      return { data, error: null, missingColumns: missing };
    }
    const missingCol = getMissingColumn(error);
    if (!missingCol || !(missingCol in payload)) {
      return { data: null, error, missingColumns: missing };
    }
    missing.push(missingCol);
    payload = withoutKey(payload, missingCol);
  }
  // Should never reach here — payload would be empty by now and the
  // earliest insert would have returned a non-schema-cache error.
  return {
    data: null,
    error: { message: "Exhausted schema-resilient retries", details: "", hint: "", code: "" } as PostgrestError,
    missingColumns: missing
  };
}

/**
 * Insert many rows at once, retrying with a progressively smaller
 * payload (every row gets the same column dropped) on schema-cache
 * misses. Used for trade-row bulk insert.
 */
export async function insertManyWithFallback(
  client: SupabaseClient,
  table: string,
  rows: Row[]
): Promise<SchemaResilientResult<null>> {
  if (!rows.length) return { data: null, error: null, missingColumns: [] };
  let payload: Row[] = rows.map((r) => ({ ...r }));
  const missing: string[] = [];
  const maxAttempts = Object.keys(rows[0]).length + 1;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const { error } = await client
      .from(table)
      .insert(payload as unknown as never);
    if (!error) {
      return { data: null, error: null, missingColumns: missing };
    }
    const missingCol = getMissingColumn(error);
    if (!missingCol || !(missingCol in payload[0])) {
      return { data: null, error, missingColumns: missing };
    }
    missing.push(missingCol);
    payload = payload.map((r) => withoutKey(r, missingCol));
  }
  return {
    data: null,
    error: { message: "Exhausted schema-resilient retries", details: "", hint: "", code: "" } as PostgrestError,
    missingColumns: missing
  };
}

/**
 * Update a row by primary key, retrying with progressively smaller
 * payloads on schema-cache misses. Used for profile saves where a few
 * preferences columns may not yet exist in the user's project.
 *
 * `match` is the equality filter (typically { id: userId }).
 */
export async function updateOneWithFallback(
  client: SupabaseClient,
  table: string,
  patch: Row,
  match: Record<string, string | number | boolean>
): Promise<SchemaResilientResult<null>> {
  let payload: Row = { ...patch };
  const missing: string[] = [];
  const maxAttempts = Object.keys(patch).length + 1;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    let q = client.from(table).update(payload as unknown as never);
    for (const [k, v] of Object.entries(match)) {
      q = q.eq(k, v);
    }
    const { error } = await q;
    if (!error) {
      return { data: null, error: null, missingColumns: missing };
    }
    const missingCol = getMissingColumn(error);
    if (!missingCol || !(missingCol in payload)) {
      return { data: null, error, missingColumns: missing };
    }
    missing.push(missingCol);
    payload = withoutKey(payload, missingCol);
  }
  return {
    data: null,
    error: { message: "Exhausted schema-resilient retries", details: "", hint: "", code: "" } as PostgrestError,
    missingColumns: missing
  };
}
