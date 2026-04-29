import { cn } from "@/lib/utils";
import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes } from "react";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...rest }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          "h-10 w-full rounded-xl border border-line bg-bg px-3 text-sm text-fg placeholder:text-fg-subtle outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-500/30",
          className
        )}
        {...rest}
      />
    );
  }
);

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...rest }, ref) {
    return (
      <textarea
        ref={ref}
        className={cn(
          "min-h-[88px] w-full rounded-xl border border-line bg-bg p-3 text-sm text-fg placeholder:text-fg-subtle outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-500/30",
          className
        )}
        {...rest}
      />
    );
  }
);

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...rest }, ref) {
    return (
      <select
        ref={ref}
        className={cn(
          "h-10 w-full rounded-xl border border-line bg-bg px-3 text-sm text-fg outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-500/30",
          className
        )}
        {...rest}
      >
        {children}
      </select>
    );
  }
);

export function Label({ className, children }: { className?: string; children: React.ReactNode }) {
  return <label className={cn("mb-1 block text-xs font-medium text-fg-muted", className)}>{children}</label>;
}
