import Link from "next/link";
import { BrandLockup } from "@/components/logo";

export const metadata = {
  title: "Terms & Conditions — GƎNƎSIS"
};

export default function TermsPage() {
  return (
    <div className="landing-page min-h-screen bg-[#060810] text-white">
      <div className="mx-auto max-w-3xl px-6 py-14">
        <Link href="/" className="text-sm text-white/60 hover:text-white">
          ← Back to home
        </Link>
        <div className="mt-8">
          <BrandLockup layout="row" wordmarkSize="md" markClassName="h-9" />
        </div>
        <h1 className="mt-8 text-3xl font-bold">Terms &amp; Conditions</h1>
        <p className="mt-4 text-sm leading-relaxed text-white/70">
          By using GƎNƎSIS you agree that the service is provided for analytics and journaling only —
          not financial advice. You are responsible for your trading decisions and for keeping your
          login credentials secure.
        </p>
        <p className="mt-4 text-sm leading-relaxed text-white/70">
          We may update features or these terms; continued use after changes constitutes acceptance.
          The service is offered as-is during beta without warranty of uninterrupted availability.
        </p>
        <p className="mt-6 text-xs text-white/40">Last updated: June 2026</p>
      </div>
    </div>
  );
}
