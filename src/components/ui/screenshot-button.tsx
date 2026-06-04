"use client";

import { useState, type RefObject } from "react";
import { Camera, Check, Loader2 } from "lucide-react";
import { defaultResolutionExportBg } from "@/lib/notebook/resolution-backgrounds";
import { cn } from "@/lib/utils";

type ScreenshotButtonProps = {
  /** Element to capture. We snapshot this node's full layout via html-to-image. */
  targetRef: RefObject<HTMLElement>;
  /** File name (without extension) used when downloading. */
  filename?: string;
  className?: string;
  /** Tooltip / aria label. */
  label?: string;
  /**
   * When true the captured image uses the node's full scrollWidth /
   * scrollHeight instead of its visible offsetWidth / offsetHeight.
   */
  captureFullSize?: boolean;
};

function resolveCaptureBackground(node: HTMLElement): string {
  const card =
    node.querySelector<HTMLElement>("[data-resolution-card]") ??
    (node.dataset.resolutionCard !== undefined ? node : null);
  const target = card ?? node;

  const explicit = target.dataset.exportBg?.trim();
  if (explicit) return explicit;

  const inlineBg = target.style.background || target.style.backgroundColor;
  if (inlineBg && !inlineBg.includes("gradient") && inlineBg !== "transparent") {
    return inlineBg;
  }

  const computed = getComputedStyle(target).backgroundColor;
  if (
    computed &&
    computed !== "rgba(0, 0, 0, 0)" &&
    computed !== "transparent"
  ) {
    return computed;
  }

  const root = getComputedStyle(document.documentElement);
  const elevated = root.getPropertyValue("--bg-elevated").trim();
  if (elevated) return elevated;

  return defaultResolutionExportBg();
}

/**
 * Small camera icon that snapshots an arbitrary element to PNG and
 * triggers a download. Uses `html-to-image` (already a dependency).
 */
export function ScreenshotButton({
  targetRef,
  filename = "genesis-snapshot",
  className,
  label = "Save snapshot as PNG",
  captureFullSize = false
}: ScreenshotButtonProps) {
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");

  async function capture() {
    if (!targetRef.current || state === "loading") return;
    setState("loading");

    const node = targetRef.current;
    const previousOverflow = node.style.overflow;
    const previousMaxHeight = node.style.maxHeight;
    if (captureFullSize) {
      node.style.overflow = "visible";
      node.style.maxHeight = "none";
    }

    const bgColor = resolveCaptureBackground(node);

    try {
      const { toPng } = await import("html-to-image");
      const opts: Parameters<typeof toPng>[1] = {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: bgColor,
        style: {
          backgroundColor: bgColor
        },
        filter: (el) => {
          if (!(el instanceof HTMLElement)) return true;
          if (el.dataset.screenshotIgnore === "true") return false;
          let p: HTMLElement | null = el.parentElement;
          while (p) {
            if (p.dataset.screenshotIgnore === "true") return false;
            p = p.parentElement;
          }
          return true;
        }
      };
      if (captureFullSize) {
        opts.width = node.scrollWidth;
        opts.height = node.scrollHeight;
        opts.canvasWidth = node.scrollWidth;
        opts.canvasHeight = node.scrollHeight;
      }
      const dataUrl = await toPng(node, opts);
      const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `${filename}-${stamp}.png`;
      a.click();
      setState("done");
      setTimeout(() => setState("idle"), 1400);
    } catch (err) {
      console.error("Screenshot failed", err);
      setState("idle");
    } finally {
      if (captureFullSize) {
        node.style.overflow = previousOverflow;
        node.style.maxHeight = previousMaxHeight;
      }
    }
  }

  return (
    <button
      type="button"
      data-screenshot-ignore="true"
      onClick={capture}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-bg text-fg-muted outline-none transition hover:border-brand-400/60 hover:text-brand-300 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/30",
        state === "loading" && "opacity-60",
        className
      )}
    >
      {state === "loading" ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : state === "done" ? (
        <Check className="h-4 w-4 text-success" />
      ) : (
        <Camera className="h-4 w-4" />
      )}
    </button>
  );
}
