/**
 * Kiswahili (Kenya). Trading-specific terms (long/short, P&L,
 * drawdown, RR) stay in English by industry convention. The user
 * is welcome to hand-edit any of these strings — Swahili trading
 * vocabulary isn't standardised, so the choices here lean toward
 * everyday Kiswahili sanifu.
 */
import type { MessageTree } from "../types";

const messages: MessageTree = {
  common: {
    save: "Hifadhi",
    save_changes: "Hifadhi mabadiliko",
    saving: "Inahifadhi…",
    saved: "Imehifadhiwa",
    cancel: "Ghairi",
    reset: "Weka upya",
    delete: "Futa",
    edit: "Hariri",
    close: "Funga",
    back: "Rudi",
    next: "Endelea",
    add: "Ongeza",
    confirm: "Thibitisha",
    loading: "Inapakia…",
    error: "Hitilafu imetokea.",
    retry: "Jaribu tena",
    yes: "Ndiyo",
    no: "Hapana",
    on: "Imewashwa",
    off: "Imezimwa",
    enabled: "Imewashwa",
    disabled: "Imezimwa"
  },
  sidebar: {
    dashboard: "Dashibodi",
    trades: "Trades",
    add_trade: "Ongeza Trade",
    day_view: "Mtazamo wa Siku",
    reports: "Ripoti",
    streaks: "Mfululizo",
    gs_insights: "Maoni ya GS",
    recaps: "Muhtasari",
    backtesting: "Backtesting",
    playbooks: "Playbooks",
    prop_firm: "Prop Firm",
    notebook: "Daftari",
    numerology: "Nambari",
    settings: "Mipangilio",
    sign_out: "Toka"
  },
  topbar: {
    accounts_label: "Akaunti",
    accounts_all: "Akaunti zote",
    accounts_count: "{count} zilizochaguliwa",
    currency_label: "Sarafu",
    theme_light: "Mwanga",
    theme_dark: "Giza",
    theme_system: "Mfumo",
    profile: "Wasifu",
    account_settings: "Mipangilio ya Akaunti"
  },
  settings: {
    title: "Mipangilio",
    description: "Simamia akaunti yako, mapendeleo na huduma zilizounganishwa.",
    tabs: {
      account: "Akaunti",
      global: "Mipangilio ya Jumla",
      accounts: "Akaunti",
      import_history: "Historia ya Uingizaji",
      log_history: "Historia ya Matukio",
      security: "Usalama",
      billing: "Malipo"
    },
    global: {
      title: "Eneo na Maonyesho",
      timezone: {
        label: "Saa za eneo",
        auto: "Tambua moja kwa moja ({timezone})",
        help: "Hutumiwa kwa mipaka ya kalenda, mikato ya kila siku ya P&L na madirisha ya muhtasari. Saa za broker (zile MetaTrader inazoonyesha) hupangwa kivyake kwenye Akaunti → Mwenyewe."
      },
      locale: {
        label: "Lugha na eneo",
        auto: "Tambua moja kwa moja (kivinjari)",
        help: "Huathiri umbizo la nambari, sarafu na tarehe katika programu nzima, na lugha inayotumika kwenye kiolesura."
      },
      week_start: {
        label: "Wiki huanza",
        monday: "Jumatatu (ISO 8601)",
        sunday: "Jumapili (Marekani)",
        saturday: "Jumamosi (Mashariki ya Kati)",
        help: "Ripoti → Kalenda na muhtasari wa kila wiki hutumia hii kama safu wima ya kwanza."
      },
      pip_units: {
        label: "Vipimo vya umbali",
        pips: "Pips (1.00010 → pip 1)",
        points: "Points (1.00010 → points 10)",
        help: "Hubadilisha kadi za “Wastani wa SL/TP pips” na safu wima ya pips kwa kila trade."
      },
      currency: {
        label: "Sarafu chaguomsingi",
        help: "Uchaguzi wa awali wa sarafu kwenye mwambaa wa juu — bado unaweza kuibadilisha kwa kila kipindi."
      },
      saved: "Mipangilio imehifadhiwa.",
      saved_partial:
        "Imehifadhiwa (safu wima {count} mpya zimerukwa — angalia onyo hapa chini).",
      schema_banner: {
        title: "Tumia schema mpya zaidi ya Supabase",
        body_some_missing:
          "Safu wima hizi za mapendeleo bado hazipo kwenye mradi wako: {columns}. Mapendeleo mengine yamehifadhiwa — haya yatahifadhiwa baada ya kutumia uhamiaji.",
        body_all_missing:
          "Hifadhi imeshindikana kwa sababu Supabase bado haina safu wima za hivi karibuni.",
        step_open_editor: "Fungua kihariri cha SQL cha Supabase.",
        step_copy: "Nakili faili nzima ya schema.sql (Ctrl+A, Ctrl+C).",
        step_paste: "Bandika kwenye kihariri kisha bofya Run.",
        step_reload: "Sasisha akiba: notify pgrst, 'reload schema';",
        step_refresh: "Onyesha upya Genesis. Hifadhi mapendeleo yako tena."
      }
    }
  }
};

export default messages;
