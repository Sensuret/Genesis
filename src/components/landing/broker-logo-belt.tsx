import Image from "next/image";
import { LANDING_BROKER_LOGOS } from "@/components/landing/broker-logos";

function LogoItem({ name, logo, wide }: (typeof LANDING_BROKER_LOGOS)[number]) {
  return (
    <div
      className="broker-ticker-item flex h-11 shrink-0 items-center justify-center px-6 sm:h-12"
      title={name}
    >
      <Image
        src={logo}
        alt={name}
        width={wide ? 140 : 72}
        height={44}
        className={
          wide
            ? "h-8 w-auto max-w-[8.5rem] object-contain opacity-95 sm:h-9 sm:max-w-[9.5rem]"
            : "h-9 w-auto max-w-[4.5rem] object-contain opacity-95 sm:h-10 sm:max-w-[5rem]"
        }
      />
    </div>
  );
}

type BrokerLogoBeltProps = {
  compact?: boolean;
  className?: string;
};

/** Seamless infinite broker belt — tripled track, no frames. */
export function BrokerLogoBelt({ compact, className }: BrokerLogoBeltProps) {
  const track = [
    ...LANDING_BROKER_LOGOS,
    ...LANDING_BROKER_LOGOS,
    ...LANDING_BROKER_LOGOS
  ];

  return (
    <div className={className}>
      <div className="broker-ticker-mask relative overflow-hidden">
        <div
          className="broker-ticker-track flex w-max items-center will-change-transform"
          style={compact ? { animationDuration: "40s" } : { animationDuration: "55s" }}
        >
          {track.map((b, i) => (
            <LogoItem key={`${b.name}-${i}`} {...b} />
          ))}
        </div>
      </div>
    </div>
  );
}
