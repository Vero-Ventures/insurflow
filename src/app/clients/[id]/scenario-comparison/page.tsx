"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { SignedIn, SignedOut } from "@daveyplate/better-auth-ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { ScenarioComparisonView } from "@/components/scenario-comparison/scenario-comparison-view";

function ScenarioComparisonContent() {
  const params = useParams();
  const clientId = params.id as string;

  return (
    <div className="container mx-auto max-w-7xl space-y-6 px-4 py-8">
      {/* Back navigation */}
      <div>
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/clients/${clientId}`}>
            <ArrowLeft className="size-4" data-icon="inline-start" />
            Back to Client
          </Link>
        </Button>
      </div>

      <ScenarioComparisonView clientId={clientId} />
    </div>
  );
}

export default function ScenarioComparisonPage() {
  return (
    <>
      <SignedOut>
        <div className="container mx-auto max-w-4xl px-4 py-20">
          <Card>
            <CardHeader>
              <CardTitle>Authentication Required</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Please sign in to view scenario comparison.
              </p>
              <Button asChild>
                <Link href="/auth/sign-in">Sign In</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </SignedOut>

      <SignedIn>
        <ScenarioComparisonContent />
      </SignedIn>
    </>
  );
}
