import { BrokerLogoBelt } from "@/components/landing/broker-logo-belt";

/** Broker / import belt — logo-only, scrolls right to left. */
export function BrokerTicker() {
  return (
    <section
      id="brokers"
      className="border-y border-white/10 bg-[#080c14]/80 py-8 scroll-mt-24"
      aria-label="Supported brokers and imports"
    >
      <div className="w-full px-6 sm:px-8 lg:px-12 xl:px-16">
        <p className="mb-5 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">
          More interactive broker exports
        </p>
      </div>
      <BrokerLogoBelt />
      <p className="mt-4 text-center text-xs text-white/40">
        MT4 · MT5 · Interactive Brokers · HFM · Exness · Pepperstone · IC Markets · XM · JustMarkets
      </p>
    </section>
  );
}
