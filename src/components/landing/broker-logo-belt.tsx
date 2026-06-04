import Image from "next/image";
import { LANDING_BROKER_LOGOS } from "@/components/landing/broker-logos";

function LogoItem({ name, logo, wide }: (typeof LANDING_BROKER_LOGOS)[number]) {
  return (
    <div
      className="flex h-11 shrink-0 items-center justify-center px-5 sm:h-12"
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
  /** Tighter animation for feature cards. */
  compact?: boolean;
  className?: string;
};

/** Seamless scrolling broker/platform logos — no frames, duplicated track for infinite loop. */
export function BrokerLogoBelt({ compact, className }: BrokerLogoBeltProps) {
  const track = [...LANDING_BROKER_LOGOS, ...LANDING_BROKER_LOGOS];

  return (
    <div className={className}>
      <div className="broker-ticker-mask relative overflow-hidden">
        <div
          className="broker-ticker-track flex w-max items-center"
          style={compact ? { animationDuration: "36s" } : undefined}
        >
          {track.map((b, i) => (
            <LogoItem key={`${b.name}-${i}`} {...b} />
          ))}
        </div>
      </div>
    </div>
  );
}
