"use client";

import dynamic from "next/dynamic";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { USSettlingRequirementsResult } from "@/lib/hooks/use-settling-requirements";

interface SettlingRequirementsChartProps {
  result: USSettlingRequirementsResult | null;
  isLoading?: boolean;
}

// Dynamically import the chart component with SSR disabled
// This prevents Recharts from being bundled into the Cloudflare Worker
const SettlingRequirementsChartClient = dynamic(
  () =>
    import("./settling-requirements-chart-client").then((mod) => ({
      default: mod.SettlingRequirementsChartClient,
    })),
  {
    ssr: false,
    loading: () => (
      <Card>
        <CardHeader>
          <CardTitle>Cost Breakdown</CardTitle>
          <CardDescription>
            Visual breakdown of estate settling costs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/50 flex h-[300px] items-center justify-center rounded-lg">
            <p className="text-muted-foreground">Loading chart...</p>
          </div>
        </CardContent>
      </Card>
    ),
  },
);

/**
 * Settling Requirements Chart component with dynamic import.
 *
 * This wrapper uses Next.js dynamic import with ssr: false to ensure
 * Recharts and its dependencies are only loaded on the client side,
 * preventing them from being included in the Cloudflare Worker bundle.
 *
 * This reduces the worker bundle size significantly (Recharts + dependencies
 * can add ~500KB+ to the bundle).
 */
export function SettlingRequirementsChart({
  result,
  isLoading,
}: SettlingRequirementsChartProps) {
  return (
    <SettlingRequirementsChartClient result={result} isLoading={isLoading} />
  );
}
