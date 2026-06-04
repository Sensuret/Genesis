/** 日本語. Trading-specific terms (long/short, P&L, drawdown, RR) stay in English. */
import type { MessageTree } from "../types";

const messages: MessageTree = {
  common: {
    save: "保存",
    save_changes: "変更を保存",
    saving: "保存中…",
    saved: "保存しました",
    cancel: "キャンセル",
    reset: "リセット",
    delete: "削除",
    edit: "編集",
    close: "閉じる",
    back: "戻る",
    next: "次へ",
    add: "追加",
    confirm: "確認",
    loading: "読み込み中…",
    error: "問題が発生しました。",
    retry: "再試行",
    yes: "はい",
    no: "いいえ",
    on: "オン",
    off: "オフ",
    enabled: "有効",
    disabled: "無効"
  },
  sidebar: {
    dashboard: "ダッシュボード",
    trades: "トレード",
    add_trade: "トレードを追加",
    day_view: "デイビュー",
    reports: "レポート",
    streaks: "連勝記録",
    gs_insights: "GS インサイト",
    recaps: "サマリー",
    backtesting: "Backtesting",
    playbooks: "Playbooks",
    prop_firm: "Prop Firm",
    notebook: "ノート",
    numerology: "数秘術",
    settings: "設定",
    sign_out: "ログアウト",
    theme: "テーマ",
    your_account: "あなたのアカウント"
  },
  topbar: {
    accounts_label: "口座",
    accounts_all: "すべての口座",
    accounts_count: "{count} 件選択",
    currency_label: "通貨",
    theme_light: "ライト",
    theme_dark: "ダーク",
    theme_system: "システム",
    profile: "プロフィール",
    account_settings: "アカウント設定",
    greeting_morning: "おはようございます",
    greeting_afternoon: "こんにちは",
    greeting_evening: "こんばんは",
    accounts_all_count: "すべての口座 · {count}",
    accounts_none: "口座なし",
    accounts_count_of: "{total} 件中 {count} 件選択",
    accounts_empty_hint: "口座がまだありません — CSV をアップロードして開始してください。",
    accounts_trades_suffix: "· {count} 件のトレード",
    currency_aria: "表示通貨、現在 {code}",
    currency_title: "表示通貨 · {code}",
    range_label: "期間",
    range_all: "全期間",
    range_7d: "直近7日間",
    range_30d: "直近30日間",
    range_90d: "直近90日間",
    range_ytd: "今年（年初来）",
    range_1y: "直近1年",
    playbook_label: "Playbook",
    playbook_all: "すべての Playbook",
    playbook_empty_hint: "Playbook がまだありません — Playbooks ページで作成してください。",
    reset_label: "リセット",
    reset_title: "フィルタをリセット",
    account_label: "口座"
  },
  settings: {
    title: "設定",
    description: "アカウント、設定、接続済みサービスを管理します。",
    tabs: {
      account: "アカウント",
      global: "全般設定",
      accounts: "口座",
      import_history: "インポート履歴",
      log_history: "ログ履歴",
      security: "セキュリティ",
      billing: "お支払い"
    },
    global: {
      title: "地域と表示",
      timezone: {
        label: "タイムゾーン",
        auto: "自動検出 ({timezone})",
        help: "カレンダー境界、日次 P&L 締め時刻、サマリーウィンドウに使用します。ファイル単位のブローカー タイムゾーン（MetaTrader がタイムスタンプに書き込むもの）は「口座 → 手動」で個別に設定します。"
      },
      locale: {
        label: "言語と地域",
        auto: "自動検出（ブラウザ）",
        help: "アプリ全体の数値・通貨・日付の書式設定、およびインターフェイスの言語に影響します。"
      },
      week_start: {
        label: "週の開始日",
        monday: "月曜日 (ISO 8601)",
        sunday: "日曜日（米国）",
        saturday: "土曜日（中東）",
        help: "「レポート → カレンダー」と週次サマリーは、これを最初の列として使用します。"
      },
      pip_units: {
        label: "距離の単位",
        pips: "Pips (1.00010 → 1 pip)",
        points: "Points (1.00010 → 10 points)",
        help: "「平均 SL/TP pips」カードと、トレード単位の pips 列を切り替えます。"
      },
      currency: {
        label: "デフォルト通貨",
        help: "トップバーの初期通貨選択 — セッション単位で切り替えられます。"
      },
      saved: "設定を保存しました。",
      saved_partial: "保存しました（{count} 個の新しいカラムをスキップ — 下のお知らせを参照）。",
      schema_banner: {
        title: "最新の Supabase スキーマを適用してください",
        body_some_missing:
          "これらの設定カラムはまだプロジェクトに存在しません: {columns}。他の設定は保存されました — マイグレーションを適用すれば、これらも保存されます。",
        body_all_missing: "Supabase に最新のカラムがないため、保存に失敗しました。",
        step_open_editor: "Supabase の SQL エディタを開きます。",
        step_copy: "schema.sql ファイル全体をコピーします (Ctrl+A, Ctrl+C)。",
        step_paste: "エディタに貼り付けて Run をクリックします。",
        step_reload: "キャッシュを更新します: notify pgrst, 'reload schema';",
        step_refresh: "Genesis を更新し、設定を再保存します。"
      }
    }
  }
};

export default messages;
