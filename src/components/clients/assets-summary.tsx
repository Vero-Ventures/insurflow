"use client";

import { DollarSign, Droplet } from "lucide-react";
import type { Asset } from "@/types/asset";
import { formatCurrency, calculateAssetTotals } from "@/lib/client-utils";

interface AssetsSummaryProps {
  items: Asset[];
}

export function AssetsSummary({ items }: AssetsSummaryProps) {
  const totals = calculateAssetTotals(items);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="bg-muted/50 rounded-lg border p-4">
        <div className="text-muted-foreground mb-1 flex items-center gap-2 text-sm">
          <DollarSign className="h-4 w-4" />
          <p>Total Assets</p>
        </div>
        <p className="text-2xl font-bold">{formatCurrency(totals.total)}</p>
      </div>

      <div className="bg-muted/50 rounded-lg border p-4">
        <div className="text-muted-foreground mb-1 flex items-center gap-2 text-sm">
          <Droplet className="h-4 w-4" />
          <p>Total Liquid Assets</p>
        </div>
        <p className="text-2xl font-bold">{formatCurrency(totals.liquid)}</p>
      </div>
    </div>
  );
}
