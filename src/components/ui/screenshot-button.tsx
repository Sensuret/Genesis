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
  /**
   * When true the captured image uses the node's full scrollWidth /
   * scrollHeight instead of its visible offsetWidth / offsetHeight.
   * This is what the Resolutions card needs — a tall portrait should
   * export end-to-end without being cropped to the modal viewport.
   */
  captureFullSize?: boolean;
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
  label = "Save snapshot as PNG",
  captureFullSize = false
}: ScreenshotButtonProps) {
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");

  async function capture() {
    if (!targetRef.current || state === "loading") return;
    setState("loading");
    // When capturing full-size we temporarily strip the node's overflow
    // styles so html-to-image renders against the full scroll size
    // instead of the visible viewport.
    const node = targetRef.current;
    const previousOverflow = node.style.overflow;
    const previousMaxHeight = node.style.maxHeight;
    if (captureFullSize) {
      node.style.overflow = "visible";
      node.style.maxHeight = "none";
    }
    try {
      const { toPng } = await import("html-to-image");
      const opts: Parameters<typeof toPng>[1] = {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: getComputedStyle(document.documentElement).getPropertyValue("--bg-elevated") || undefined,
        filter: (el) => {
          // Skip elements explicitly marked as "ignore" so neither the
          // screenshot button itself nor surrounding nav / toolbar
          // chrome end up baked into the PNG.
          if (el instanceof HTMLElement && el.dataset.screenshotIgnore === "true") return false;
          return true;
        }
      };
      if (captureFullSize) {
        // Use scrollWidth/scrollHeight so a tall portrait card exports
        // top-to-bottom even when the modal viewport scrolled it.
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
