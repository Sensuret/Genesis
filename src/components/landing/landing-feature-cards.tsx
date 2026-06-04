import Link from "next/link";
import { BrokerLogoBelt } from "@/components/landing/broker-logo-belt";

const CARDS = [
  {
    title: "Automated Journaling",
    body: "Broker sync, file upload, or manual trade adds — everything flows into one journal automatically.",
    gradient: "landing-card-magenta",
    cta: { href: "/register", label: "Connect" }
  },
  {
    title: "Unlimited Accounts",
    body: "Link every account you trade. Compare performance across files, brokers, and playbooks in one hub.",
    gradient: "landing-card-blue",
    cta: null
  },
  {
    title: "Automated Statistics",
    body: "Win rate, profit factor, GS Score, streaks, and deep reports — calculated for you on every import.",
    gradient: "landing-card-magenta",
    cta: null
  }
] as const;

export function LandingFeatureCards() {
  return (
    <section className="w-full px-6 py-16 sm:px-8 lg:px-12 xl:px-16">
      <div className="mx-auto grid w-full max-w-[1440px] gap-5 lg:grid-cols-3">
        {CARDS.map((card) => (
          <div
            key={card.title}
            className={`flex min-h-[320px] flex-col rounded-2xl p-6 text-left shadow-lg ${card.gradient}`}
          >
            <h3 className="text-xl font-bold text-white">{card.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-white/85">{card.body}</p>
            <div className="mt-6 flex flex-1 flex-col justify-end gap-4">
              {card.title === "Automated Journaling" ? (
                <div className="overflow-hidden py-2">
                  <BrokerLogoBelt compact />
                </div>
              ) : card.title === "Unlimited Accounts" ? (
                <div className="rounded-xl border border-white/20 bg-white/10 p-3 text-xs text-white/90">
                  <div className="font-semibold">All Accounts</div>
                  <ul className="mt-2 space-y-1 text-white/75">
                    <li>MT5 · Funded · Demo</li>
                    <li>Exness · Pepperstone</li>
                    <li>Manual CSV imports</li>
                  </ul>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 text-center text-[10px] text-white/90">
                  <div className="rounded-lg bg-white/15 px-2 py-2">Win % · 58</div>
                  <div className="rounded-lg bg-white/15 px-2 py-2">PF · 1.86</div>
                  <div className="rounded-lg bg-white/15 px-2 py-2 col-span-2">GS Score · 82</div>
                </div>
              )}
              {card.cta ? (
                <Link
                  href={card.cta.href}
                  className="inline-flex h-10 items-center justify-center rounded-xl bg-white/20 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/30"
                >
                  {card.cta.label}
                </Link>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
