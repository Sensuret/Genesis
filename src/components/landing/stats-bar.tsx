const STATS = [
  { value: "50+", label: "Advanced reports" },
  { value: "Unlimited", label: "Playbooks & accounts" },
  { value: "4", label: "Themes built in" },
  { value: "GS", label: "Score & edge radar" }
] as const;

export function LandingStatsBar() {
  return (
    <div className="mx-auto grid max-w-5xl grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 md:grid-cols-4">
      {STATS.map((s) => (
        <div
          key={s.label}
          className="flex flex-col items-center justify-center bg-[#0a0e18]/90 px-4 py-6 text-center backdrop-blur-sm"
        >
          <div className="text-2xl font-bold text-white md:text-3xl">{s.value}</div>
          <div className="mt-1 text-xs text-white/50">{s.label}</div>
        </div>
      ))}
    </div>
  );
}
