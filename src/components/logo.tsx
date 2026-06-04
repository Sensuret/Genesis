import { cn } from "@/lib/utils";
import { GsMark } from "@/components/gs-mark";

const WORDMARK_LETTERS = ["G", "E", "N", "E", "S", "I", "S"] as const;
const MIRRORED_E = new Set([1, 3]);

/** GS — seamless gradient mark. */
export function LogoMark({ className }: { className?: string }) {
  return <GsMark className={className} />;
}

/** GƎNƎSIS — mirrored Ǝ's; solid white on auth/landing. */
export function Wordmark({
  className,
  size = "md"
}: {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl" | "auth";
}) {
  const sizing = {
    sm: "text-sm gap-[0.06em]",
    md: "text-base gap-[0.05em]",
    lg: "text-lg gap-[0.04em]",
    xl: "text-xl gap-[0.04em]",
    auth: "text-xl gap-[0.05em] sm:text-[1.35rem]"
  }[size];
  return (
    <span
      className={cn(
        "wordmark-solid inline-flex items-baseline font-display font-bold uppercase leading-none tracking-normal",
        sizing,
        className
      )}
      aria-label="Genesis"
    >
      {WORDMARK_LETTERS.map((letter, i) => (
        <span key={i} className={cn("wordmark-letter", MIRRORED_E.has(i) && "mirror-e")}>
          {letter}
        </span>
      ))}
    </span>
  );
}

export function BrandLockup({
  className,
  markClassName,
  wordmarkSize = "lg",
  layout = "stack"
}: {
  className?: string;
  markClassName?: string;
  wordmarkSize?: "sm" | "md" | "lg" | "xl" | "auth";
  layout?: "stack" | "row";
  logoBlend?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center",
        layout === "stack" ? "flex-col gap-2" : "flex-row items-center gap-1",
        className
      )}
    >
      <LogoMark className={cn("h-11 w-auto", markClassName)} />
      <Wordmark size={wordmarkSize} />
    </div>
  );
}

/** Auth hero — large seamless GS gradient. */
export function AuthBrandMark({ className }: { className?: string }) {
  return <GsMark className={cn("h-[4.25rem] w-auto sm:h-24", className)} fontSize={52} />;
}

/** Faded GS watermark on the back of resolution cards. */
export function ResolutionWatermark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-0 bottom-6 z-0 flex justify-center overflow-hidden",
        className
      )}
      aria-hidden
    >
      <GsMark className="h-28 w-auto opacity-[0.07] sm:h-36" fontSize={96} />
    </div>
  );
}

export function LogoImage({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/logo.png" alt="GƎNƎSIS" className={cn("object-contain", className)} />
  );
}
