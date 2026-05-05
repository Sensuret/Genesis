/**
 * Base English (US) translations — the canonical source.
 *
 * Every other locale's bundle is a partial override of this tree.
 * If a key is missing in the active locale at runtime, the t() helper
 * falls back to this bundle. Keep this tree comprehensive — anything
 * NOT here will appear as the literal key name in the UI, which is a
 * dev-time signal that the message tree has drifted from the call
 * sites.
 *
 * Phase 1 of the i18n rollout (this PR) covers:
 *  - Global Settings page (the page where the locale dropdown lives,
 *    so users can verify the change visually before saving)
 *  - Common action buttons (Save / Cancel / Reset / Delete / Edit)
 *  - Sidebar nav labels
 *  - Topbar nav labels
 *
 * Phases 2-4 fill in Dashboard, Trades, Day View, Reports, Settings
 * sub-tabs, Notebook, Numerology, Streaks, Recaps and the long tail.
 */

import type { MessageTree } from "../types";

const messages: MessageTree = {
  common: {
    save: "Save",
    save_changes: "Save changes",
    saving: "Saving…",
    saved: "Saved",
    cancel: "Cancel",
    reset: "Reset",
    delete: "Delete",
    edit: "Edit",
    close: "Close",
    back: "Back",
    next: "Next",
    add: "Add",
    confirm: "Confirm",
    loading: "Loading…",
    error: "Something went wrong.",
    retry: "Retry",
    yes: "Yes",
    no: "No",
    on: "On",
    off: "Off",
    enabled: "Enabled",
    disabled: "Disabled"
  },

  sidebar: {
    dashboard: "Dashboard",
    trades: "Trades",
    add_trade: "Add Trade",
    day_view: "Day View",
    reports: "Reports",
    streaks: "Streaks",
    gs_insights: "GS Insights",
    recaps: "Recaps",
    backtesting: "Backtesting",
    playbooks: "Playbooks",
    prop_firm: "Prop Firm Calculator",
    notebook: "Notebook",
    numerology: "Numerology & Astrology",
    settings: "Settings",
    sign_out: "Sign out",
    theme: "Theme",
    your_account: "Your account"
  },

  topbar: {
    greeting_morning: "Good morning",
    greeting_afternoon: "Good afternoon",
    greeting_evening: "Good evening",
    accounts_label: "Accounts",
    accounts_all: "All accounts",
    accounts_all_count: "All accounts · {count}",
    accounts_none: "No accounts",
    accounts_count: "{count} selected",
    accounts_count_of: "{count} of {total} selected",
    accounts_empty_hint: "No accounts yet — upload a CSV to get started.",
    accounts_trades_suffix: "· {count} trades",
    currency_label: "Currency",
    currency_aria: "Display currency, currently {code}",
    currency_title: "Display currency · {code}",
    range_label: "Range",
    range_all: "All time",
    range_7d: "Last 7 days",
    range_30d: "Last 30 days",
    range_90d: "Last 90 days",
    range_ytd: "Year to date",
    range_1y: "Last 1 year",
    playbook_label: "Playbook",
    playbook_all: "All playbooks",
    playbook_empty_hint: "No playbooks yet — create one in the Playbooks page.",
    reset_label: "Reset",
    reset_title: "Reset filters",
    account_label: "Account",
    theme_light: "Light",
    theme_dark: "Dark",
    theme_system: "System",
    profile: "Profile",
    account_settings: "Account settings"
  },

  settings: {
    title: "Settings",
    description: "Manage your account, preferences and connected services.",
    tabs: {
      account: "Account",
      global: "Global Settings",
      accounts: "Accounts",
      import_history: "Import History",
      log_history: "Log History",
      security: "Security",
      billing: "Billing"
    },
    global: {
      title: "Region & display",
      timezone: {
        label: "Timezone",
        auto: "Auto-detect ({timezone})",
        help: "Used for calendar boundaries, daily P&L cut-offs and recap windows. Per-file broker timezone (the one MetaTrader prints timestamps in) is set independently in Accounts → Manual."
      },
      locale: {
        label: "Language & locale",
        auto: "Auto-detect (browser)",
        help: "Affects number, currency and date formatting across the app, and the language used in the UI."
      },
      week_start: {
        label: "Week starts on",
        monday: "Monday (ISO 8601)",
        sunday: "Sunday (US)",
        saturday: "Saturday (Middle East)",
        help: "Reports → Calendar and weekly recaps use this as the first column."
      },
      pip_units: {
        label: "Distance units",
        pips: "Pips (1.00010 → 1 pip)",
        points: "Points (1.00010 → 10 points)",
        help: "Switches the “Avg SL/TP pips” cards and the per-trade pips column."
      },
      currency: {
        label: "Default currency",
        help: "Initial currency selection on the top-bar — you can still flip it per-session."
      },
      saved: "Settings saved.",
      saved_partial:
        "Saved ({count} new column{plural} skipped — see banner below).",
      schema_banner: {
        title: "Apply the latest Supabase schema",
        body_some_missing:
          "These preferences columns aren’t in your project yet: {columns}. Other preferences saved — these will save once you apply the migration.",
        body_all_missing:
          "Save failed because Supabase doesn’t have the latest preferences columns yet.",
        step_open_editor: "Open the Supabase SQL editor.",
        step_copy: "Copy the entire schema.sql file (Ctrl+A, Ctrl+C).",
        step_paste: "Paste into the editor and click Run.",
        step_reload:
          "Refresh the cache: notify pgrst, 'reload schema';",
        step_refresh: "Refresh Genesis. Re-save your preferences."
      }
    }
  },

  add_trade: {
    title: "Add Trade",
    description: "Upload a CSV/XLSX from any broker or add a trade by hand.",
    tab_upload: "Upload CSV / XLSX",
    tab_manual: "Manual entry",
    detected_format_metatrader: "MT5 ReportHistory detected",
    detected_format_generic: "Account info detected",
    badges: {
      account_number: "Account #{number}",
      balance: "Balance ${value}",
      equity: "Equity ${value}",
      deposits: "{count} deposits · ${total}",
      withdrawals: "{count} withdrawals · ${total}"
    },
    holder_line: "Holder: {holder}",
    holder_company_line: "Holder: {holder} · {company}",
    save_button: "Save trades",
    saving_button: "Saving…",
    schema_banner: {
      title: "Apply the latest Supabase schema",
      body_some_missing:
        "The following columns aren’t in your project yet: {columns}. The import still saved without them — but broker / account chips, deposit totals and analytics grouping won’t work until you apply the migration.",
      body_all_missing:
        "Your import failed because Supabase doesn’t have the latest columns yet."
    }
  }
};

export default messages;
