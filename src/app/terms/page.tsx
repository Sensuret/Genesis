import { LegalPageShell } from "@/components/legal/legal-page-shell";
import { TermsContent } from "@/components/legal/terms-content";

export const metadata = {
  title: "Terms & Conditions — GƎNƎSIS"
};

export default function TermsPage() {
  return (
    <LegalPageShell title="Terms of Service">
      <TermsContent />
    </LegalPageShell>
  );
}
