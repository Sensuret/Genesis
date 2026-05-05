/** Português (Brasil). */
import type { MessageTree } from "../types";

const messages: MessageTree = {
  common: {
    save: "Salvar",
    save_changes: "Salvar alterações",
    saving: "Salvando…",
    saved: "Salvo",
    cancel: "Cancelar",
    reset: "Redefinir",
    delete: "Excluir",
    edit: "Editar",
    close: "Fechar",
    back: "Voltar",
    next: "Próximo",
    add: "Adicionar",
    confirm: "Confirmar",
    loading: "Carregando…",
    error: "Algo deu errado.",
    retry: "Tentar novamente",
    yes: "Sim",
    no: "Não",
    on: "Ligado",
    off: "Desligado",
    enabled: "Ativado",
    disabled: "Desativado"
  },
  sidebar: {
    dashboard: "Painel",
    trades: "Operações",
    add_trade: "Adicionar operação",
    day_view: "Visão do dia",
    reports: "Relatórios",
    streaks: "Sequências",
    gs_insights: "Análises GS",
    recaps: "Resumos",
    backtesting: "Backtesting",
    playbooks: "Playbooks",
    prop_firm: "Prop Firm",
    notebook: "Caderno",
    numerology: "Numerologia",
    settings: "Configurações",
    sign_out: "Sair"
  },
  topbar: {
    accounts_label: "Contas",
    accounts_all: "Todas as contas",
    accounts_count: "{count} selecionada(s)",
    currency_label: "Moeda",
    theme_light: "Claro",
    theme_dark: "Escuro",
    theme_system: "Sistema",
    profile: "Perfil",
    account_settings: "Configurações da conta"
  },
  settings: {
    title: "Configurações",
    description: "Gerencie sua conta, preferências e serviços conectados.",
    tabs: {
      account: "Conta",
      global: "Configurações globais",
      accounts: "Contas",
      import_history: "Histórico de importações",
      log_history: "Histórico de eventos",
      security: "Segurança",
      billing: "Cobrança"
    },
    global: {
      title: "Região e exibição",
      timezone: {
        label: "Fuso horário",
        auto: "Detectar automaticamente ({timezone})",
        help: "Usado para limites do calendário, cortes diários de P&L e janelas dos resumos. O fuso horário da corretora (o que o MetaTrader imprime nos timestamps) é configurado separadamente em Contas → Manual."
      },
      locale: {
        label: "Idioma e localidade",
        auto: "Detectar automaticamente (navegador)",
        help: "Afeta a formatação de números, moedas e datas em todo o app, e o idioma da interface."
      },
      week_start: {
        label: "A semana começa em",
        monday: "Segunda (ISO 8601)",
        sunday: "Domingo (EUA)",
        saturday: "Sábado (Oriente Médio)",
        help: "Relatórios → Calendário e resumos semanais usam isso como primeira coluna."
      },
      pip_units: {
        label: "Unidades de distância",
        pips: "Pips (1,00010 → 1 pip)",
        points: "Pontos (1,00010 → 10 pontos)",
        help: "Alterna os cartões de “Pips médios SL/TP” e a coluna de pips por operação."
      },
      currency: {
        label: "Moeda padrão",
        help: "Seleção inicial de moeda na barra superior — você pode trocar por sessão."
      },
      saved: "Configurações salvas.",
      saved_partial:
        "Salvo ({count} coluna{plural} nova(s) ignorada(s) — veja o aviso abaixo).",
      schema_banner: {
        title: "Aplique o schema mais recente do Supabase",
        body_some_missing:
          "Estas colunas de preferências ainda não estão no seu projeto: {columns}. As outras preferências foram salvas — estas serão salvas quando você aplicar a migração.",
        body_all_missing:
          "A gravação falhou porque o Supabase ainda não tem as colunas mais recentes.",
        step_open_editor: "Abra o editor SQL do Supabase.",
        step_copy: "Copie todo o arquivo schema.sql (Ctrl+A, Ctrl+C).",
        step_paste: "Cole no editor e clique em Run.",
        step_reload: "Atualize o cache: notify pgrst, 'reload schema';",
        step_refresh: "Atualize o Genesis. Salve suas preferências novamente."
      }
    }
  }
};

export default messages;
