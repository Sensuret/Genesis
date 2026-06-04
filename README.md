# GƎNƎSIS

A production-grade trading analytics SaaS — Tradezella-inspired with our own purple fintech polish, plus a unique Numerology + Astrology engine layered through the dashboard, recaps and streaks.

> _“Numbers are the universal language offered by the deity to humans as confirmation of the truth.”_ — St. Augustine

## ✨ Features

- **Trade journaling** — manual entry _or_ flexible CSV/XLSX import that auto-detects any broker's column names.
- **Multi-file management** — every upload is a named file, persisted per user, deletable any time.
- **Dashboard** — equity curve, win rate, profit factor, R:R distribution, GS Score radar, performance by pair / setup / mistake, daily P&L, moon-cycle widget.
- **GS Score** — our own fintech metric blending win%, profit factor, avg W/L, recovery factor, max drawdown and consistency.
- **Day View** — every trade and emotion from a single day.
- **Backtesting Dashboard** — analytics for any historical file in isolation.
- **Reports** — behavior, mistakes, sessions, pairs, day-of-week, costs (commissions + spread + account balance), calendar.
- **Recaps** — Weekly / Monthly / Quarterly / Annual recaps with moon context.
- **Streaks** — day / week / quarter / year streaks with built-in screenshot share (powered by `html-to-image`).
- **Prop Firm Calculator** — replays your real trades against any rule set (account size, daily DD%, max DD%, profit target). Tells you which day you'd pass or blow up.
- **Notebook** — embedded Notion workspace.
- **Numerology & Astrology** — life path, destiny, soul urge, personality, birthday number, lucky numbers, Western + Chinese zodiac, enemy sign, current cycle/personal year, partner compatibility, advanced city/brand/car insights, lunar forecast and combined daily reading.
- **Settings** — profile (avatar, name, DOB, currency, starting balance), email, password change.
- **Dark / light mode**, responsive, accessible, premium fintech aesthetic.

## 🧱 Tech stack

- **Next.js 14** (App Router) + **TypeScript** + **Tailwind CSS**
- **Recharts** for charts
- **Supabase** (Auth, Postgres, Storage) — RLS-secured
- **Netlify**-ready

## 🚀 Setup

```bash
git clone https://github.com/Sensuret/Genesis.git
cd Genesis
npm install
cp .env.example .env.local        # fill in your Supabase keys + Notion URL
npm run dev
```

Open <http://localhost:3000>.

### 1. Supabase project

Create a project at <https://supabase.com> (or use the existing **Genesis** project).

Get the values for `.env.local` from
<https://supabase.com/dashboard/project/_/settings/api>:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxx
SUPABASE_SERVICE_ROLE_KEY=sb_secret_xxx          # optional, for admin scripts
NEXT_PUBLIC_NOTION_EMBED_URL=https://www.notion.so/...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 2. Run the schema

Open the SQL editor at
<https://supabase.com/dashboard/project/_/sql/new> and paste **all of**
[`supabase/schema.sql`](supabase/schema.sql), then click **Run**.

This creates:
- `profiles`, `trade_files`, `trades`, `setups`, `mistakes`, `emotions`,
  `numerology_profiles`, `numerology_others`
- Row-level-security policies (each user can only read/write their own rows)
- Triggers for `updated_at` and auto-creating a `profiles` row on signup
- Storage buckets `avatars` (public read) and `screenshots` (user-scoped)

The schema is **idempotent** — safe to re-run.

### 3. (Optional) Supabase CLI

```bash
supabase login
supabase init
supabase link --project-ref <project-ref>
supabase db push
```

## 🗂 Project structure

```
src/
  app/
    (app)/              # authenticated app shell with sidebar
      add-trade/        # CSV/XLSX import + manual entry
      dashboard/        # main analytics hub
      day-view/
      trades/           # all trades + per-file filtering
      backtesting/
      reports/          # deep insights tabs
      recap/{weekly,monthly,quarterly,annual}/
      streaks/          # screenshot share
      prop-firm/        # rule simulator
      notebook/         # Notion embed
      numerology/       # 5 tabs: My, Others, Combined, Lunar, Insights
      settings/
    login/  register/   # public auth
    page.tsx            # landing
  components/
    ui/                 # Card, Button, Input, Stat, Badge, Empty
    charts/             # equity curve, R distribution, GS radar, perf bars
    sidebar.tsx
    moon-widget.tsx
    logo.tsx            # mirrored-E wordmark + GS logo image
    recap.tsx           # shared recap component for all 4 periods
  lib/
    analytics/          # GS Score, equity curve, streaks, perf-by, R distribution
    parser/             # flexible CSV/XLSX parser with auto-mapping
    propfirm/           # rule simulator
    numerology/         # life path, destiny, compatibility, advanced insights
    astrology/          # zodiac profiles, moon phases, lunar forecast
    supabase/           # client + server + middleware helpers
    hooks/              # useTrades
supabase/
  schema.sql            # full DDL with RLS + triggers + buckets
```

## 🌐 Deploying to Netlify

1. Push to GitHub.
2. New Netlify site from this repo.
3. Add the env vars from `.env.local` to **Site settings → Environment variables**.
4. Build command: `npm run build`. Publish dir: `.next`. The `@netlify/plugin-nextjs` plugin in `netlify.toml` handles SSR + middleware.

## 🛠 Scripts

```bash
npm run dev         # dev server
npm run build       # production build
npm run start       # serve production build
npm run lint        # ESLint
npm run typecheck   # TypeScript only
```

## 🧠 Notes on the engines

- **GS Score** lives in `src/lib/analytics`. It blends six normalized factors
  (win%, profit factor, avg W/L, recovery factor, max drawdown, consistency)
  into a single 0–100 fintech score.
- **Trade parser** auto-maps any broker's columns by matching synonym lists
  (`pair → ["pair","symbol","ticker","instrument",...]`, etc.). Anything we can
  detect is shown to the user before saving.
- **Numerology** uses Pythagorean gematria, preserves master numbers (11, 22,
  33), and ships a compatibility scorer + per-life-path advanced insights.
- **Astrology** computes Western + Chinese zodiac, opposite signs, and the moon
  phase via the synodic month constant (29.530588853 days, referenced to the
  2000-01-06 18:14 UTC new moon) — accurate to ±0.5 days for lunar-cycle
  trading folklore.
- **Prop firm simulator** replays trades sequentially, enforcing daily DD,
  max DD (static or trailing), profit targets, min trading days and weekend
  hold rules, and returns the day a challenge would pass or blow up.

---

Built with intention. Trade like Genesis.
