import { LegalPageShell } from "@/components/legal/legal-page-shell";
import { PrivacyContent } from "@/components/legal/privacy-content";

export const metadata = {
  title: "Privacy Policy — GƎNƎSIS"
};

export default function PrivacyPage() {
  return (
    <LegalPageShell title="Privacy Policy">
      <PrivacyContent />
    </LegalPageShell>
  );
}
