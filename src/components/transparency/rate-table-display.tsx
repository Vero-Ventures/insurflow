"use client";

import { useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, TableProperties } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  RateTableSection,
  StateRateTable,
} from "@/lib/transparency/rate-tables";

function RateTableSectionView({ section }: { section: RateTableSection }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">{section.title}</h4>
        <Badge variant="outline" className="text-xs">
          Effective {section.effectiveDate}
        </Badge>
      </div>
      <div className="overflow-hidden rounded-md border">
        <table className="w-full text-sm">
          <tbody>
            {section.rows.map((row, i) => (
              <tr
                key={row.label}
                className={cn(
                  "border-b last:border-b-0",
                  i % 2 === 0 ? "bg-muted/20" : "bg-background",
                )}
              >
                <th
                  scope="row"
                  className="text-muted-foreground px-3 py-2 text-left font-medium"
                >
                  {row.label}
                </th>
                <td className="px-3 py-2 text-right">
                  <span>{row.value}</span>
                  {row.note && (
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      {row.note}
                    </p>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface RateTableDisplayProps {
  rateTable: StateRateTable;
  defaultOpen?: boolean;
}

export function RateTableDisplay({
  rateTable,
  defaultOpen = false,
}: RateTableDisplayProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-border/60">
        <CollapsibleTrigger asChild>
          <CardHeader className="hover:bg-muted/50 cursor-pointer transition-colors select-none">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TableProperties className="text-muted-foreground h-4 w-4" />
                <CardTitle className="text-sm font-medium">
                  {rateTable.stateName} Rate Table
                </CardTitle>
              </div>
              <ChevronDown
                className={cn(
                  "text-muted-foreground h-4 w-4 transition-transform duration-200",
                  isOpen && "rotate-180",
                )}
              />
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            {rateTable.sections.map((section) => (
              <RateTableSectionView key={section.title} section={section} />
            ))}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
