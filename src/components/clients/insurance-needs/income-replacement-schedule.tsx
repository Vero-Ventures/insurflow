"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChevronDown, ChevronUp, TableIcon } from "lucide-react";
import { formatCurrency } from "@/lib/client-utils";
import type { AnnualScheduleEntry } from "@/lib/financial/income-replacement";

interface IncomeReplacementScheduleProps {
  schedule: AnnualScheduleEntry[];
  /** Maximum rows to show before the "Show All" button. Default: 5 */
  previewRows?: number;
}

/**
 * Collapsible year-by-year schedule table for the advanced
 * income replacement calculator.
 */
export function IncomeReplacementSchedule({
  schedule,
  previewRows = 5,
}: IncomeReplacementScheduleProps) {
  const [expanded, setExpanded] = useState(false);

  if (schedule.length === 0) return null;

  const visibleRows = expanded ? schedule : schedule.slice(0, previewRows);
  const hasMore = schedule.length > previewRows;

  // Totals for the footer
  const totalIncomeNeed = schedule.reduce((s, r) => s + r.incomeNeed, 0);
  const totalSurvivorOffset = schedule.reduce(
    (s, r) => s + r.survivorOffset,
    0,
  );
  const totalNetNeed = schedule.reduce((s, r) => s + r.netNeed, 0);
  const totalNetNeedPV = schedule.reduce((s, r) => s + r.netNeedPV, 0);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <TableIcon className="text-muted-foreground h-4 w-4" />
        <h4 className="text-foreground text-sm font-semibold">
          Year-by-Year Schedule
        </h4>
        <span className="text-muted-foreground text-xs">
          ({schedule.length} years)
        </span>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Year</TableHead>
              <TableHead className="text-right">Income Need</TableHead>
              <TableHead className="text-right">Survivor Offset</TableHead>
              <TableHead className="text-right">Net Need</TableHead>
              <TableHead className="text-right">Net Need (PV)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleRows.map((row) => (
              <TableRow key={row.year}>
                <TableCell className="font-medium">{row.year}</TableCell>
                <TableCell className="font-currency text-right">
                  {formatCurrency(row.incomeNeed)}
                </TableCell>
                <TableCell className="font-currency text-right">
                  {formatCurrency(row.survivorOffset)}
                </TableCell>
                <TableCell className="font-currency text-right">
                  {formatCurrency(row.netNeed)}
                </TableCell>
                <TableCell className="font-currency text-right">
                  {formatCurrency(row.netNeedPV)}
                </TableCell>
              </TableRow>
            ))}

            {/* Totals row */}
            {expanded && (
              <TableRow className="bg-muted/30 font-semibold">
                <TableCell>Total</TableCell>
                <TableCell className="font-currency text-right">
                  {formatCurrency(totalIncomeNeed)}
                </TableCell>
                <TableCell className="font-currency text-right">
                  {formatCurrency(totalSurvivorOffset)}
                </TableCell>
                <TableCell className="font-currency text-right">
                  {formatCurrency(totalNetNeed)}
                </TableCell>
                <TableCell className="font-currency text-right">
                  {formatCurrency(totalNetNeedPV)}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {hasMore && (
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground w-full gap-1.5 text-xs"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3.5 w-3.5" />
              Show Less
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5" />
              Show All {schedule.length} Years
            </>
          )}
        </Button>
      )}
    </div>
  );
}
