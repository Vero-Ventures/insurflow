"use client";

import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";
import type { SourceCitation } from "@/lib/transparency/methodology-data";

interface SourceCitationBadgeProps {
  source: SourceCitation;
}

export function SourceCitationBadge({ source }: SourceCitationBadgeProps) {
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group inline-flex"
      title={`${source.title} (Effective: ${source.effectiveDate}, Accessed: ${source.accessedDate})`}
    >
      <Badge
        variant="secondary"
        className="group-hover:bg-secondary/80 cursor-pointer gap-1 transition-colors"
      >
        {source.label}
        <ExternalLink className="h-3 w-3" />
      </Badge>
    </a>
  );
}

interface SourceCitationListProps {
  sources: SourceCitation[];
}

export function SourceCitationList({ sources }: SourceCitationListProps) {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium">Sources & References</h4>
      <div className="space-y-1.5">
        {sources.map((source) => (
          <a
            key={source.url}
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group hover:bg-muted/50 flex items-start gap-2 rounded-md p-2 transition-colors"
          >
            <ExternalLink className="text-muted-foreground group-hover:text-primary mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
            <div>
              <p className="group-hover:text-primary text-sm font-medium">
                {source.title}
              </p>
              <p className="text-muted-foreground text-xs">
                Effective: {source.effectiveDate} · Accessed:{" "}
                {source.accessedDate}
              </p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
