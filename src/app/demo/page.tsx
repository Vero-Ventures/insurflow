"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Sparkles } from "lucide-react";
import { ClientReportView } from "@/components/clients/client-report-view";
import {
  demoClient,
  demoAssets,
  demoDebts,
  demoInsuranceResult,
  demoLetter,
} from "@/lib/demo-data";

/**
 * Demo page showing a pre-populated sample client report.
 * Allows prospects to explore the app without authentication.
 */
export default function DemoPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Demo Header */}
      <div className="mb-6 flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" asChild>
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Link>
          </Button>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">Demo Report</h1>
            <Badge variant="secondary" className="flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              Sample Data
            </Badge>
          </div>
          <p className="text-muted-foreground max-w-2xl text-sm">
            This is a sample client report showing how InsurFlow analyzes
            financial needs. The data below represents a typical mid-career
            professional with a family. Sign up to create your own client
            analyses.
          </p>
        </div>
      </div>

      {/* Demo Report View */}
      <ClientReportView
        client={demoClient}
        clientId={demoClient.id}
        demoAssets={demoAssets}
        demoDebts={demoDebts}
        demoInsuranceResult={demoInsuranceResult}
        demoLetter={demoLetter}
      />

      {/* CTA Section */}
      <div className="bg-muted mt-8 rounded-lg border p-6 text-center print:hidden">
        <h2 className="text-foreground mb-2 text-xl font-semibold">
          Ready to create your own analyses?
        </h2>
        <p className="text-muted-foreground mb-4 text-sm">
          Sign up for free and start building financial needs reports for your
          clients.
        </p>
        <div className="flex justify-center gap-3">
          <Button asChild>
            <Link href="/auth/sign-up">Get Started Free</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/auth/sign-in">Sign In</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
