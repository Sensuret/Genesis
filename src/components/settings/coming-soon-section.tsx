"use client";

import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Generic placeholder card used by Settings subsections we've reserved
 * navigation for but haven't built yet. Keeps the IA stable without
 * shipping empty pages.
 */
export function ComingSoonSection({
  title,
  blurb
}: {
  title: string;
  blurb: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardBody className="text-xs text-fg-muted">
        <p>{blurb}</p>
        <p className="mt-2 text-fg-subtle">
          Reserved · controls land in a future release.
        </p>
      </CardBody>
    </Card>
  );
}
