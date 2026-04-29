import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function Empty({
  title,
  description,
  action,
  className
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-bg-soft/50 p-10 text-center",
        className
      )}
    >
      <div className="mb-2 text-base font-medium text-fg">{title}</div>
      {description && <div className="mb-4 max-w-md text-sm text-fg-muted">{description}</div>}
      {action}
    </div>
  );
}
