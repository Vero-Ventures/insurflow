"use client";

import { useEffect } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error:", error.digest ?? error.message);
  }, [error]);

  return (
    <main className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4 py-10">
      <Card className="border-destructive/40 w-full max-w-md">
        <CardHeader className="space-y-2 text-center">
          <CardTitle className="text-xl">
            Unable to load your dashboard
          </CardTitle>
          <p className="text-muted-foreground text-sm">
            Something went wrong while loading your dashboard. This is usually
            temporary.
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button onClick={reset}>Try again</Button>
          <Button variant="outline" asChild>
            <Link href="/onboarding">Return to onboarding</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
