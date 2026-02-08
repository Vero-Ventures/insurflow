"use client";

import { DollarSign, Droplet, TrendingUp } from "lucide-react";
import type { Asset } from "@/types/asset";
import { formatCurrency, calculateAssetTotals } from "@/lib/client-utils";

interface AssetsSummaryProps {
  items: Asset[];
}

export function AssetsSummary({ items }: AssetsSummaryProps) {
  const totals = calculateAssetTotals(items);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="bg-muted/30 rounded-xl border p-5">
        <div className="text-muted-foreground mb-2 flex items-center gap-2 text-sm">
          <div className="bg-asset/10 flex h-8 w-8 items-center justify-center rounded-lg">
            <DollarSign className="text-asset h-4 w-4" />
          </div>
          <p className="font-medium">Total Assets</p>
        </div>
        <p className="font-currency text-foreground text-2xl font-bold">
          {formatCurrency(totals.total)}
        </p>
      </div>

      <div className="bg-muted/30 rounded-xl border p-5">
        <div className="text-muted-foreground mb-2 flex items-center gap-2 text-sm">
          <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-lg">
            <Droplet className="text-primary h-4 w-4" />
          </div>
          <p className="font-medium">Liquid Assets</p>
        </div>
        <p className="font-currency text-foreground text-2xl font-bold">
          {formatCurrency(totals.liquid)}
        </p>
        {totals.total > 0 && (
          <p className="text-muted-foreground mt-1 flex items-center gap-1 text-xs">
            <TrendingUp className="h-3 w-3" />
            {Math.round((totals.liquid / totals.total) * 100)}% of total assets
          </p>
        )}
      </div>
    </div>
  );
}
