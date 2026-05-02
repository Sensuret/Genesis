"use client";

import { useState, type RefObject } from "react";
import { Camera, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type ScreenshotButtonProps = {
  /** Element to capture. We snapshot this node's full layout via html-to-image. */
  targetRef: RefObject<HTMLElement>;
  /** File name (without extension) used when downloading. */
  filename?: string;
  className?: string;
  /** Tooltip / aria label. */
  label?: string;
};

/**
 * Small camera icon that snapshots an arbitrary element to PNG and
 * triggers a download. Uses `html-to-image` (already a dependency)
 * so we don't pull in another lib.
 */
export function ScreenshotButton({
  targetRef,
  filename = "genesis-snapshot",
  className,
  label = "Save snapshot as PNG"
}: ScreenshotButtonProps) {
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");

  async function capture() {
    if (!targetRef.current || state === "loading") return;
    setState("loading");
    try {
      const { toPng } = await import("html-to-image");
      const node = targetRef.current;
      const dataUrl = await toPng(node, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: getComputedStyle(document.documentElement).getPropertyValue("--bg-elevated") || undefined,
        filter: (el) => {
          // Skip the screenshot button itself so it doesn't appear in the PNG.
          if (el instanceof HTMLElement && el.dataset.screenshotIgnore === "true") return false;
          return true;
        }
      });
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
