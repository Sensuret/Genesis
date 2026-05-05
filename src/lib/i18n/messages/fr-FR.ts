/**
 * Français (France). Trading terms (long/short, P&L, drawdown, RR)
 * stay in English by industry convention.
 */
import type { MessageTree } from "../types";

const messages: MessageTree = {
  common: {
    save: "Enregistrer",
    save_changes: "Enregistrer les modifications",
    saving: "Enregistrement…",
    saved: "Enregistré",
    cancel: "Annuler",
    reset: "Réinitialiser",
    delete: "Supprimer",
    edit: "Modifier",
    close: "Fermer",
    back: "Retour",
    next: "Suivant",
    add: "Ajouter",
    confirm: "Confirmer",
    loading: "Chargement…",
    error: "Une erreur s’est produite.",
    retry: "Réessayer",
    yes: "Oui",
    no: "Non",
    on: "Activé",
    off: "Désactivé",
    enabled: "Activé",
    disabled: "Désactivé"
  },
  sidebar: {
    dashboard: "Tableau de bord",
    trades: "Trades",
    add_trade: "Ajouter un trade",
    day_view: "Vue du jour",
    reports: "Rapports",
    streaks: "Séries",
    gs_insights: "Analyses GS",
    recaps: "Récapitulatifs",
    backtesting: "Backtesting",
    playbooks: "Playbooks",
    prop_firm: "Prop Firm",
    notebook: "Carnet",
    numerology: "Numérologie",
    settings: "Paramètres",
    sign_out: "Se déconnecter"
  },
  topbar: {
    accounts_label: "Comptes",
    accounts_all: "Tous les comptes",
    accounts_count: "{count} sélectionné(s)",
    currency_label: "Devise",
    theme_light: "Clair",
    theme_dark: "Sombre",
    theme_system: "Système",
    profile: "Profil",
    account_settings: "Paramètres du compte"
  },
  settings: {
    title: "Paramètres",
    description: "Gérez votre compte, vos préférences et les services connectés.",
    tabs: {
      account: "Compte",
      global: "Paramètres globaux",
      accounts: "Comptes",
      import_history: "Historique des imports",
      log_history: "Historique d’activité",
      security: "Sécurité",
      billing: "Facturation"
    },
    global: {
      title: "Région et affichage",
      timezone: {
        label: "Fuseau horaire",
        auto: "Détection automatique ({timezone})",
        help: "Utilisé pour les bornes du calendrier, les arrêts journaliers de P&L et les fenêtres des récapitulatifs. Le fuseau horaire du broker (celui que MetaTrader imprime dans les horodatages) se règle séparément dans Comptes → Manuel."
      },
      locale: {
        label: "Langue et locale",
        auto: "Détection automatique (navigateur)",
        help: "Affecte le formatage des nombres, des devises et des dates dans toute l’app, ainsi que la langue de l’interface."
      },
      week_start: {
        label: "La semaine commence le",
        monday: "Lundi (ISO 8601)",
        sunday: "Dimanche (US)",
        saturday: "Samedi (Moyen-Orient)",
        help: "Rapports → Calendrier et les récapitulatifs hebdomadaires l’utilisent comme première colonne."
      },
      pip_units: {
        label: "Unités de distance",
        pips: "Pips (1.00010 → 1 pip)",
        points: "Points (1.00010 → 10 points)",
        help: "Bascule les cartes “Pips moyens SL/TP” et la colonne pips par trade."
      },
      currency: {
        label: "Devise par défaut",
        help: "Sélection initiale de la devise dans la barre supérieure — vous pouvez toujours en changer par session."
      },
      saved: "Paramètres enregistrés.",
      saved_partial:
        "Enregistré ({count} colonne{plural} non prise en charge — voir le bandeau ci-dessous).",
      schema_banner: {
        title: "Appliquez le dernier schéma Supabase",
        body_some_missing:
          "Ces colonnes de préférences ne sont pas encore dans votre projet : {columns}. Les autres préférences ont été enregistrées — celles-ci le seront après l’application de la migration.",
        body_all_missing:
          "L’enregistrement a échoué car Supabase n’a pas encore les dernières colonnes de préférences.",
        step_open_editor: "Ouvrez l’éditeur SQL Supabase.",
        step_copy: "Copiez tout le fichier schema.sql (Ctrl+A, Ctrl+C).",
        step_paste: "Collez-le dans l’éditeur et cliquez sur Exécuter.",
        step_reload: "Rafraîchissez le cache : notify pgrst, 'reload schema';",
        step_refresh: "Rafraîchissez Genesis. Réenregistrez vos préférences."
      }
    }
  }
};

export default messages;
