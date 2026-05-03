import Link from "next/link";
import { LogoMark, Wordmark } from "@/components/logo";
import { ArrowRight, BarChart3, Sparkles, Calculator, NotebookPen } from "lucide-react";

export default function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-bg text-fg">
      <div className="aurora absolute inset-0 -z-10" />
      <div className="bg-grid absolute inset-0 -z-10 opacity-40" />

      <header className="flex items-center justify-between px-8 py-6">
        <div className="flex items-center gap-3">
          <LogoMark />
          <Wordmark size="lg" />
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium text-fg transition hover:bg-bg-soft"
          >
            Log in
          </Link>
          <Link
            href="/register"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 text-sm font-medium text-white shadow-glow transition hover:bg-brand-400"
          >
            Get started
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-8 py-24 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-line bg-bg-soft/60 px-3 py-1 text-xs font-medium text-fg-muted">
          <Sparkles className="h-3.5 w-3.5 text-brand-300" />
          Trade analytics × numerology × astrology
        </div>
        <h1 className="text-balance bg-gradient-to-br from-fg to-brand-300 bg-clip-text text-5xl font-bold tracking-tight text-transparent md:text-7xl">
          The journal that turns trades<br /> into <Wordmark className="text-brand-300" /> moments.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg text-fg-muted">
          Import any broker file. Track behavior, psychology, sessions, P&L, commissions and spreads.
          Layer in your GS Score, lunar cycle, and personal numerology. Built for serious traders who want
          a real edge — not just a spreadsheet.
        </p>
        <div className="mt-10 flex items-center justify-center gap-3">
          <Link
            href="/register"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-brand-500 px-6 text-base font-medium text-white shadow-glow transition hover:bg-brand-400"
          >
            Start free <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/login"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-line bg-bg-soft px-6 text-base font-medium text-fg transition hover:bg-bg-elevated"
          >
            I have an account
          </Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-8 pb-24 md:grid-cols-3">
        <Feature
          icon={<BarChart3 className="h-5 w-5 text-brand-300" />}
          title="Deep analytics"
          description="Equity curve, win rate, profit factor, R:R distribution, sessions, GS Score and behavioral insights."
        />
        <Feature
          icon={<Calculator className="h-5 w-5 text-brand-300" />}
          title="Prop firm simulator"
          description="Replay your trades against any prop firm rule set. See exactly which day a challenge would fail."
        />
        <Feature
          icon={<NotebookPen className="h-5 w-5 text-brand-300" />}
          title="Numerology + astrology"
          description="Life path, destiny, Western & Chinese zodiac, partner compatibility, lunar cycle, advanced insights."
        />
      </section>
    </div>
  );
}

function Feature({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-line bg-bg-soft/70 p-6 backdrop-blur">
      <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/15">
        {icon}
      </div>
      <h3 className="mb-1 text-lg font-semibold">{title}</h3>
      <p className="text-sm text-fg-muted">{description}</p>
    </div>
  );
}
