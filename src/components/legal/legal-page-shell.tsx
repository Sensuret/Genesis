import Link from "next/link";
import { BrandLockup } from "@/components/logo";

export function LegalPageShell({
  title,
  children,
  effectiveDate = "June 2026"
}: {
  title: string;
  children: React.ReactNode;
  effectiveDate?: string;
}) {
  return (
    <div className="landing-page min-h-screen bg-[#060810] text-white">
      <div className="mx-auto max-w-3xl px-6 py-14">
        <Link href="/" className="text-sm text-white/60 hover:text-white">
          ← Back to home
        </Link>
        <div className="mt-8">
          <BrandLockup layout="row" wordmarkSize="md" markClassName="h-9" />
        </div>
        <h1 className="mt-8 text-3xl font-bold tracking-tight">{title}</h1>
        <p className="mt-2 text-xs text-white/40">Effective {effectiveDate}</p>
        <div className="prose-legal mt-8 space-y-6 text-sm leading-relaxed text-white/75">
          {children}
        </div>
        <p className="mt-10 text-xs text-white/40">
          Questions?{" "}
          <a href="mailto:support@genesis.app" className="text-brand-300 hover:underline">
            support@genesis.app
          </a>
        </p>
      </div>
    </div>
  );
}

export function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-base font-semibold text-white">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export function LegalP({ children }: { children: React.ReactNode }) {
  return <p>{children}</p>;
}

export function LegalList({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-2 pl-5">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
