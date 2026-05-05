/**
 * Deutsch (Deutschland). Trading terms stay in English where common
 * (long/short, P&L, drawdown, RR).
 */
import type { MessageTree } from "../types";

const messages: MessageTree = {
  common: {
    save: "Speichern",
    save_changes: "Änderungen speichern",
    saving: "Wird gespeichert…",
    saved: "Gespeichert",
    cancel: "Abbrechen",
    reset: "Zurücksetzen",
    delete: "Löschen",
    edit: "Bearbeiten",
    close: "Schließen",
    back: "Zurück",
    next: "Weiter",
    add: "Hinzufügen",
    confirm: "Bestätigen",
    loading: "Wird geladen…",
    error: "Etwas ist schiefgelaufen.",
    retry: "Erneut versuchen",
    yes: "Ja",
    no: "Nein",
    on: "An",
    off: "Aus",
    enabled: "Aktiviert",
    disabled: "Deaktiviert"
  },
  sidebar: {
    dashboard: "Dashboard",
    trades: "Trades",
    add_trade: "Trade hinzufügen",
    day_view: "Tagesansicht",
    reports: "Berichte",
    streaks: "Serien",
    gs_insights: "GS-Analysen",
    recaps: "Rückblicke",
    backtesting: "Backtesting",
    playbooks: "Playbooks",
    prop_firm: "Prop Firm",
    notebook: "Notizbuch",
    numerology: "Numerologie",
    settings: "Einstellungen",
    sign_out: "Abmelden"
  },
  topbar: {
    accounts_label: "Konten",
    accounts_all: "Alle Konten",
    accounts_count: "{count} ausgewählt",
    currency_label: "Währung",
    theme_light: "Hell",
    theme_dark: "Dunkel",
    theme_system: "System",
    profile: "Profil",
    account_settings: "Kontoeinstellungen"
  },
  settings: {
    title: "Einstellungen",
    description: "Verwalten Sie Ihr Konto, Ihre Einstellungen und verbundenen Dienste.",
    tabs: {
      account: "Konto",
      global: "Globale Einstellungen",
      accounts: "Konten",
      import_history: "Import-Verlauf",
      log_history: "Ereignisprotokoll",
      security: "Sicherheit",
      billing: "Abrechnung"
    },
    global: {
      title: "Region & Anzeige",
      timezone: {
        label: "Zeitzone",
        auto: "Automatisch erkennen ({timezone})",
        help: "Wird für Kalender-Grenzen, tägliche P&L-Schnitte und Rückblicks-Fenster verwendet. Die Broker-Zeitzone (die MetaTrader in Zeitstempel schreibt) wird separat unter Konten → Manuell festgelegt."
      },
      locale: {
        label: "Sprache & Region",
        auto: "Automatisch erkennen (Browser)",
        help: "Beeinflusst die Formatierung von Zahlen, Währungen und Datumsangaben sowie die Sprache der Oberfläche."
      },
      week_start: {
        label: "Woche beginnt am",
        monday: "Montag (ISO 8601)",
        sunday: "Sonntag (USA)",
        saturday: "Samstag (Naher Osten)",
        help: "Berichte → Kalender und wöchentliche Rückblicke verwenden dies als erste Spalte."
      },
      pip_units: {
        label: "Distanz-Einheiten",
        pips: "Pips (1,00010 → 1 Pip)",
        points: "Punkte (1,00010 → 10 Punkte)",
        help: "Wechselt die „Durchschn. SL/TP-Pips“-Karten und die Pips-Spalte pro Trade."
      },
      currency: {
        label: "Standardwährung",
        help: "Anfangsauswahl der Währung in der oberen Leiste — Sie können sie pro Sitzung ändern."
      },
      saved: "Einstellungen gespeichert.",
      saved_partial:
        "Gespeichert ({count} neue Spalte{plural} übersprungen — siehe Hinweis unten).",
      schema_banner: {
        title: "Wenden Sie das neueste Supabase-Schema an",
        body_some_missing:
          "Diese Einstellungs-Spalten fehlen noch in Ihrem Projekt: {columns}. Andere Einstellungen wurden gespeichert — diese werden nach dem Migrations-Schritt gespeichert.",
        body_all_missing:
          "Speichern fehlgeschlagen, weil Supabase die neuesten Spalten noch nicht hat.",
        step_open_editor: "Öffnen Sie den Supabase-SQL-Editor.",
        step_copy: "Kopieren Sie die gesamte schema.sql-Datei (Strg+A, Strg+C).",
        step_paste: "Einfügen und auf Run klicken.",
        step_reload: "Cache aktualisieren: notify pgrst, 'reload schema';",
        step_refresh: "Genesis aktualisieren. Einstellungen erneut speichern."
      }
    }
  }
};

export default messages;
