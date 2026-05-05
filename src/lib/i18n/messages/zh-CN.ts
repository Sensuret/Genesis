/** 简体中文. Trading-specific terms stay in English where commonly used. */
import type { MessageTree } from "../types";

const messages: MessageTree = {
  common: {
    save: "保存",
    save_changes: "保存更改",
    saving: "保存中…",
    saved: "已保存",
    cancel: "取消",
    reset: "重置",
    delete: "删除",
    edit: "编辑",
    close: "关闭",
    back: "返回",
    next: "下一步",
    add: "添加",
    confirm: "确认",
    loading: "加载中…",
    error: "出错了。",
    retry: "重试",
    yes: "是",
    no: "否",
    on: "开",
    off: "关",
    enabled: "已启用",
    disabled: "已禁用"
  },
  sidebar: {
    dashboard: "仪表盘",
    trades: "交易",
    add_trade: "添加交易",
    day_view: "日视图",
    reports: "报表",
    streaks: "连胜记录",
    gs_insights: "GS 洞察",
    recaps: "回顾",
    backtesting: "Backtesting",
    playbooks: "Playbooks",
    prop_firm: "Prop Firm",
    notebook: "笔记本",
    numerology: "数字学",
    settings: "设置",
    sign_out: "退出登录"
  },
  topbar: {
    accounts_label: "账户",
    accounts_all: "全部账户",
    accounts_count: "已选 {count} 个",
    currency_label: "货币",
    theme_light: "浅色",
    theme_dark: "深色",
    theme_system: "跟随系统",
    profile: "个人资料",
    account_settings: "账户设置"
  },
  settings: {
    title: "设置",
    description: "管理您的账户、偏好和已连接的服务。",
    tabs: {
      account: "账户",
      global: "全局设置",
      accounts: "账户",
      import_history: "导入历史",
      log_history: "日志历史",
      security: "安全",
      billing: "账单"
    },
    global: {
      title: "区域与显示",
      timezone: {
        label: "时区",
        auto: "自动检测 ({timezone})",
        help: "用于日历边界、每日 P&L 截断时间和回顾窗口。每个文件的经纪商时区（MetaTrader 在时间戳中写入的）在「账户 → 手动」中独立设置。"
      },
      locale: {
        label: "语言与区域",
        auto: "自动检测（浏览器）",
        help: "影响整个应用中数字、货币和日期的格式，以及界面使用的语言。"
      },
      week_start: {
        label: "每周起始日",
        monday: "周一 (ISO 8601)",
        sunday: "周日（美国）",
        saturday: "周六（中东）",
        help: "「报表 → 日历」与每周回顾以此作为第一列。"
      },
      pip_units: {
        label: "距离单位",
        pips: "Pips (1.00010 → 1 pip)",
        points: "Points (1.00010 → 10 points)",
        help: "切换「平均 SL/TP pips」卡片以及每笔交易的 pips 列。"
      },
      currency: {
        label: "默认货币",
        help: "顶部栏中的初始货币选择 — 仍可按会话切换。"
      },
      saved: "设置已保存。",
      saved_partial: "已保存（跳过了 {count} 个新列 — 见下方提示）。",
      schema_banner: {
        title: "应用最新的 Supabase Schema",
        body_some_missing:
          "这些偏好列尚未在您的项目中：{columns}。其它偏好已保存 — 应用迁移后这些将自动保存。",
        body_all_missing: "保存失败：Supabase 尚未包含最新的列。",
        step_open_editor: "打开 Supabase SQL 编辑器。",
        step_copy: "复制整个 schema.sql 文件 (Ctrl+A, Ctrl+C)。",
        step_paste: "粘贴到编辑器并点击 Run。",
        step_reload: "刷新缓存：notify pgrst, 'reload schema';",
        step_refresh: "刷新 Genesis，然后再次保存偏好。"
      }
    }
  }
};

export default messages;
