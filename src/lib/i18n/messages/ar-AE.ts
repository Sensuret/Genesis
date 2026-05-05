/**
 * العربية (الإمارات العربية المتحدة).
 * Trading-specific terms (long/short, P&L, drawdown, RR) stay in
 * English by industry convention. The locale renders RTL — see
 * RTL_LOCALES in src/lib/i18n/types.ts.
 */
import type { MessageTree } from "../types";

const messages: MessageTree = {
  common: {
    save: "حفظ",
    save_changes: "حفظ التغييرات",
    saving: "جارٍ الحفظ…",
    saved: "تم الحفظ",
    cancel: "إلغاء",
    reset: "إعادة تعيين",
    delete: "حذف",
    edit: "تعديل",
    close: "إغلاق",
    back: "رجوع",
    next: "التالي",
    add: "إضافة",
    confirm: "تأكيد",
    loading: "جارٍ التحميل…",
    error: "حدث خطأ.",
    retry: "إعادة المحاولة",
    yes: "نعم",
    no: "لا",
    on: "مفعّل",
    off: "متوقف",
    enabled: "مفعّل",
    disabled: "متوقف"
  },
  sidebar: {
    dashboard: "لوحة المعلومات",
    trades: "الصفقات",
    add_trade: "إضافة صفقة",
    day_view: "عرض اليوم",
    reports: "التقارير",
    streaks: "السلاسل",
    gs_insights: "تحليلات GS",
    recaps: "الملخصات",
    backtesting: "Backtesting",
    playbooks: "Playbooks",
    prop_firm: "Prop Firm",
    notebook: "الدفتر",
    numerology: "علم الأرقام",
    settings: "الإعدادات",
    sign_out: "تسجيل الخروج",
    theme: "السمة",
    your_account: "حسابك"
  },
  topbar: {
    accounts_label: "الحسابات",
    accounts_all: "كل الحسابات",
    accounts_count: "{count} محدد",
    currency_label: "العملة",
    theme_light: "فاتح",
    theme_dark: "داكن",
    theme_system: "النظام",
    profile: "الملف الشخصي",
    account_settings: "إعدادات الحساب",
    greeting_morning: "صباح الخير",
    greeting_afternoon: "مساء الخير",
    greeting_evening: "مساء الخير",
    accounts_all_count: "كل الحسابات · {count}",
    accounts_none: "لا توجد حسابات",
    accounts_count_of: "{count} من {total} محدد",
    accounts_empty_hint: "لا توجد حسابات بعد — ارفع ملف CSV للبدء.",
    accounts_trades_suffix: "· {count} صفقة",
    currency_aria: "عملة العرض، حالياً {code}",
    currency_title: "عملة العرض · {code}",
    range_label: "الفترة",
    range_all: "كل الوقت",
    range_7d: "آخر 7 أيام",
    range_30d: "آخر 30 يوم",
    range_90d: "آخر 90 يوم",
    range_ytd: "منذ بداية العام",
    range_1y: "آخر سنة",
    playbook_label: "Playbook",
    playbook_all: "كل الـ Playbooks",
    playbook_empty_hint: "لا يوجد Playbooks بعد — أنشئ واحداً من صفحة Playbooks.",
    reset_label: "إعادة تعيين",
    reset_title: "إعادة تعيين الفلاتر",
    account_label: "الحساب"
  },
  settings: {
    title: "الإعدادات",
    description: "إدارة حسابك وتفضيلاتك والخدمات المتصلة.",
    tabs: {
      account: "الحساب",
      global: "الإعدادات العامة",
      accounts: "الحسابات",
      import_history: "سجل الاستيراد",
      log_history: "سجل الأحداث",
      security: "الأمان",
      billing: "الفوترة"
    },
    global: {
      title: "المنطقة والعرض",
      timezone: {
        label: "المنطقة الزمنية",
        auto: "اكتشاف تلقائي ({timezone})",
        help: "تُستخدم لحدود التقويم، وقطع P&L اليومي، ونوافذ الملخصات. المنطقة الزمنية للوسيط (التي يطبعها MetaTrader في الطوابع الزمنية) تُضبط بشكل مستقل في الحسابات → يدوي."
      },
      locale: {
        label: "اللغة والإقليم",
        auto: "اكتشاف تلقائي (المتصفح)",
        help: "يؤثر على تنسيق الأرقام والعملات والتواريخ في كل التطبيق، وعلى لغة الواجهة."
      },
      week_start: {
        label: "يبدأ الأسبوع يوم",
        monday: "الإثنين (ISO 8601)",
        sunday: "الأحد (الولايات المتحدة)",
        saturday: "السبت (الشرق الأوسط)",
        help: "التقارير → التقويم والملخصات الأسبوعية تستخدم هذا كأول عمود."
      },
      pip_units: {
        label: "وحدات المسافة",
        pips: "Pips (1.00010 → 1 pip)",
        points: "Points (1.00010 → 10 points)",
        help: "يبدّل بطاقات “متوسط SL/TP pips” وعمود الـ pips لكل صفقة."
      },
      currency: {
        label: "العملة الافتراضية",
        help: "اختيار العملة الأولي في الشريط العلوي — يمكنك تغييرها لكل جلسة."
      },
      saved: "تم حفظ الإعدادات.",
      saved_partial: "تم الحفظ ({count} عمود جديد تم تخطيه — انظر التنبيه أدناه).",
      schema_banner: {
        title: "طبّق أحدث مخطط Supabase",
        body_some_missing:
          "أعمدة التفضيلات هذه ليست في مشروعك بعد: {columns}. تم حفظ التفضيلات الأخرى — وستُحفظ هذه عند تطبيق الترحيل.",
        body_all_missing: "فشل الحفظ لأن Supabase لا يحتوي بعد على أحدث الأعمدة.",
        step_open_editor: "افتح محرر SQL في Supabase.",
        step_copy: "انسخ ملف schema.sql بالكامل (Ctrl+A, Ctrl+C).",
        step_paste: "الصقه في المحرر واضغط Run.",
        step_reload: "حدّث الذاكرة المؤقتة: notify pgrst, 'reload schema';",
        step_refresh: "حدّث Genesis. احفظ تفضيلاتك مرة أخرى."
      }
    }
  }
};

export default messages;
