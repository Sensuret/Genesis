// Hand-rolled types matching supabase/schema.sql. Regenerate with `supabase gen types`
// once the project is linked to the CLI.

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type TradeRow = {
  id: string;
  user_id: string;
  file_id: string | null;
  pair: string | null;
  trade_date: string | null;
  session: string | null;
  side: "long" | "short" | null;
  entry: number | null;
  stop_loss: number | null;
  take_profit: number | null;
  exit_price: number | null;
  lot_size: number | null;
  result_r: number | null;
  pnl: number | null;
  commissions: number | null;
  spread: number | null;
  /** ISO timestamp of when the trade opened (broker time, treated as UTC). */
  open_time: string | null;
  /** ISO timestamp of when the trade closed (broker time, treated as UTC). */
  close_time: string | null;
  /** Trade duration in seconds (close_time − open_time). */
  duration_seconds: number | null;
  /** Net pips moved on the trade (signed: positive = winner direction). */
  pips: number | null;
  account_balance: number | null;
  setup_tag: string | null;
  mistake_tag: string | null;
  emotions: string[] | null;
  notes: string | null;
  screenshot_url: string | null;
  playbook_id: string | null;
  created_at: string;
  updated_at: string;
};

export type PlaybookRow = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  rules: Json;
  symbol_aliases: string[];
  created_at: string;
  updated_at: string;
};

export type TradeFileRow = {
  id: string;
  user_id: string;
  name: string;
  source: string | null;
  trade_count: number;
  /** Per-file broker timezone offset in minutes from UTC. MT4/MT5 server
   *  timezones differ between brokers (FTMO/ICMarkets ≈ GMT+2/+3 with DST,
   *  Pepperstone ≈ UTC). Null = use the parser's auto-detected default. */
  broker_tz_offset_minutes: number | null;
  /** Closing account balance reported in the broker file footer (MT5). */
  account_balance: number | null;
  /** Closing equity reported in the broker file footer (MT5). */
  account_equity: number | null;
  /** Sum of every Deposit transaction the broker recorded for this file. */
  deposits_total: number | null;
  /** Sum of every Withdrawal transaction the broker recorded for this file. */
  withdrawals_total: number | null;
  /** "manual" for CSV-imported, "ea" for MT4/MT5 Expert Advisor sync,
   *  "broker_api" reserved for future direct-broker integrations. */
  sync_kind?: "manual" | "ea" | "broker_api";
  /** EA-only: the MetaTrader account number this row represents. */
  account_number?: string | null;
  /** EA-only: AccountName() (or user-provided label). */
  account_name?: string | null;
  /** EA-only: AccountCompany(). */
  broker?: string | null;
  /** EA-only: AccountServer(). */
  server?: string | null;
  /** EA-only: "MT4" or "MT5". */
  platform?: "MT4" | "MT5" | null;
  /** EA-only: most recent trade-event timestamp seen for this account. */
  last_synced_at?: string | null;
  created_at: string;
};

/** API key row for the MT4/MT5 Expert Advisor auto-sync flow. */
export type GenesisApiKeyRow = {
  id: string;
  user_id: string;
  label: string;
  key_hash: string;
  key_prefix: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
};

export type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  dob: string | null;
  default_currency: string | null;
  starting_balance: number | null;
  /** IANA timezone name (e.g. "Africa/Nairobi"). Null = auto-detect from browser. */
  timezone: string | null;
  /** BCP-47 locale (e.g. "en-US"). Null = auto-detect from browser. */
  locale: string | null;
  /** First day of the week shown in calendars / weekly recaps. */
  week_starts_on: "monday" | "sunday" | "saturday" | null;
  /** How distance is shown across the app — pips (1.00010 → 1) vs points (1.00010 → 10). */
  pip_units: "pips" | "points" | null;
  /** User's primary broker — used as a hint for new imports. */
  preferred_broker: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * Audit-log entries surfaced under Settings → Log history.
 * Written by the `log_audit_event` RPC (security definer) so RLS allows
 * the row but timestamps + user_id stay trustworthy.
 */
export type AuditLogRow = {
  id: string;
  user_id: string;
  event_type: string;
  summary: string;
  metadata: Record<string, unknown>;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
};

export type NumerologyProfileRow = {
  id: string;
  user_id: string;
  full_name: string;
  dob: string;
  data: Json;
  created_at: string;
  updated_at: string;
};

export type NumerologyOtherRow = {
  id: string;
  user_id: string;
  full_name: string;
  nickname: string | null;
  dob: string;
  relationship: string;
  data: Json;
  created_at: string;
  updated_at: string;
};

export type SetupTagRow = {
  id: string;
  user_id: string;
  name: string;
  color: string | null;
};

export type MistakeTagRow = {
  id: string;
  user_id: string;
  name: string;
  color: string | null;
};

export type EmotionRow = {
  id: string;
  user_id: string;
  name: string;
};

export type UserSettingsRow = {
  user_id: string;
  data: Json;
  created_at: string;
  updated_at: string;
};

export type NotebookNote = {
  id: string;
  name: string;
  body: string;
  /** ISO timestamp of when the note was first saved. */
  created_at: string;
  /** ISO timestamp of the most recent edit. Optional for legacy rows. */
  updated_at?: string;
};

export type NotebookEmbed = {
  id: string;
  label: string;
  url: string;
};

/** A single block inside a sub-section of a Yearly Resolution.
 *  Originally just a tickable bullet; now extended with an optional
 *  `kind` field so the inner editor can be a Notion-style slash-command
 *  block list (text / heading / to-do / bigbox / toggle / callout /
 *  quote / divider / bullet / numbered). Legacy rows without `kind`
 *  default to the original "todo" tickbox rendering. */
export type ResolutionBlockKind =
  | "text"
  | "h1"
  | "h2"
  | "h3"
  | "bullet"
  | "numbered"
  | "todo"
  | "bigbox"
  | "toggle"
  | "callout"
  | "quote"
  | "divider";

export type ResolutionItem = {
  id: string;
  text: string;
  /** Optional — quarterly checkboxes that flag what's already been hit.
   *  Only meaningful for `todo` / `bigbox` kinds (and legacy untyped). */
  checked?: boolean;
  /** Block kind. Omitted on legacy rows; default rendering is "todo". */
  kind?: ResolutionBlockKind;
  /** Toggle blocks: whether the disclosure is currently open. */
  open?: boolean;
};

/** A focused area inside a Resolution section (e.g. "Personal account"). */
export type ResolutionSubsection = {
  id: string;
  label: string;
  /** Headline target / overall goal for this sub-section. */
  target?: string;
  /** Whether the headline target itself is checked off. Counts toward the
   *  card's overall progress percentage just like a regular bullet. */
  target_checked?: boolean;
  items: ResolutionItem[];
};

/** Top-level Resolution section (e.g. "Trading Plan", "Personal Health"). */
export type ResolutionSection = {
  id: string;
  label: string;
  /** Tailwind tone used for this section's eyebrow header. */
  color: "orange" | "pink" | "green" | "purple" | "blue" | "amber";
  subsections: ResolutionSubsection[];
};

/**
 * Background style for a Resolution card. "theme" defers to the app's
 * current theme (default), "solid" uses a single colour swatch, "gradient"
 * picks one of the named preset gradients.
 */
export type ResolutionBackground =
  | { kind: "theme" }
  | { kind: "solid"; color: string }
  | { kind: "gradient"; preset: string };

/** Saved yearly Resolution (a year's worth of goals & sub-goals). */
export type Resolution = {
  id: string;
  /** Gregorian year this resolution applies to. */
  year: number;
  /** Optional title — defaults to "<YEAR> Resolutions". */
  title?: string;
  created_at: string;
  sections: ResolutionSection[];
  /** Card background. Falls back to "theme" when omitted (legacy rows). */
  background?: ResolutionBackground;
  /** Whether to render the "YEAR OF THE <ANIMAL>" eyebrow label. Default true. */
  show_year_label?: boolean;
  /**
   * Personal owner-name shown above the year banner. Defaults to the
   * profile's full name on first save; user can edit per-resolution and
   * toggle visibility independently of the data.
   */
  owner_name?: string;
  /** Show the personalised owner name above the year. Default false. */
  show_owner_name?: boolean;
  /** Show the "Created on …" timestamp below the year. Default false. */
  show_created_timestamp?: boolean;
  /** Show overall progress (% of checkboxes ticked) at the top of the card. */
  show_progress?: boolean;
  /** @deprecated The Genesis brand mark is now always rendered on Resolution
   *  cards. Kept on the type so legacy rows still parse without errors. */
  show_genesis_logo?: boolean;
};

export type UserSettingsData = {
  notebook_embeds?: NotebookEmbed[];
  notebook_active_id?: string | null;
  notebook_scratchpad?: string;
  notebook_notes?: NotebookNote[];
  notebook_resolutions?: Resolution[];
};

type Insertable<T extends { id: string; created_at: string }> = Omit<
  T,
  "id" | "created_at" | "updated_at"
> &
  Partial<Pick<T, "id">>;
type Updatable<T> = Partial<T>;

export type Database = {
  public: {
    Tables: {
      profiles: { Row: ProfileRow; Insert: Insertable<ProfileRow>; Update: Updatable<ProfileRow> };
      trades: { Row: TradeRow; Insert: Insertable<TradeRow>; Update: Updatable<TradeRow> };
      trade_files: {
        Row: TradeFileRow;
        Insert: Omit<
          TradeFileRow,
          | "id"
          | "created_at"
          | "trade_count"
          | "account_balance"
          | "account_equity"
          | "deposits_total"
          | "withdrawals_total"
        > &
          Partial<
            Pick<
              TradeFileRow,
              | "id"
              | "trade_count"
              | "account_balance"
              | "account_equity"
              | "deposits_total"
              | "withdrawals_total"
            >
          >;
        Update: Updatable<TradeFileRow>;
      };
      numerology_profiles: {
        Row: NumerologyProfileRow;
        Insert: Insertable<NumerologyProfileRow>;
        Update: Updatable<NumerologyProfileRow>;
      };
      numerology_others: {
        Row: NumerologyOtherRow;
        Insert: Insertable<NumerologyOtherRow>;
        Update: Updatable<NumerologyOtherRow>;
      };
      setups: {
        Row: SetupTagRow;
        Insert: Omit<SetupTagRow, "id"> & Partial<Pick<SetupTagRow, "id">>;
        Update: Updatable<SetupTagRow>;
      };
      mistakes: {
        Row: MistakeTagRow;
        Insert: Omit<MistakeTagRow, "id"> & Partial<Pick<MistakeTagRow, "id">>;
        Update: Updatable<MistakeTagRow>;
      };
      emotions: {
        Row: EmotionRow;
        Insert: Omit<EmotionRow, "id"> & Partial<Pick<EmotionRow, "id">>;
        Update: Updatable<EmotionRow>;
      };
      user_settings: {
        Row: UserSettingsRow;
        Insert: Omit<UserSettingsRow, "created_at" | "updated_at"> &
          Partial<Pick<UserSettingsRow, "created_at" | "updated_at">>;
        Update: Updatable<UserSettingsRow>;
      };
      playbooks: {
        Row: PlaybookRow;
        Insert: Insertable<PlaybookRow>;
        Update: Updatable<PlaybookRow>;
      };
      genesis_api_keys: {
        Row: GenesisApiKeyRow;
        Insert: Pick<GenesisApiKeyRow, "user_id" | "key_hash" | "key_prefix"> &
          Partial<Pick<GenesisApiKeyRow, "id" | "label" | "created_at" | "last_used_at" | "revoked_at">>;
        Update: Partial<GenesisApiKeyRow>;
      };
      audit_log: {
        Row: AuditLogRow;
        Insert: Pick<AuditLogRow, "user_id" | "event_type" | "summary"> &
          Partial<Pick<AuditLogRow, "id" | "metadata" | "ip" | "user_agent" | "created_at">>;
        Update: Partial<AuditLogRow>;
      };
    };
    Views: Record<string, never>;
    Functions: {
      generate_genesis_api_key: {
        Args: { p_label?: string };
        Returns: {
          id: string;
          plaintext: string;
          key_prefix: string;
          created_at: string;
        }[];
      };
      log_audit_event: {
        Args: { p_event_type: string; p_summary: string; p_metadata?: Record<string, unknown> };
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
