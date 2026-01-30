"use client";

import dynamic from "next/dynamic";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { InsuranceNeedsResult } from "@/lib/hooks/use-insurance-needs";

interface InsuranceNeedsChartProps {
  result: InsuranceNeedsResult | null;
  isLoading?: boolean;
}

// Dynamically import the chart component with SSR disabled
// This prevents Recharts from being bundled into the Cloudflare Worker
const InsuranceNeedsChartClient = dynamic(
  () =>
    import("./insurance-needs-chart-client").then((mod) => ({
      default: mod.InsuranceNeedsChartClient,
    })),
  {
    ssr: false,
    loading: () => (
      <Card>
        <CardHeader>
          <CardTitle>Needs Composition</CardTitle>
          <CardDescription>
            Visual breakdown of gross insurance needs
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
 * Insurance Needs Chart component with dynamic import.
 *
 * This wrapper uses Next.js dynamic import with ssr: false to ensure
 * Recharts and its dependencies are only loaded on the client side,
 * preventing them from being included in the Cloudflare Worker bundle.
 *
 * This reduces the worker bundle size significantly (Recharts + dependencies
 * can add ~500KB+ to the bundle).
 */
export function InsuranceNeedsChart({
  result,
  isLoading,
}: InsuranceNeedsChartProps) {
  return <InsuranceNeedsChartClient result={result} isLoading={isLoading} />;
}
