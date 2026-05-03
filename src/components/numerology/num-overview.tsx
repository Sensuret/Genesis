"use client";

import { useMemo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty } from "@/components/ui/empty";
import {
  compatibility,
  CHINESE_TRINE,
  type ChineseSign,
  type NumerologySnapshot
} from "@/lib/numerology";
import { cn } from "@/lib/utils";
import type { CombinedProfile } from "@/lib/numerology/filters";

const PIE_COLORS = [
  "#a866ff",
  "#7b3cff",
  "#5b9eff",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
  "#10b981",
  "#0ea5e9",
  "#8b5cf6",
  "#eab308",
  "#14b8a6"
];

function frequency<T extends string | number>(arr: T[]): { key: T; count: number }[] {
  const map = new Map<T, number>();
  for (const v of arr) map.set(v, (map.get(v) ?? 0) + 1);
  return [...map.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count);
}

export function NumOverview({
  rows,
  selfSnap,
  onSelectProfile
}: {
  rows: CombinedProfile[];
  selfSnap: NumerologySnapshot | null;
  onSelectProfile?: (rowId: string) => void;
}) {
  // Drop *self* from charts so distributions reflect "your network", not you+them.
  const network = useMemo(() => rows.filter((r) => r.source === "other"), [rows]);

  const ranked = useMemo(() => {
    if (!selfSnap) return [] as Array<{ profile: CombinedProfile; score: number }>;
    return network
      .map((p) => ({ profile: p, score: compatibility(selfSnap, p.snap).overall }))
      .sort((a, b) => b.score - a.score);
  }, [network, selfSnap]);

  if (network.length === 0) {
    return (
      <Empty
        title="No people in scope"
        description="Add people on Calculate For Others — or relax the filters above — to see distributions, rankings and the compatibility heat-grid."
      />
    );
  }

  const top3 = ranked.slice(0, 3);
  const bottom3 = [...ranked].slice(-3).reverse();

  const westernData = frequency(network.map((p) => p.snap.western));
  const chineseData = frequency(network.map((p) => p.snap.chinese));
  const lifePathData = frequency(network.map((p) => p.snap.lifePath));

  const trine = selfSnap ? CHINESE_TRINE[selfSnap.chinese] ?? [] : [];
  const enemy = selfSnap?.enemyChinese;

  return (
    <div className="space-y-4">
      {/* Top / bottom cards */}
      {selfSnap && (
        <div className="grid gap-3 md:grid-cols-2">
          <Card className="border-success/30 bg-success/5">
            <CardHeader>
              <CardTitle>Inner circle (top compatibility)</CardTitle>
            </CardHeader>
            <CardBody className="space-y-2 text-sm">
              {top3.length === 0 ? (
                <div className="text-fg-muted">No data yet.</div>
              ) : (
                top3.map(({ profile, score }) => (
                  <button
                    key={profile.rowId}
                    type="button"
                    onClick={() => onSelectProfile?.(profile.rowId)}
                    disabled={!onSelectProfile || profile.source !== "other"}
                    className="flex w-full items-center justify-between rounded-lg border border-success/20 bg-success/10 px-3 py-2 text-left transition enabled:hover:border-success/50 enabled:hover:bg-success/20 disabled:cursor-default"
                  >
                    <div>
                      <div className="font-medium text-fg">
                        {profile.fullName}{" "}
                        <span className="ml-1 font-mono text-[10px] text-fg-subtle">{profile.numId}</span>
                      </div>
                      <div className="text-[11px] text-fg-muted">
                        {profile.relationship} · {profile.snap.western} · {profile.snap.chinese}
                        {trine.includes(profile.snap.chinese) && (
                          <span className="ml-1 rounded bg-success/30 px-1 text-[10px] text-success">trine</span>
                        )}
                      </div>
                    </div>
                    <div className="text-lg font-semibold text-success">{score}/100</div>
                  </button>
                ))
              )}
            </CardBody>
          </Card>

          <Card className="border-danger/30 bg-danger/5">
            <CardHeader>
              <CardTitle>Watch out (lowest compatibility)</CardTitle>
            </CardHeader>
            <CardBody className="space-y-2 text-sm">
              {bottom3.length === 0 ? (
                <div className="text-fg-muted">No data yet.</div>
              ) : (
                bottom3.map(({ profile, score }) => (
                  <button
                    key={profile.rowId}
                    type="button"
                    onClick={() => onSelectProfile?.(profile.rowId)}
                    disabled={!onSelectProfile || profile.source !== "other"}
                    className="flex w-full items-center justify-between rounded-lg border border-danger/20 bg-danger/10 px-3 py-2 text-left transition enabled:hover:border-danger/50 enabled:hover:bg-danger/20 disabled:cursor-default"
                  >
                    <div>
                      <div className="font-medium text-fg">
                        {profile.fullName}{" "}
                        <span className="ml-1 font-mono text-[10px] text-fg-subtle">{profile.numId}</span>
                      </div>
                      <div className="text-[11px] text-fg-muted">
                        {profile.relationship} · {profile.snap.western} · {profile.snap.chinese}
                        {profile.snap.chinese === enemy && (
                          <span className="ml-1 rounded bg-danger/30 px-1 text-[10px] text-danger">enemy sign</span>
                        )}
                      </div>
                    </div>
                    <div className="text-lg font-semibold text-danger">{score}/100</div>
                  </button>
                ))
              )}
            </CardBody>
          </Card>
        </div>
      )}

      {/* Pies */}
      <div className="grid gap-3 lg:grid-cols-3">
        <DistributionPie title="Western zodiac" data={westernData} />
        <DistributionPie title="Chinese zodiac" data={chineseData} />
        <DistributionPie title="Life Path" data={lifePathData} />
      </div>

      {/* Heat grid */}
      {selfSnap && ranked.length > 0 && (
        <CompatibilityHeatGrid
          ranked={ranked}
          trine={trine}
          enemy={enemy}
          onSelect={onSelectProfile}
        />
      )}

      {/* Pair groups: who matches with whom */}
      {network.length >= 2 && (
        <CompatibilityGroupsCard network={network} onSelect={onSelectProfile} />
      )}
    </div>
  );
}

function DistributionPie<T extends string | number>({
  title,
  data
}: {
  title: string;
  data: { key: T; count: number }[];
}) {
  const total = data.reduce((s, d) => s + d.count, 0);
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title} distribution</CardTitle>
      </CardHeader>
      <CardBody>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="count"
                nameKey="key"
                cx="50%"
                cy="50%"
                innerRadius={42}
                outerRadius={80}
                paddingAngle={2}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "rgb(15 14 26 / 0.95)",
                  border: "1px solid rgb(168 102 255 / 0.4)",
                  borderRadius: 12,
                  color: "white",
                  fontSize: 12
                }}
                formatter={(value: number, name) => [
                  `${value} (${total ? Math.round((value / total) * 100) : 0}%)`,
                  String(name)
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-fg-muted">
          {data.map((d, i) => (
            <div key={String(d.key)} className="flex items-center gap-1.5">
              <span
                className="inline-block h-2 w-2 rounded-sm"
                style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
              />
              <span className="truncate">{String(d.key)}</span>
              <span className="ml-auto tabular-nums text-fg-subtle">{d.count}</span>
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}

function CompatibilityHeatGrid({
  ranked,
  trine,
  enemy,
  onSelect
}: {
  ranked: Array<{ profile: CombinedProfile; score: number }>;
  trine: ChineseSign[];
  enemy: ChineseSign | undefined;
  onSelect?: (rowId: string) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Compatibility heat-grid (vs you)</CardTitle>
      </CardHeader>
      <CardBody>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
          {ranked.map(({ profile, score }) => {
            const isTrine = trine.includes(profile.snap.chinese);
            const isEnemy = profile.snap.chinese === enemy;
            const tone =
              score >= 80
                ? "border-success/40 bg-success/15 text-success"
                : score >= 60
                  ? "border-success/20 bg-success/5 text-fg"
                  : score >= 40
                    ? "border-line bg-bg-soft/50 text-fg-muted"
                    : score >= 20
                      ? "border-warn/30 bg-warn/10 text-warn"
                      : "border-danger/40 bg-danger/15 text-danger";
            const clickable = !!onSelect && profile.source === "other";
            return (
              <button
                key={profile.rowId}
                type="button"
                onClick={() => clickable && onSelect?.(profile.rowId)}
                disabled={!clickable}
                className={cn(
                  "rounded-lg border p-2 text-left text-xs transition",
                  tone,
                  clickable
                    ? "cursor-pointer hover:scale-[1.02] hover:shadow-md hover:brightness-110"
                    : "cursor-default"
                )}
                title={
                  clickable
                    ? `Click to open ${profile.fullName} — ${score}/100`
                    : `${profile.fullName} — ${score}/100`
                }
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[10px] opacity-80">{profile.numId}</span>
                  <span className="font-semibold tabular-nums">{score}</span>
                </div>
                <div className="mt-1 truncate font-medium">{profile.fullName}</div>
                <div className="mt-0.5 text-[10px] opacity-70">
                  {profile.snap.western} · {profile.snap.chinese}
                  {isTrine && " · trine"}
                  {isEnemy && " · enemy"}
                </div>
              </button>
            );
          })}
        </div>
        <div className="mt-3 text-[11px] text-fg-subtle">
          Tip: tap any card to open the full profile.
        </div>
      </CardBody>
    </Card>
  );
}

type Pair = {
  a: CombinedProfile;
  b: CombinedProfile;
  score: number;
  trine: boolean;
  enemy: boolean;
};

function CompatibilityGroupsCard({
  network,
  onSelect
}: {
  network: CombinedProfile[];
  onSelect?: (rowId: string) => void;
}) {
  const pairs = useMemo<Pair[]>(() => {
    const out: Pair[] = [];
    for (let i = 0; i < network.length; i++) {
      for (let j = i + 1; j < network.length; j++) {
        const a = network[i];
        const b = network[j];
        const score = compatibility(a.snap, b.snap).overall;
        const aTrine = (CHINESE_TRINE[a.snap.chinese] ?? []).includes(b.snap.chinese);
        const enemy = a.snap.enemyChinese === b.snap.chinese || b.snap.enemyChinese === a.snap.chinese;
        out.push({ a, b, score, trine: aTrine, enemy });
      }
    }
    return out.sort((x, y) => y.score - x.score);
  }, [network]);

  const compatible = pairs.filter((p) => p.score >= 70 || p.trine).slice(0, 8);
  const incompatible = pairs.filter((p) => p.score < 40 || p.enemy).slice(-8).reverse();
  const compatIds = new Set(compatible.map((p) => p.a.rowId + "|" + p.b.rowId));
  const incompatIds = new Set(incompatible.map((p) => p.a.rowId + "|" + p.b.rowId));
  const neutral = pairs
    .filter((p) => !compatIds.has(p.a.rowId + "|" + p.b.rowId) && !incompatIds.has(p.a.rowId + "|" + p.b.rowId))
    .slice(0, 8);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pair compatibility (across your network)</CardTitle>
      </CardHeader>
      <CardBody className="space-y-4">
        <p className="text-xs text-fg-muted">
          How everyone you&apos;ve added matches with each other — useful for picking who&apos;ll vibe at the same dinner, who shouldn&apos;t do business together, and who&apos;s naturally neutral.
        </p>
        <PairGroup
          title="Compatible — they tend to lift each other up"
          tone="success"
          pairs={compatible}
          onSelect={onSelect}
          emptyText="No clear matches yet — add a few more people to see clusters form."
        />
        <PairGroup
          title="Neutral — coexist comfortably without friction"
          tone="muted"
          pairs={neutral}
          onSelect={onSelect}
          emptyText="No neutral pairs in this scope."
        />
        <PairGroup
          title="Incompatible — clashing energies, watch the dynamics"
          tone="danger"
          pairs={incompatible}
          onSelect={onSelect}
          emptyText="No incompatible pairs in this scope."
        />
      </CardBody>
    </Card>
  );
}

function PairGroup({
  title,
  tone,
  pairs,
  onSelect,
  emptyText
}: {
  title: string;
  tone: "success" | "muted" | "danger";
  pairs: Pair[];
  onSelect?: (rowId: string) => void;
  emptyText: string;
}) {
  const toneCls =
    tone === "success"
      ? "border-success/30 bg-success/5"
      : tone === "danger"
        ? "border-danger/30 bg-danger/5"
        : "border-line bg-bg-soft/30";
  const arrowCls =
    tone === "success" ? "text-success" : tone === "danger" ? "text-danger" : "text-fg-subtle";
  const scoreCls =
    tone === "success" ? "text-success" : tone === "danger" ? "text-danger" : "text-fg";
  return (
    <div className={cn("rounded-xl border p-3", toneCls)}>
      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-fg-muted">{title}</div>
      {pairs.length === 0 ? (
        <div className="text-xs text-fg-subtle">{emptyText}</div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {pairs.map((p) => (
            <div
              key={p.a.rowId + "|" + p.b.rowId}
              className="flex items-center gap-2 rounded-lg border border-line/60 bg-bg/40 px-2.5 py-1.5 text-xs"
            >
              <button
                type="button"
                onClick={() => onSelect?.(p.a.rowId)}
                disabled={!onSelect || p.a.source !== "other"}
                className="truncate text-left transition enabled:hover:text-brand-200 disabled:cursor-default"
                title={p.a.fullName}
              >
                <span className="font-medium">{p.a.fullName}</span>
              </button>
              <span className={cn("text-base", arrowCls)}>
                {tone === "danger" ? "⇄" : tone === "success" ? "↔" : "—"}
              </span>
              <button
                type="button"
                onClick={() => onSelect?.(p.b.rowId)}
                disabled={!onSelect || p.b.source !== "other"}
                className="truncate text-left transition enabled:hover:text-brand-200 disabled:cursor-default"
                title={p.b.fullName}
              >
                <span className="font-medium">{p.b.fullName}</span>
              </button>
              <span className={cn("ml-auto font-semibold tabular-nums", scoreCls)}>{p.score}</span>
              {p.trine && (
                <span className="rounded bg-success/30 px-1 text-[9px] text-success">trine</span>
              )}
              {p.enemy && (
                <span className="rounded bg-danger/30 px-1 text-[9px] text-danger">enemy</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
