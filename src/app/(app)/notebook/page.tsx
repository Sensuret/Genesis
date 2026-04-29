"use client";

import { PageHeader } from "@/components/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty } from "@/components/ui/empty";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

export default function NotebookPage() {
  const url = process.env.NEXT_PUBLIC_NOTION_EMBED_URL;
  return (
    <div className="space-y-6">
      <PageHeader
        title="Notebook"
        description="Embedded Notion workspace for your trade journal, sessions recap, plans and notes."
        actions={
          url ? (
            <a href={url} target="_blank" rel="noreferrer">
              <Button variant="secondary"><ExternalLink className="h-4 w-4" /> Open in Notion</Button>
            </a>
          ) : null
        }
      />

      {url ? (
        <Card>
          <CardHeader><CardTitle>Notion</CardTitle></CardHeader>
          <CardBody>
            <iframe
              src={url}
              title="Genesis Notebook"
              className="h-[calc(100vh-220px)] w-full rounded-xl border border-line bg-white"
            />
          </CardBody>
        </Card>
      ) : (
        <Empty
          title="No Notion page configured"
          description="Set NEXT_PUBLIC_NOTION_EMBED_URL in your environment to embed your shared Notion page here."
        />
      )}
    </div>
  );
}
