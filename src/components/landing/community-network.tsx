import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { LogoMark } from "@/components/logo";

const AVATARS = [
  { initials: "AK", hue: "bg-sky-500" },
  { initials: "MR", hue: "bg-violet-500" },
  { initials: "JL", hue: "bg-fuchsia-500" },
  { initials: "TS", hue: "bg-indigo-500" },
  { initials: "DN", hue: "bg-cyan-500" },
  { initials: "PW", hue: "bg-purple-500" },
  { initials: "RC", hue: "bg-blue-500" },
  { initials: "LM", hue: "bg-pink-500" }
] as const;

/** Positions on a circle (percent from center of 560×320 view). */
const NODES: Array<{ x: number; y: number; i: number }> = [
  { x: 50, y: 8, i: 0 },
  { x: 82, y: 18, i: 1 },
  { x: 92, y: 50, i: 2 },
  { x: 78, y: 78, i: 3 },
  { x: 50, y: 88, i: 4 },
  { x: 22, y: 78, i: 5 },
  { x: 8, y: 50, i: 6 },
  { x: 18, y: 18, i: 7 }
];

export function CommunityNetwork() {
  return (
    <section
      id="community"
      className="relative mx-auto max-w-5xl px-6 py-20 text-center lg:px-10"
    >
      <h2 className="text-balance text-3xl font-bold tracking-tight text-white md:text-4xl">
        Connect, collab, and improve
      </h2>
      <p className="mx-auto mt-4 max-w-2xl text-pretty text-base text-white/60">
        Build discipline with playbooks, share streaks and recaps, and grow with traders who journal
        the same way you do. Genesis is your hub, not another spreadsheet.
      </p>
      <Link
        href="/register"
        className="mt-8 inline-flex h-12 items-center gap-2 rounded-xl bg-brand-gradient px-8 text-base font-medium text-white shadow-brand-glow transition hover:bg-brand-gradient-hover"
      >
        Get started today <ArrowRight className="h-4 w-4" />
      </Link>

      <div className="community-network-scene relative mx-auto mt-14 aspect-[7/4] w-full max-w-3xl">
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden
        >
          {NODES.map((n) => (
            <line
              key={`line-${n.i}`}
              x1="50"
              y1="50"
              x2={n.x}
              y2={n.y}
              stroke="url(#community-line)"
              strokeWidth="0.35"
              strokeOpacity="0.55"
            />
          ))}
          <defs>
            <linearGradient id="community-line" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#a855f7" />
            </linearGradient>
          </defs>
        </svg>

        {NODES.map((n) => {
          const av = AVATARS[n.i];
          return (
            <div
              key={n.i}
              className="absolute flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white/20 text-xs font-bold text-white shadow-lg sm:h-12 sm:w-12"
              style={{ left: `${n.x}%`, top: `${n.y}%` }}
            >
              <span className={`flex h-full w-full items-center justify-center rounded-full ${av.hue}`}>
                {av.initials}
              </span>
            </div>
          );
        })}

        <div className="absolute left-1/2 top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
          <div className="community-hub flex h-24 w-24 items-center justify-center rounded-full border border-violet-400/40 bg-gradient-to-br from-indigo-950/90 via-violet-950/90 to-[#0a0e18] shadow-[0_0_48px_rgba(99,102,241,0.45)] sm:h-28 sm:w-28">
            <LogoMark className="h-14 w-auto sm:h-16" />
          </div>
          <span className="mt-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-300/80">
            Genesis network
          </span>
        </div>

        <span className="community-spark absolute left-[12%] top-[30%] h-2 w-2 rotate-45 bg-violet-500/60" />
        <span className="community-spark absolute right-[18%] top-[22%] h-1.5 w-1.5 rotate-12 bg-cyan-400/50" />
        <span className="community-spark absolute bottom-[28%] left-[28%] h-2 w-2 bg-indigo-400/40" />
        <span className="community-spark absolute bottom-[20%] right-[24%] h-2.5 w-2.5 bg-fuchsia-500/50" />
      </div>
    </section>
  );
}
