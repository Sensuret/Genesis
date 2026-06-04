"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Stat } from "@/components/ui/stat";
import { Button } from "@/components/ui/button";
import { PropFirmPresetModal } from "@/components/propfirm/preset-modal";
import { PropFirmSimulationPanel } from "@/components/propfirm/prop-firm-simulation-panel";
import { useTrades } from "@/lib/hooks/use-trades";
import {
  calculateLotSize,
  estimateTimeToPass,
  simulateMultiPhaseChallenge,
  type DdMode,
  type MultiPhaseRules,
  type PhaseRules
} from "@/lib/propfirm";
import {
  getPropPreset,
  loadPropPresets,
  savePropPreset,
  type StoredPropPreset
} from "@/lib/propfirm/presets-storage";
import { applyAllFilters } from "@/lib/analytics";
import { useFilters } from "@/lib/filters/store";
import { formatAccountSizeLabel, PROP_ACCOUNT_SIZES } from "@/lib/propfirm/account-sizes";
import { cn } from "@/lib/utils";

type PhaseTemplate = "1" | "2" | "3";

const TABS = ["Prop account presets", "Manual simulator", "Lot size calculator"] as const;
type Tab = (typeof TABS)[number];

const PROP_FIRM_PRESETS = [
  { id: "ftmo", name: "FTMO", initials: "FT", blurb: "2-step challenge · popular EU prop", template: "2" as PhaseTemplate },
  { id: "funded-next", name: "Funded Next", initials: "FN", blurb: "Stellar & evaluation programs", template: "2" as PhaseTemplate },
  { id: "funding-pips", name: "Funding Pips", initials: "FP", blurb: "1 & 2 step · competitive DD", template: "2" as PhaseTemplate },
  { id: "maven", name: "Maven", initials: "MV", blurb: "Instant & 2-step options", template: "2" as PhaseTemplate },
  { id: "goat", name: "Goat Funded", initials: "GF", blurb: "Fast-track funded accounts", template: "1" as PhaseTemplate },
  { id: "hola", name: "Hola Prime", initials: "HP", blurb: "Multi-phase evaluations", template: "3" as PhaseTemplate },
  { id: "the5ers", name: "The5ers", initials: "5", blurb: "Bootcamp & high-stakes programs", template: "2" as PhaseTemplate },
  { id: "e8", name: "E8 Funding", initials: "E8", blurb: "E8 & track evaluations", template: "2" as PhaseTemplate }
] as const;

const PHASE_TEMPLATES: Record<PhaseTemplate, PhaseRules[]> = {
  "1": [
    { name: "Funded (1-Step)", profitTargetPct: 0, dailyDdPct: 0, maxDdPct: 6, maxDdMode: "equity" }
  ],
  "2": [
    { name: "Phase 1", profitTargetPct: 8, dailyDdPct: 5, maxDdPct: 10, maxDdMode: "balance", minTradingDays: 5 },
    { name: "Phase 2", profitTargetPct: 5, dailyDdPct: 5, maxDdPct: 10, maxDdMode: "balance", minTradingDays: 5 }
  ],
  "3": [
    { name: "Phase 1", profitTargetPct: 8, dailyDdPct: 5, maxDdPct: 10, maxDdMode: "balance", minTradingDays: 4 },
    { name: "Phase 2", profitTargetPct: 5, dailyDdPct: 5, maxDdPct: 10, maxDdMode: "balance", minTradingDays: 4 },
    { name: "Phase 3 (Verification)", profitTargetPct: 0, dailyDdPct: 5, maxDdPct: 10, maxDdMode: "balance", minTradingDays: 4 }
  ]
};

export default function PropFirmPage() {
  const { trades, loading } = useTrades();
  const { filters } = useFilters();
  const filtered = useMemo(() => applyAllFilters(trades, filters), [trades, filters]);

  const [tab, setTab] = useState<Tab>("Prop account presets");
  const [accountSize, setAccountSize] = useState(100_000);
  const [template, setTemplate] = useState<PhaseTemplate>("2");
  const [phases, setPhases] = useState<PhaseRules[]>(PHASE_TEMPLATES["2"]);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [editingPreset, setEditingPreset] = useState<(typeof PROP_FIRM_PRESETS)[number] | null>(null);
  const [savedPresets, setSavedPresets] = useState<Record<string, StoredPropPreset>>({});
  const [simPhaseIdx, setSimPhaseIdx] = useState(0);

  const [riskPct, setRiskPct] = useState(1);
  const [stopDistance, setStopDistance] = useState(20);
  const [pipValuePerLot, setPipValuePerLot] = useState(10);

  useEffect(() => {
    setSavedPresets(loadPropPresets());
  }, []);

  const config: MultiPhaseRules = useMemo(
    () => ({ accountSize, phases, singlePhaseEquityOnly: phases.length === 1 }),
    [accountSize, phases]
  );

  const result = useMemo(() => simulateMultiPhaseChallenge(filtered, config), [filtered, config]);

  useEffect(() => {
    if (!selectedPreset || !filtered.length) return;
    const stored = getPropPreset(selectedPreset);
    const tradingDays = result.phases.reduce((max, p) => Math.max(max, p.tradingDays ?? 0), 0);
    savePropPreset(selectedPreset, {
      template,
      phases: phases.map((p) => ({ ...p })),
      accountSize,
      logoDataUrl: stored?.logoDataUrl,
      lastResult: {
        passedAll: result.passedAllPhases,
        failedAt: result.failedAt ?? undefined,
        tradingDays,
        updatedAt: new Date().toISOString()
      }
    });
    setSavedPresets(loadPropPresets());
  }, [selectedPreset, result.passedAllPhases, result.failedAt, filtered.length, template, phases, accountSize]);

  const lots = useMemo(
    () => calculateLotSize({ accountSize, riskPct, stopDistance, pipValuePerLot }),
    [accountSize, riskPct, stopDistance, pipValuePerLot]
  );

  const timeToPass = useMemo(() => {
    const firstTarget = phases.find((p) => p.profitTargetPct > 0)?.profitTargetPct ?? 0;
    return estimateTimeToPass({ accountSize, profitTargetPct: firstTarget, recentTrades: filtered });
  }, [accountSize, phases, filtered]);

  function applyTemplate(t: PhaseTemplate) {
    setTemplate(t);
    setPhases(PHASE_TEMPLATES[t].map((p) => ({ ...p })));
    setSimPhaseIdx(0);
  }

  function updatePhase(i: number, patch: Partial<PhaseRules>) {
    setPhases((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  }

  function applyPresetRules(stored: StoredPropPreset) {
    setTemplate(stored.template);
    setPhases(stored.phases.map((p) => ({ ...p })));
    setAccountSize(stored.accountSize);
    setSimPhaseIdx(0);
  }

  function openPreset(firm: (typeof PROP_FIRM_PRESETS)[number]) {
    setEditingPreset(firm);
    const stored = getPropPreset(firm.id);
    if (stored) {
      setSelectedPreset(firm.id);
      applyPresetRules(stored);
    } else {
      setSelectedPreset(firm.id);
      applyTemplate(firm.template);
    }
  }

  function handlePresetSave(config: StoredPropPreset) {
    if (!editingPreset) return;
    savePropPreset(editingPreset.id, config);
    setSavedPresets(loadPropPresets());
    setSelectedPreset(editingPreset.id);
    applyPresetRules(config);
    setEditingPreset(null);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Prop Firms"
        description="Preset prop accounts, a manual rule simulator against your trades, and lot sizing."
      />

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "rounded-xl border px-3 py-1.5 text-xs font-medium transition",
              tab === t
                ? "border-brand-400 bg-brand-500/15 text-brand-200"
                : "border-line bg-bg-soft text-fg-muted hover:border-brand-400/40"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Prop account presets" && (
        <section className="space-y-3">
          <p className="text-xs text-fg-muted">
            Tap a firm to configure phase rules, account size, and see rule simulation vs your filtered trades.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {PROP_FIRM_PRESETS.map((firm) => {
              const stored = savedPresets[firm.id];
              return (
                <button
                  key={firm.id}
                  type="button"
                  onClick={() => openPreset(firm)}
                  className={cn(
                    "rounded-2xl border p-4 text-left transition hover:border-brand-400/60",
                    selectedPreset === firm.id
                      ? "border-brand-400 bg-brand-500/10 ring-2 ring-brand-500/30"
                      : "border-line bg-bg-soft"
                  )}
                >
                  <div className="mb-3 flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl border border-line bg-bg-elevated">
                    {stored?.logoDataUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={stored.logoDataUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-lg font-bold text-brand-300">{firm.initials}</span>
                    )}
                  </div>
                  <div className="font-semibold text-fg">{firm.name}</div>
                  <div className="mt-1 text-xs text-fg-muted">{firm.blurb}</div>
                  {stored?.lastResult && (
                    <div className="mt-2 text-[11px] text-fg-subtle">
                      {stored.lastResult.passedAll ? (
                        <span className="text-success">Passed</span>
                      ) : (
                        <span className="text-danger">
                          Failed{stored.lastResult.failedAt ? ` · ${stored.lastResult.failedAt}` : ""}
                        </span>
                      )}
                      {" · "}
                      {stored.lastResult.tradingDays} day{stored.lastResult.tradingDays === 1 ? "" : "s"}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {tab === "Manual simulator" && (
        <section className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
              <CardTitle>Prop firm simulator</CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                {(["1", "2", "3"] as PhaseTemplate[]).map((t) => (
                  <Button
                    key={t}
                    variant={template === t ? "primary" : "secondary"}
                    size="sm"
                    onClick={() => applyTemplate(t)}
                  >
                    {t === "1" ? "1-Step / Instant" : `${t} Phase`}
                  </Button>
                ))}
              </div>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <Field label="Account size">
                  <div className="flex flex-wrap gap-1.5">
                    {PROP_ACCOUNT_SIZES.map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setAccountSize(size)}
                        className={cn(
                          "rounded-lg border px-2.5 py-1 text-xs font-medium transition",
                          accountSize === size
                            ? "border-brand-400 bg-brand-500/15 text-brand-200"
                            : "border-line bg-bg-elevated text-fg-muted hover:border-brand-400/50"
                        )}
                      >
                        {formatAccountSizeLabel(size)}
                      </button>
                    ))}
                  </div>
                </Field>
                <div className="md:col-span-2 self-end text-xs text-fg-muted">
                  {phases.length === 1
                    ? "Single-phase / instant: max DD is equity-based throughout."
                    : `Sequential phases — ${phases.length} configured. Pass each to advance.`}
                </div>
              </div>

              <div className="space-y-3">
                {phases.map((p, i) => (
                  <div key={i} className="space-y-2">
                    <div className="text-xs font-medium text-brand-200">{p.name}</div>
                    <div className="grid gap-3 rounded-xl border border-line bg-bg-elevated p-4 md:grid-cols-5">
                      <Field label="Profit target %">
                        <Input
                          type="number"
                          step="0.1"
                          value={p.profitTargetPct}
                          onChange={(e) => updatePhase(i, { profitTargetPct: Number(e.target.value) })}
                        />
                      </Field>
                      <Field label="Daily DD %">
                        <Input
                          type="number"
                          step="0.1"
                          value={p.dailyDdPct}
                          onChange={(e) => updatePhase(i, { dailyDdPct: Number(e.target.value) })}
                        />
                      </Field>
                      <Field label="Max DD %">
                        <Input
                          type="number"
                          step="0.1"
                          value={p.maxDdPct}
                          onChange={(e) => updatePhase(i, { maxDdPct: Number(e.target.value) })}
                        />
                      </Field>
                      <Field label="Max DD type">
                        <select
                          className="h-9 w-full rounded-xl border border-line bg-bg-elevated px-3 text-sm"
                          value={p.maxDdMode}
                          onChange={(e) => updatePhase(i, { maxDdMode: e.target.value as DdMode })}
                        >
                          <option value="balance">Balance-based (static)</option>
                          <option value="equity">Equity-based (trailing)</option>
                        </select>
                      </Field>
                      <Field label="Min trading days">
                        <Input
                          type="number"
                          value={p.minTradingDays ?? 0}
                          onChange={(e) => updatePhase(i, { minTradingDays: Number(e.target.value) })}
                        />
                      </Field>
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>

          <PropFirmSimulationPanel
            result={result}
            timeToPass={timeToPass}
            simPhaseIdx={simPhaseIdx}
            onSimPhaseIdxChange={setSimPhaseIdx}
            tradesCount={filtered.length}
            loading={loading}
          />
        </section>
      )}

      {tab === "Lot size calculator" && (
        <section className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle>Lot size calculator</CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="grid gap-4 md:grid-cols-4">
                <Field label="Risk %">
                  <Input type="number" step="0.1" value={riskPct} onChange={(e) => setRiskPct(Number(e.target.value))} />
                </Field>
                <Field label="Stop distance (pips/points)">
                  <Input
                    type="number"
                    step="0.1"
                    value={stopDistance}
                    onChange={(e) => setStopDistance(Number(e.target.value))}
                  />
                </Field>
                <Field label="$ per pip per 1.0 lot">
                  <Input
                    type="number"
                    step="0.01"
                    value={pipValuePerLot}
                    onChange={(e) => setPipValuePerLot(Number(e.target.value))}
                  />
                </Field>
                <Field label="Account size ($)">
                  <Input type="number" value={accountSize} onChange={(e) => setAccountSize(Number(e.target.value))} />
                </Field>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <Stat label="Risk amount" value={lots.riskAmount} format="currency" />
                <Stat label="Recommended lots" value={lots.recommendedLots.toFixed(3)} format="text" />
                <Stat label="Lots (rounded down)" value={lots.lotsRoundedDown.toFixed(2)} format="text" />
              </div>
              <div className="text-xs text-fg-muted">
                Forex majors: $10/pip per 1.0 std lot. Indices (NAS100/US30) ≈ $1/point per 1.0 lot. Adjust to your
                broker&apos;s contract.
              </div>
            </CardBody>
          </Card>
        </section>
      )}

      {editingPreset && (
        <PropFirmPresetModal
          firmId={editingPreset.id}
          firmName={editingPreset.name}
          initials={editingPreset.initials}
          defaultTemplate={editingPreset.template}
          defaultPhases={PHASE_TEMPLATES[editingPreset.template]}
          phaseTemplates={PHASE_TEMPLATES}
          trades={filtered}
          stored={savedPresets[editingPreset.id] ?? null}
          onClose={() => setEditingPreset(null)}
          onSave={handlePresetSave}
        />
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
    </div>
  );
}
