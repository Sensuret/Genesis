import Link from "next/link";
import { BrandLockup } from "@/components/logo";

export const metadata = {
  title: "Privacy Policy — GƎNƎSIS"
};

export default function PrivacyPage() {
  return (
    <div className="landing-page min-h-screen bg-[#060810] text-white">
      <div className="mx-auto max-w-3xl px-6 py-14">
        <Link href="/" className="text-sm text-white/60 hover:text-white">
          ← Back to home
        </Link>
        <div className="mt-8">
          <BrandLockup layout="row" wordmarkSize="md" markClassName="h-9" />
        </div>
        <h1 className="mt-8 text-3xl font-bold">Privacy Policy</h1>
        <p className="mt-4 text-sm leading-relaxed text-white/70">
          GƎNƎSIS is a trading analytics and journaling application. We store account data you
          provide (trades, settings, profile information) in Supabase-hosted infrastructure secured
          with row-level access controls. We do not sell your personal data.
        </p>
        <p className="mt-4 text-sm leading-relaxed text-white/70">
          You may request export or deletion of your account from Settings → Account. For questions,
          contact{" "}
          <a href="mailto:support@genesis.app" className="text-brand-300 hover:underline">
            support@genesis.app
          </a>
          .
        </p>
        <p className="mt-6 text-xs text-white/40">Last updated: June 2026</p>
      </div>
    </div>
  );
}
