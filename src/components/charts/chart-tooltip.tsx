"use client";

// =============================================================================
// Shared theme-aware Recharts <Tooltip /> styling.
//
// Every chart in the app used to inline its own contentStyle / itemStyle /
// labelStyle — most hardcoded a dark background ("rgb(15 14 26 / 0.95)")
// without setting itemStyle.color, so on a dark theme Recharts fell back to
// the bar's gradient ID as the item-row text colour and rendered it black —
// invisible on the dark tooltip card.
//
// This module exports a single theme-aware preset that pulls colours from
// the CSS variables in globals.css (--bg-elevated, --fg, --fg-muted, --line),
// so tooltips automatically flip between dark / slate / light / contrast
// themes without any per-chart code.
// =============================================================================

import type { CSSProperties } from "react";

/** Card / wrapper style — themed background + brand-tinted border + shadow. */
export const chartTooltipContentStyle: CSSProperties = {
  background: "rgb(var(--bg-elevated) / 0.96)",
  border: "1px solid rgba(168, 102, 255, 0.4)",
  borderRadius: 12,
  color: "rgb(var(--fg))",
  fontSize: 12,
  padding: "8px 10px",
  boxShadow: "0 18px 40px -20px rgba(0, 0, 0, 0.55)",
  outline: "none"
};

/** Per-row text colour (the value next to the coloured swatch). */
export const chartTooltipItemStyle: CSSProperties = {
  color: "rgb(var(--fg))"
};

/** Header label (e.g. the X-axis category like "2025-04-12" or "Mon"). */
export const chartTooltipLabelStyle: CSSProperties = {
  color: "rgb(var(--fg-muted))",
  marginBottom: 4,
  fontWeight: 500
};

/** Convenience props bundle — spread directly onto <Tooltip {...chartTooltipProps} />. */
export const chartTooltipProps = {
  contentStyle: chartTooltipContentStyle,
  itemStyle: chartTooltipItemStyle,
  labelStyle: chartTooltipLabelStyle,
  wrapperStyle: { outline: "none" } as CSSProperties,
  cursor: { fill: "rgba(168, 102, 255, 0.08)" }
};
