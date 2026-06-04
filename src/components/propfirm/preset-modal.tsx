"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { PropFirmSimulationPanel } from "@/components/propfirm/prop-firm-simulation-panel";
import { estimateTimeToPass, simulateMultiPhaseChallenge, type DdMode, type PhaseRules } from "@/lib/propfirm";
import { formatAccountSizeLabel, PROP_ACCOUNT_SIZES } from "@/lib/propfirm/account-sizes";
import type { PhaseTemplate, StoredPropPreset } from "@/lib/propfirm/presets-storage";
import type { TradeRow } from "@/lib/supabase/types";

type PresetModalProps = {
  firmId: string;
  firmName: string;
  initials: string;
  defaultTemplate: PhaseTemplate;
  defaultPhases: PhaseRules[];
  phaseTemplates: Record<PhaseTemplate, PhaseRules[]>;
  trades: TradeRow[];
  stored?: StoredPropPreset | null;
  onClose: () => void;
  onSave: (config: StoredPropPreset) => void;
};

export function PropFirmPresetModal({
  firmId,
  firmName,
  initials,
  defaultTemplate,
  defaultPhases,
  phaseTemplates,
  trades,
  stored,
  onClose,
  onSave
}: PresetModalProps) {
  const [template, setTemplate] = useState<PhaseTemplate>(stored?.template ?? defaultTemplate);
  const [phases, setPhases] = useState<PhaseRules[]>(
    stored?.phases?.length ? stored.phases.map((p) => ({ ...p })) : defaultPhases.map((p) => ({ ...p }))
  );
  const [accountSize, setAccountSize] = useState(stored?.accountSize ?? 100_000);
  const [logoDataUrl, setLogoDataUrl] = useState(stored?.logoDataUrl ?? "");
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [simPhaseIdx, setSimPhaseIdx] = useState(0);

  useEffect(() => {
    setTemplate(stored?.template ?? defaultTemplate);
    setPhases(
      stored?.phases?.length ? stored.phases.map((p) => ({ ...p })) : defaultPhases.map((p) => ({ ...p }))
    );
    setAccountSize(stored?.accountSize ?? 100_000);
    setLogoDataUrl(stored?.logoDataUrl ?? "");
    setPhaseIdx(0);
    setSimPhaseIdx(0);
  }, [firmId, stored, defaultTemplate, defaultPhases]);

  useEffect(() => {
    setPhaseIdx((i) => Math.min(i, Math.max(0, phases.length - 1)));
    setSimPhaseIdx(0);
  }, [phases.length]);

  const result = useMemo(
    () =>
      simulateMultiPhaseChallenge(trades, {
        accountSize,
        phases,
        singlePhaseEquityOnly: phases.length === 1
      }),
    [trades, accountSize, phases]
  );

  const timeToPass = useMemo(() => {
    const firstTarget = phases.find((p) => p.profitTargetPct > 0)?.profitTargetPct ?? 0;
    return estimateTimeToPass({ accountSize, profitTargetPct: firstTarget, recentTrades: trades });
  }, [accountSize, phases, trades]);

  function applyTemplate(t: PhaseTemplate) {
    setTemplate(t);
    setPhases(phaseTemplates[t].map((p) => ({ ...p })));
    setPhaseIdx(0);
    setSimPhaseIdx(0);
  }

  function updatePhase(i: number, patch: Partial<PhaseRules>) {
    setPhases((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  }

  function handleLogoUpload(file: File | null) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setLogoDataUrl(reader.result);
    };
    reader.readAsDataURL(file);
  }

  return (
    <div
      className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`${firmName} rules`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-line bg-bg shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line bg-bg-elevated">
              {logoDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoDataUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-lg font-bold text-brand-300">{initials}</span>
              )}
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-fg-subtle">Prop account preset</div>
              <div className="text-lg font-semibold text-fg">{firmName}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-line text-fg-muted hover:text-fg"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          <div>
            <Label>Square logo (optional)</Label>
            <Input
              type="file"
              accept="image/*"
              className="mt-1 max-w-xs"
              onChange={(e) => handleLogoUpload(e.target.files?.[0] ?? null)}
            />
          </div>

          <div>
            <Label>Account size</Label>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {PROP_ACCOUNT_SIZES.map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setAccountSize(size)}
                  className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
                    accountSize === size
                      ? "border-brand-400 bg-brand-500/15 text-brand-200"
                      : "border-line bg-bg-elevated text-fg-muted hover:border-brand-400/50"
                  }`}
                >
                  {formatAccountSizeLabel(size)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {(["1", "2", "3"] as PhaseTemplate[]).map((t) => (
              <Button
                key={t}
                type="button"
                size="sm"
                variant={template === t ? "primary" : "secondary"}
                onClick={() => applyTemplate(t)}
              >
                {t === "1" ? "Instant / 1-Step" : `${t} Phase`}
              </Button>
            ))}
          </div>

          {phases.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {phases.map((p, i) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => setPhaseIdx(i)}
                  className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition ${
                    phaseIdx === i
                      ? "border-brand-400 bg-brand-500/15 text-brand-200"
                      : "border-line bg-bg-soft text-fg-muted"
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          )}

          {phases[phaseIdx] && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-brand-200">{phases[phaseIdx].name}</div>
              <div className="grid gap-3 rounded-xl border border-line bg-bg-elevated p-4 md:grid-cols-3">
                <Field label="Profit target %">
                  <Input
                    type="number"
                    step="0.1"
                    value={phases[phaseIdx].profitTargetPct}
                    onChange={(e) => updatePhase(phaseIdx, { profitTargetPct: Number(e.target.value) })}
                  />
                </Field>
                <Field label="Daily DD %">
                  <Input
                    type="number"
                    step="0.1"
                    value={phases[phaseIdx].dailyDdPct}
                    onChange={(e) => updatePhase(phaseIdx, { dailyDdPct: Number(e.target.value) })}
                  />
                </Field>
                <Field label="Max DD %">
                  <Input
                    type="number"
                    step="0.1"
                    value={phases[phaseIdx].maxDdPct}
                    onChange={(e) => updatePhase(phaseIdx, { maxDdPct: Number(e.target.value) })}
                  />
                </Field>
                <Field label="Max DD type">
                  <select
                    className="h-10 w-full rounded-xl border border-line bg-bg px-3 text-sm"
                    value={phases[phaseIdx].maxDdMode}
                    onChange={(e) => updatePhase(phaseIdx, { maxDdMode: e.target.value as DdMode })}
                  >
                    <option value="balance">Balance-based</option>
                    <option value="equity">Equity-based</option>
                  </select>
                </Field>
                <Field label="Min trading days">
                  <Input
                    type="number"
                    value={phases[phaseIdx].minTradingDays ?? 0}
                    onChange={(e) => updatePhase(phaseIdx, { minTradingDays: Number(e.target.value) })}
                  />
                </Field>
              </div>
            </div>
          )}

          <PropFirmSimulationPanel
            result={result}
            timeToPass={timeToPass}
            simPhaseIdx={simPhaseIdx}
            onSimPhaseIdxChange={setSimPhaseIdx}
            tradesCount={trades.length}
          />
        </div>

        <div className="flex justify-end gap-2 border-t border-line px-5 py-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() =>
              onSave({
                template,
                phases: phases.map((p) => ({ ...p })),
                accountSize,
                logoDataUrl: logoDataUrl || undefined,
                lastResult: trades.length
                  ? {
                      passedAll: result.passedAllPhases,
                      failedAt: result.failedAt ?? undefined,
                      tradingDays: result.phases.reduce((max, p) => Math.max(max, p.tradingDays ?? 0), 0),
                      updatedAt: new Date().toISOString()
                    }
                  : stored?.lastResult
              })
            }
          >
            Save &amp; use rules
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
