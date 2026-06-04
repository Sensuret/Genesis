import Link from "next/link";
import { BrandLockup, Wordmark } from "@/components/logo";
import { BrokerTicker } from "@/components/landing/broker-ticker";
import { LandingFeatureCards } from "@/components/landing/landing-feature-cards";
import { CommunityNetwork } from "@/components/landing/community-network";
import { LandingDashboardPreview } from "@/components/landing/dashboard-preview";
import { LandingStatsBar } from "@/components/landing/stats-bar";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Calculator,
  GraduationCap,
  LineChart,
  NotebookPen,
  Sparkles,
  Users,
  UsersRound
} from "lucide-react";

const NAV = [
  { href: "#features", label: "Features" },
  { href: "#school", label: "GS School" },
  { href: "#analytics", label: "Analytics" },
  { href: "#community", label: "Community" }
] as const;

/** Full-bleed horizontal padding; content blocks use LANDING_INNER for alignment. */
const LANDING_EDGE = "w-full px-6 sm:px-8 lg:px-12 xl:px-16";
const LANDING_INNER = "mx-auto w-full max-w-[1440px]";

export default function Landing() {
  return (
    <div className="landing-page relative min-h-screen overflow-x-hidden">
      <div className="aurora pointer-events-none absolute inset-0 -z-10 opacity-90" />
      <div className="bg-grid pointer-events-none absolute inset-0 -z-10 opacity-25" />
      <div className="landing-glow-hero pointer-events-none absolute inset-x-0 top-0 -z-10 h-[min(90vh,900px)]" />

      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#060810]/80 backdrop-blur-md">
        <div className={`${LANDING_EDGE} flex items-center justify-between gap-4 py-4`}>
          <BrandLockup layout="row" wordmarkSize="md" markClassName="h-9" />
          <nav className="hidden flex-1 items-center justify-center gap-6 md:flex">
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-sm text-white/65 transition hover:text-white"
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <Link
              href="/login"
              className="hidden h-10 items-center rounded-xl px-4 text-sm font-medium text-white/80 sm:inline-flex hover:bg-white/5"
            >
              Log in
            </Link>
            <Link
              href="/register"
              className="inline-flex h-10 items-center justify-center rounded-xl bg-brand-gradient px-4 text-sm font-medium text-white shadow-brand-glow transition hover:bg-brand-gradient-hover"
            >
              Get started free
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className={`${LANDING_EDGE} pb-12 pt-12 lg:pt-20`}>
        <div className={`${LANDING_INNER} grid items-center gap-12 lg:grid-cols-2 lg:gap-16`}>
        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-white/70">
            <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
            All-in-one trading intelligence
          </div>
          <h1 className="text-balance text-4xl font-bold leading-[1.08] tracking-tight text-white md:text-5xl lg:text-[3.25rem]">
            Trade with clarity.
            <br />
            <span className="text-brand-gradient">Grow with confidence.</span>
          </h1>
          <p className="mt-5 max-w-xl text-pretty text-lg leading-relaxed text-white/60">
            Journal every trade, score playbooks against linked accounts, run prop-firm simulations,
            and layer GS Score with lunar cycles and numerology. One hub for serious traders.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/register"
              className="inline-flex h-12 items-center gap-2 rounded-xl bg-brand-gradient px-6 text-base font-medium text-white shadow-brand-glow transition hover:bg-brand-gradient-hover"
            >
              Start free <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#features"
              className="inline-flex h-12 items-center rounded-xl border border-white/15 bg-white/5 px-6 text-base font-medium text-white transition hover:border-white/25 hover:bg-white/10"
            >
              See features
            </a>
          </div>
          <p className="mt-8 text-xs text-white/40">
            50+ reports · Unlimited playbooks · CSV & XLSX imports
          </p>
        </div>
        <LandingDashboardPreview />
        </div>
      </section>

      <div className={`${LANDING_EDGE} pb-16`}>
        <div className={LANDING_INNER}>
          <LandingStatsBar />
        </div>
      </div>

      <BrokerTicker />

      <LandingFeatureCards />

      {/* Why Genesis */}
      <section className={`relative ${LANDING_EDGE} py-20`}>
        <div className="pointer-events-none absolute inset-0 flex justify-center">
          <div className="h-64 w-[min(100%,720px)] rounded-full bg-violet-600/20 blur-[100px]" />
        </div>
        <div className={`relative ${LANDING_INNER} text-center`}>
          <h2 className="flex flex-wrap items-baseline justify-center gap-x-2 text-2xl font-bold text-white md:text-3xl">
            Why traders choose <Wordmark size="lg" className="inline-flex" />
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-white/55">
            Measure more than profit. Consistency compounds when you can see behavior, not just P&L.
          </p>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <MetricCard value="100K+" label="Trades analyzed" />
            <MetricCard value="∞" label="Playbooks" />
            <MetricCard
              value="✦"
              label="Numerology & astrology"
              note="Linked to your trades and profile"
            />
            <MetricCard value="◈" label="Patterns & hedge recognition" />
            <MetricCard value="◎" label="Resolutions & recaps" />
          </div>
        </div>
      </section>

      {/* Feature rows */}
      <section id="features" className={`${LANDING_EDGE} py-8`}>
        <div className={`${LANDING_INNER} space-y-20`}>
        <FeatureRow
          title="Measure more than profit."
          body="Equity curve, win rate, profit factor, R:R distribution, sessions, and GS Score radar in one dashboard."
          visual={<MiniChartPreview />}
          reverse={false}
        />
        <FeatureRow
          title="Consistency compounds."
          body="Playbooks tie to your imported accounts. Score rule adherence, time windows, and sessions on real trades."
          visual={<PlaybookPreview />}
          reverse
        />
        <FeatureRow
          title="Streak intelligence."
          body="Day and trade streaks, shareable screenshots, and recaps that show when you are actually improving."
          visual={<StreakPreview />}
          reverse={false}
        />
        </div>
      </section>

      {/* GS School + Mentor */}
      <section id="school" className={`${LANDING_EDGE} py-16`}>
        <div className={LANDING_INNER}>
        <h2 className="mb-2 text-center text-2xl font-bold text-white">Learn and level up</h2>
        <p className="mb-10 text-center text-white/55">Education and feedback built into the platform.</p>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="landing-card-magenta rounded-2xl p-8 text-left">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white/15">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-white">GS School</h3>
            <p className="mt-3 text-sm leading-relaxed text-white/85">
              Structured lessons on risk, journaling, playbooks, and psychology. Master the habits
              behind funded-account passes, not just entries and exits.
            </p>
            <span className="mt-6 inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white">
              Coming in Wave 6
            </span>
          </div>
          <div className="landing-card-blue rounded-2xl p-8 text-left">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white/15">
              <UsersRound className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-white">Mentor mode</h3>
            <p className="mt-3 text-sm leading-relaxed text-white/85">
              Share trades with a mentor for feedback, compare execution to your playbooks, and
              close the loop between review and the next session.
            </p>
            <span className="mt-6 inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white">
              Coming in Wave 6
            </span>
          </div>
        </div>
        </div>
      </section>

      {/* Analytics grid */}
      <section id="analytics" className={`${LANDING_EDGE} py-12`}>
        <div className={LANDING_INNER}>
        <h2 className="mb-8 text-center text-2xl font-bold text-white">Everything in one hub</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Feature
            icon={<LineChart className="h-5 w-5 text-cyan-400" />}
            title="Automated journaling"
            description="CSV/XLSX from any broker, unlimited accounts, equity curve, and session breakdowns."
          />
          <Feature
            icon={<BookOpen className="h-5 w-5 text-violet-400" />}
            title="Playbooks"
            description="Link accounts, define rules, and score adherence on every trade."
          />
          <Feature
            icon={<Calculator className="h-5 w-5 text-cyan-400" />}
            title="Prop firm simulator"
            description="Replay trades against daily DD, max DD, and profit targets."
          />
          <Feature
            icon={<BarChart3 className="h-5 w-5 text-violet-400" />}
            title="Deep reports"
            description="Risk, lunar performance, calendar views, and filterable deep stats."
          />
          <Feature
            icon={<NotebookPen className="h-5 w-5 text-cyan-400" />}
            title="Numerology & astrology"
            description="Life path, zodiac, compatibility, and lunar forecast tied to your profile."
          />
          <Feature
            icon={<Users className="h-5 w-5 text-violet-400" />}
            title="Notebook & recaps"
            description="Resolutions, 3D cards, weekly recaps, and shareable screenshots."
          />
        </div>
        </div>
      </section>

      <CommunityNetwork />

      {/* How it works */}
      <section className={`${LANDING_EDGE} py-20`}>
        <div className={`${LANDING_INNER} max-w-3xl`}>
        <h2 className="flex flex-wrap items-baseline justify-center gap-x-2 text-center text-2xl font-bold text-white">
          How <Wordmark size="lg" className="inline-flex" /> works
        </h2>
        <ol className="relative mt-12 space-y-10 pl-8">
          <div className="landing-step-line absolute bottom-4 left-[15px] top-4" aria-hidden />
          <Step
            n={1}
            title="Import your history"
            body="MT4, MT5, CSV, or XLSX. Tag accounts and let your journal build automatically."
          />
          <Step n={2} title="Define your edge" body="Playbooks, setups, and optional birth profile for numerology layers." />
          <Step n={3} title="Review with clarity" body="Dashboard, reports, streaks, and GS Score show what is working." />
          <Step n={4} title="Scale with confidence" body="Prop sim, recaps, and GS School (soon) keep you accountable." />
        </ol>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-white/10 bg-white/[0.02] py-20">
        <div className={`${LANDING_EDGE} text-center`}>
          <div className={`${LANDING_INNER} mx-auto max-w-2xl`}>
          <h2 className="text-3xl font-bold text-white">Your edge is already there.</h2>
          <p className="mt-3 flex flex-wrap items-baseline justify-center gap-x-2 text-lg text-brand-gradient">
            <Wordmark size="md" className="inline-flex text-brand-gradient" /> helps you see it.
          </p>
          <p className="mt-4 text-white/55">Journal. Analyze. Evolve.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/register"
              className="inline-flex h-12 items-center gap-2 rounded-xl bg-brand-gradient px-8 text-base font-medium text-white shadow-brand-glow hover:bg-brand-gradient-hover"
            >
              Start free <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex h-12 items-center rounded-xl border border-white/15 px-8 text-base font-medium text-white hover:bg-white/5"
            >
              Log in
            </Link>
          </div>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}

const FOOTER_PRODUCT_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#school", label: "GS School" },
  { href: "#analytics", label: "Analytics" },
  { href: "#community", label: "Community" },
  { href: "#brokers", label: "Supported Brokers" }
] as const;

const FOOTER_SOLUTION_LINKS = [
  { href: "#features", label: "Journaling & reports" },
  { href: "#features", label: "Playbooks" },
  { href: "#analytics", label: "Prop firm simulator" },
  { href: "#analytics", label: "Numerology & astrology" }
] as const;

const FOOTER_LEGAL_LINKS = [
  { href: "mailto:support@genesis.app", label: "Contact Us" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms & Conditions" }
] as const;

function LandingFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#050810]">
      <div className={`${LANDING_EDGE} py-14 lg:py-16`}>
        <div className="flex w-full flex-col gap-12 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-md shrink-0">
            <BrandLockup
              layout="stack"
              wordmarkSize="md"
              markClassName="h-10"
              className="items-start"
            />
            <p className="mt-5 text-[11px] leading-relaxed text-white/40">
              Trading foreign exchange, CFDs, and other leveraged products carries a high level of risk
              and may not be suitable for all investors. Past performance is not indicative of future
              results.{" "}
              <Wordmark size="sm" className="wordmark-inline-muted inline-flex align-baseline" /> is an analytics
              and journaling tool — not financial advice.
            </p>
            <p className="mt-4 text-[10px] text-white/30">
              © {new Date().getFullYear()}{" "}
              <Wordmark size="sm" className="inline-flex align-baseline" />. All rights reserved.
            </p>
          </div>

          <div className="flex w-full flex-wrap gap-10 sm:gap-14 lg:ml-auto lg:w-auto lg:justify-end xl:gap-20">
            <div>
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-white/50">
                Product
              </h3>
              <ul className="space-y-2.5">
                {FOOTER_PRODUCT_LINKS.map((item) => (
                  <li key={item.label}>
                    <a href={item.href} className="text-sm text-white/65 transition hover:text-white">
                      {item.label}
                    </a>
                  </li>
                ))}
                <li>
                  <Link href="/register" className="text-sm text-white/65 transition hover:text-white">
                    Pricing
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-white/50">
                Solutions
              </h3>
              <ul className="space-y-2.5">
                {FOOTER_SOLUTION_LINKS.map((item) => (
                  <li key={item.label}>
                    <a href={item.href} className="text-sm text-white/65 transition hover:text-white">
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
              <h3 className="mb-4 mt-8 text-xs font-semibold uppercase tracking-wider text-white/50">
                Account
              </h3>
              <ul className="space-y-2.5">
                <li>
                  <Link href="/login" className="text-sm text-white/65 transition hover:text-white">
                    Log In
                  </Link>
                </li>
                <li>
                  <Link href="/register" className="text-sm text-white/65 transition hover:text-white">
                    Get Started Free
                  </Link>
                </li>
              </ul>
            </div>

            <div className="lg:text-right">
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-white/50">
                Legal
              </h3>
              <ul className="space-y-2.5">
                {FOOTER_LEGAL_LINKS.map((item) => (
                  <li key={item.label}>
                    {item.href.startsWith("mailto:") ? (
                      <a href={item.href} className="text-sm text-white/65 transition hover:text-white">
                        {item.label}
                      </a>
                    ) : (
                      <Link href={item.href} className="text-sm text-white/65 transition hover:text-white">
                        {item.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

function MetricCard({
  value,
  label,
  note
}: {
  value: string;
  label: string;
  note?: string;
}) {
  return (
    <div className="landing-glass rounded-2xl px-4 py-6">
      <div className="text-3xl font-bold text-white">{value}</div>
      <div className="mt-1 text-sm text-white/55">{label}</div>
      {note ? <div className="mt-2 text-[10px] text-white/35">{note}</div> : null}
    </div>
  );
}

function FeatureRow({
  title,
  body,
  visual,
  reverse
}: {
  title: string;
  body: string;
  visual: React.ReactNode;
  reverse?: boolean;
}) {
  return (
    <div
      className={`grid items-center gap-10 lg:grid-cols-2 ${reverse ? "lg:[&>div:first-child]:order-2" : ""}`}
    >
      <div>
        <h3 className="text-2xl font-bold text-white md:text-3xl">{title}</h3>
        <p className="mt-4 text-white/60">{body}</p>
      </div>
      <div className="relative">{visual}</div>
    </div>
  );
}

function MiniChartPreview() {
  return (
    <div className="landing-glass overflow-hidden rounded-2xl p-4">
      <div className="mb-3 text-xs text-white/45">Net daily P&L</div>
      <div className="flex h-36 items-end gap-1">
        {[40, 55, 45, 60, 52, 70, 65, 80, 75, 90].map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-t bg-gradient-to-t from-cyan-600/80 to-violet-500/60"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    </div>
  );
}

function PlaybookPreview() {
  return (
    <div className="landing-glass rounded-2xl p-4">
      <div className="grid grid-cols-2 gap-2">
        {["London open", "NY continuation", "Asia range"].map((n) => (
          <div key={n} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <div className="text-sm font-medium text-white">{n}</div>
            <div className="mt-1 text-[10px] text-white/45">Win rate · P&L · Linked account</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StreakPreview() {
  return (
    <div className="landing-glass rounded-2xl p-4">
      {[
        { d: "3 day win", v: "+$1,240" },
        { d: "2 day win", v: "+$890" },
        { d: "1 day win", v: "+$420" }
      ].map((r) => (
        <div
          key={r.d}
          className="mb-2 flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 last:mb-0"
        >
          <span className="text-sm font-medium text-emerald-300">{r.d}</span>
          <span className="text-sm font-semibold text-white">{r.v}</span>
        </div>
      ))}
    </div>
  );
}

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <li className="relative">
      <span className="absolute -left-8 flex h-8 w-8 items-center justify-center rounded-full bg-brand-gradient text-sm font-bold text-white">
        {n}
      </span>
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <p className="mt-1 text-sm text-white/55">{body}</p>
    </li>
  );
}

function Feature({
  icon,
  title,
  description
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="landing-glass rounded-2xl p-6 transition hover:border-violet-400/30">
      <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/5">
        {icon}
      </div>
      <h3 className="mb-1 text-lg font-semibold text-white">{title}</h3>
      <p className="text-sm leading-relaxed text-white/55">{description}</p>
    </div>
  );
}
