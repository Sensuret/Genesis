import { cn } from "@/lib/utils";

/**
 * GƎNƎSIS wordmark — the second E is mirrored as in the GS brand mark.
 * For the full color logo image, use <LogoImage /> below.
 */
export function Wordmark({ className, size = "md" }: { className?: string; size?: "sm" | "md" | "lg" | "xl" }) {
  const sizing = {
    sm: "text-base",
    md: "text-lg",
    lg: "text-2xl",
    xl: "text-4xl"
  }[size];
  return (
    <span className={cn("inline-flex items-baseline font-display font-bold tracking-tight", sizing, className)}>
      <span>G</span>
      <span className="mirror-e">E</span>
      <span>N</span>
      <span className="mirror-e">E</span>
      <span>SIS</span>
    </span>
  );
}

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-700 text-white shadow-glow",
        className
      )}
    >
      <span className="font-display text-base font-bold leading-none tracking-tighter">
        G<span className="mirror-e">S</span>
      </span>
    </span>
  );
}

export function LogoImage({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/logo.png" alt="GƎNƎSIS" className={cn("object-contain", className)} />
  );
}
