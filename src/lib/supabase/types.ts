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
  created_at: string;
};

export type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  dob: string | null;
  default_currency: string | null;
  starting_balance: number | null;
  created_at: string;
  updated_at: string;
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
};

export type NotebookEmbed = {
  id: string;
  label: string;
  url: string;
};

/** A single bullet inside a sub-section of a Yearly Resolution. */
export type ResolutionItem = {
  id: string;
  text: string;
  /** Optional — quarterly checkboxes that flag what's already been hit. */
  checked?: boolean;
};

/** A focused area inside a Resolution section (e.g. "Personal account"). */
export type ResolutionSubsection = {
  id: string;
  label: string;
  /** Headline target / overall goal for this sub-section. */
  target?: string;
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

/** Saved yearly Resolution (a year's worth of goals & sub-goals). */
export type Resolution = {
  id: string;
  /** Gregorian year this resolution applies to. */
  year: number;
  /** Optional title — defaults to "<YEAR> Resolutions". */
  title?: string;
  created_at: string;
  sections: ResolutionSection[];
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
        Insert: Omit<TradeFileRow, "id" | "created_at" | "trade_count"> & Partial<Pick<TradeFileRow, "id" | "trade_count">>;
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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
