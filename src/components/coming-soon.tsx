import { PageHeader } from "@/components/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

export function ComingSoon({
  title,
  description,
  phase
}: {
  title: string;
  description: string;
  phase: string;
}) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} description={description} />
      <Card>
        <CardBody className="flex flex-col items-center gap-3 py-16 text-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500/15 text-brand-300">
            <Sparkles className="h-5 w-5" />
          </span>
          <div className="text-lg font-semibold">In active development</div>
          <p className="max-w-md text-sm text-fg-muted">
            This page is part of the {phase} rollout — full functionality is being assembled and will land
            in the next PR.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
