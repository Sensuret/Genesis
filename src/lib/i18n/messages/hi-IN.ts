/** हिन्दी (भारत). Trading-specific terms stay in English. */
import type { MessageTree } from "../types";

const messages: MessageTree = {
  common: {
    save: "सहेजें",
    save_changes: "बदलाव सहेजें",
    saving: "सहेजा जा रहा है…",
    saved: "सहेजा गया",
    cancel: "रद्द करें",
    reset: "रीसेट",
    delete: "हटाएँ",
    edit: "संपादित",
    close: "बंद करें",
    back: "पीछे",
    next: "अगला",
    add: "जोड़ें",
    confirm: "पुष्टि करें",
    loading: "लोड हो रहा है…",
    error: "कुछ गलत हो गया।",
    retry: "पुनः प्रयास करें",
    yes: "हाँ",
    no: "नहीं",
    on: "चालू",
    off: "बंद",
    enabled: "सक्षम",
    disabled: "अक्षम"
  },
  sidebar: {
    dashboard: "डैशबोर्ड",
    trades: "ट्रेड्स",
    add_trade: "ट्रेड जोड़ें",
    day_view: "दिन का दृश्य",
    reports: "रिपोर्ट्स",
    streaks: "स्ट्रीक्स",
    gs_insights: "GS अंतर्दृष्टि",
    recaps: "सारांश",
    backtesting: "Backtesting",
    playbooks: "Playbooks",
    prop_firm: "Prop Firm",
    notebook: "नोटबुक",
    numerology: "अंक विद्या",
    settings: "सेटिंग्स",
    sign_out: "साइन आउट",
    theme: "थीम",
    your_account: "आपका खाता"
  },
  topbar: {
    accounts_label: "खाते",
    accounts_all: "सभी खाते",
    accounts_count: "{count} चयनित",
    currency_label: "मुद्रा",
    theme_light: "लाइट",
    theme_dark: "डार्क",
    theme_system: "सिस्टम",
    profile: "प्रोफ़ाइल",
    account_settings: "खाता सेटिंग्स",
    greeting_morning: "सुप्रभात",
    greeting_afternoon: "नमस्ते",
    greeting_evening: "शुभ संध्या",
    accounts_all_count: "सभी खाते · {count}",
    accounts_none: "कोई खाता नहीं",
    accounts_count_of: "{total} में से {count} चयनित",
    accounts_empty_hint: "अभी कोई खाता नहीं — शुरू करने के लिए CSV अपलोड करें।",
    accounts_trades_suffix: "· {count} ट्रेड",
    currency_aria: "प्रदर्शन मुद्रा, वर्तमान {code}",
    currency_title: "प्रदर्शन मुद्रा · {code}",
    range_label: "रेंज",
    range_all: "हर समय",
    range_7d: "पिछले 7 दिन",
    range_30d: "पिछले 30 दिन",
    range_90d: "पिछले 90 दिन",
    range_ytd: "इस साल अब तक",
    range_1y: "पिछला 1 साल",
    playbook_label: "Playbook",
    playbook_all: "सभी Playbooks",
    playbook_empty_hint: "अभी कोई Playbook नहीं — Playbooks पेज पर एक बनाएँ।",
    reset_label: "रीसेट",
    reset_title: "फ़िल्टर रीसेट करें",
    account_label: "खाता"
  },
  settings: {
    title: "सेटिंग्स",
    description: "अपना खाता, प्राथमिकताएँ और कनेक्टेड सेवाएँ प्रबंधित करें।",
    tabs: {
      account: "खाता",
      global: "ग्लोबल सेटिंग्स",
      accounts: "खाते",
      import_history: "इम्पोर्ट इतिहास",
      log_history: "लॉग इतिहास",
      security: "सुरक्षा",
      billing: "बिलिंग"
    },
    global: {
      title: "क्षेत्र और प्रदर्शन",
      timezone: {
        label: "टाइमज़ोन",
        auto: "स्वतः पहचानें ({timezone})",
        help: "कैलेंडर सीमाओं, दैनिक P&L कट-ऑफ और सारांश विंडो के लिए उपयोग। प्रत्येक फ़ाइल का ब्रोकर टाइमज़ोन (जो MetaTrader टाइमस्टैम्प में लिखता है) खातों → मैन्युअल में अलग से सेट किया जाता है।"
      },
      locale: {
        label: "भाषा और लोकेल",
        auto: "स्वतः पहचानें (ब्राउज़र)",
        help: "पूरे ऐप में संख्या, मुद्रा और तिथि स्वरूपण को प्रभावित करता है, और इंटरफ़ेस की भाषा को।"
      },
      week_start: {
        label: "सप्ताह शुरू होता है",
        monday: "सोमवार (ISO 8601)",
        sunday: "रविवार (अमेरिका)",
        saturday: "शनिवार (मध्य पूर्व)",
        help: "रिपोर्ट्स → कैलेंडर और साप्ताहिक सारांश इसे पहले कॉलम के रूप में उपयोग करते हैं।"
      },
      pip_units: {
        label: "दूरी इकाइयाँ",
        pips: "Pips (1.00010 → 1 pip)",
        points: "Points (1.00010 → 10 points)",
        help: "“Avg SL/TP pips” कार्ड और प्रति-ट्रेड pips कॉलम स्विच करता है।"
      },
      currency: {
        label: "डिफ़ॉल्ट मुद्रा",
        help: "टॉप-बार में प्रारंभिक मुद्रा चयन — आप इसे प्रति-सत्र बदल सकते हैं।"
      },
      saved: "सेटिंग्स सहेजी गईं।",
      saved_partial: "सहेजा गया ({count} नया कॉलम छोड़ा गया — नीचे देखें)।",
      schema_banner: {
        title: "नवीनतम Supabase स्कीमा लागू करें",
        body_some_missing:
          "ये प्राथमिकता कॉलम अभी आपके प्रोजेक्ट में नहीं हैं: {columns}. अन्य प्राथमिकताएँ सहेजी गईं — माइग्रेशन लागू करते ही ये भी सहेज ली जाएँगी।",
        body_all_missing: "Supabase में अभी नवीनतम कॉलम न होने से सहेजना विफल रहा।",
        step_open_editor: "Supabase SQL एडिटर खोलें।",
        step_copy: "पूरी schema.sql फ़ाइल कॉपी करें (Ctrl+A, Ctrl+C)।",
        step_paste: "एडिटर में पेस्ट करें और Run दबाएँ।",
        step_reload: "कैश रिफ़्रेश करें: notify pgrst, 'reload schema';",
        step_refresh: "Genesis रिफ़्रेश करें। प्राथमिकताएँ फिर से सहेजें।"
      }
    }
  }
};

export default messages;
