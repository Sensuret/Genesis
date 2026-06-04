import { Wordmark } from "@/components/logo";

/** Hero dashboard mock — built from Genesis UI patterns (not external screenshots). */
export function LandingDashboardPreview() {
  return (
    <div className="landing-dashboard-preview relative">
      <div className="pointer-events-none absolute -inset-8 rounded-[2rem] bg-gradient-to-br from-indigo-600/30 via-violet-600/20 to-cyan-500/10 blur-3xl" />
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0c101c]/95 shadow-[0_24px_80px_-20px_rgba(0,0,0,0.8)] backdrop-blur-md">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <Wordmark size="sm" />
          <span className="rounded-lg bg-brand-gradient px-3 py-1 text-[11px] font-medium text-white">
            + Add Trade
          </span>
        </div>
        <div className="grid grid-cols-4 gap-2 p-4">
          {[
            { l: "Net P&L", v: "+$4.2k", c: "text-emerald-400" },
            { l: "Win %", v: "58.2%", c: "text-white" },
            { l: "Profit factor", v: "1.86", c: "text-white" },
            { l: "GS Score", v: "82", c: "text-violet-300" }
          ].map((s) => (
            <div
              key={s.l}
              className="rounded-xl border border-white/8 bg-white/[0.03] px-2 py-2"
            >
              <div className="text-[9px] text-white/45">{s.l}</div>
              <div className={`text-sm font-semibold ${s.c}`}>{s.v}</div>
            </div>
          ))}
        </div>
        <div className="mx-4 mb-4 rounded-xl border border-white/8 bg-white/[0.02] p-3">
          <div className="mb-2 text-[10px] font-medium text-white/50">Daily net cumulative P&L</div>
          <div className="flex h-28 items-end gap-1">
            {[28, 42, 38, 55, 48, 62, 58, 70, 65, 78, 72, 88, 80, 92].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t bg-gradient-to-t from-indigo-600 to-violet-500/70"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
