/**
 * Español (España).
 * Trading-specific terminology like "long/short", "P&L", "drawdown",
 * "RR" stays in English (industry convention) — only the surrounding
 * UI chrome is translated.
 */
import type { MessageTree } from "../types";

const messages: MessageTree = {
  common: {
    save: "Guardar",
    save_changes: "Guardar cambios",
    saving: "Guardando…",
    saved: "Guardado",
    cancel: "Cancelar",
    reset: "Restablecer",
    delete: "Eliminar",
    edit: "Editar",
    close: "Cerrar",
    back: "Atrás",
    next: "Siguiente",
    add: "Añadir",
    confirm: "Confirmar",
    loading: "Cargando…",
    error: "Algo salió mal.",
    retry: "Reintentar",
    yes: "Sí",
    no: "No",
    on: "Sí",
    off: "No",
    enabled: "Activado",
    disabled: "Desactivado"
  },
  sidebar: {
    dashboard: "Panel",
    trades: "Operaciones",
    add_trade: "Añadir operación",
    day_view: "Vista del día",
    reports: "Informes",
    streaks: "Rachas",
    gs_insights: "Análisis GS",
    recaps: "Resúmenes",
    backtesting: "Backtesting",
    playbooks: "Playbooks",
    prop_firm: "Prop Firm",
    notebook: "Cuaderno",
    numerology: "Numerología",
    settings: "Ajustes",
    sign_out: "Cerrar sesión"
  },
  topbar: {
    accounts_label: "Cuentas",
    accounts_all: "Todas las cuentas",
    accounts_count: "{count} seleccionadas",
    currency_label: "Divisa",
    theme_light: "Claro",
    theme_dark: "Oscuro",
    theme_system: "Sistema",
    profile: "Perfil",
    account_settings: "Ajustes de cuenta"
  },
  settings: {
    title: "Ajustes",
    description: "Gestiona tu cuenta, preferencias y servicios conectados.",
    tabs: {
      account: "Cuenta",
      global: "Ajustes globales",
      accounts: "Cuentas",
      import_history: "Historial de importaciones",
      log_history: "Historial de eventos",
      security: "Seguridad",
      billing: "Facturación"
    },
    global: {
      title: "Región y visualización",
      timezone: {
        label: "Zona horaria",
        auto: "Detectar automáticamente ({timezone})",
        help: "Se utiliza para los límites del calendario, los cortes diarios de P&L y las ventanas de los resúmenes. La zona horaria del bróker (la que MetaTrader imprime en las marcas de tiempo) se ajusta de forma independiente en Cuentas → Manual."
      },
      locale: {
        label: "Idioma e idioma",
        auto: "Detectar automáticamente (navegador)",
        help: "Afecta al formato de números, divisas y fechas en toda la app, y al idioma utilizado en la interfaz."
      },
      week_start: {
        label: "La semana empieza el",
        monday: "Lunes (ISO 8601)",
        sunday: "Domingo (EE. UU.)",
        saturday: "Sábado (Oriente Medio)",
        help: "Informes → Calendario y los resúmenes semanales lo usan como primera columna."
      },
      pip_units: {
        label: "Unidades de distancia",
        pips: "Pips (1.00010 → 1 pip)",
        points: "Puntos (1.00010 → 10 puntos)",
        help: "Cambia las tarjetas de “Pips medios SL/TP” y la columna de pips por operación."
      },
      currency: {
        label: "Divisa por defecto",
        help: "Selección inicial de divisa en la barra superior — puedes cambiarla por sesión."
      },
      saved: "Ajustes guardados.",
      saved_partial:
        "Guardado ({count} columna{plural} nueva omitida — consulta el aviso siguiente).",
      schema_banner: {
        title: "Aplica el último esquema de Supabase",
        body_some_missing:
          "Estas columnas de preferencias aún no están en tu proyecto: {columns}. Las demás preferencias se guardaron — estas se guardarán cuando apliques la migración.",
        body_all_missing:
          "El guardado falló porque Supabase aún no tiene las últimas columnas de preferencias.",
        step_open_editor: "Abre el editor SQL de Supabase.",
        step_copy: "Copia todo el archivo schema.sql (Ctrl+A, Ctrl+C).",
        step_paste: "Pégalo en el editor y haz clic en Ejecutar.",
        step_reload:
          "Refresca la caché: notify pgrst, 'reload schema';",
        step_refresh: "Refresca Genesis. Vuelve a guardar tus preferencias."
      }
    }
  }
};

export default messages;
