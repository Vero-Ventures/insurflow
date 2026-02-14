"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { SignedIn, SignedOut } from "@daveyplate/better-auth-ui";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Building2 } from "lucide-react";
import { formatCurrency } from "@/lib/constants";
import { BUSINESS_TYPE_LABELS } from "@/lib/validation/business";
import { KeyPeopleSection } from "@/components/clients/key-people-section";
import { ShareholdersSection } from "@/components/clients/shareholders-section";
import { InsuranceNeedsSection } from "@/components/clients/insurance-needs-section";
import type { Business } from "@/types/business";

function BusinessDetailContent() {
  const params = useParams();
  const clientId = params.id as string;
  const businessId = params.businessId as string;

  const [business, setBusiness] = useState<Business | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBusiness() {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(
          `/api/clients/${clientId}/businesses/${businessId}`,
          { credentials: "include" },
        );

        if (!response.ok) {
          if (response.status === 404) throw new Error("Business not found");
          if (response.status === 401) throw new Error("Unauthorized");
          throw new Error("Failed to fetch business");
        }

        const data = await response.json();
        setBusiness(data.data?.business || data.business || data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    }

    fetchBusiness();
  }, [clientId, businessId]);

  if (isLoading) {
    return <BusinessDetailSkeleton clientId={clientId} />;
  }

  if (error || !business) {
    return (
      <div className="container mx-auto px-4 pt-20">
        <Card className="mx-auto max-w-2xl">
          <CardHeader>
            <CardTitle>Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-destructive mb-4">
              {error || "Business not found"}
            </p>
            <Button asChild>
              <Link href={`/clients/${clientId}`}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Client
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const valuation =
    typeof business.valuation === "string"
      ? parseFloat(business.valuation)
      : business.valuation;

  return (
    <div className="container mx-auto px-4 pt-20">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" asChild>
            <Link href={`/clients/${clientId}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Client
            </Link>
          </Button>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-primary/10 flex h-12 w-12 items-center justify-center rounded-xl">
              <Building2 className="text-primary h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">{business.name}</h1>
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  {BUSINESS_TYPE_LABELS[
                    business.type as keyof typeof BUSINESS_TYPE_LABELS
                  ] || business.type}
                </Badge>
                <span className="text-muted-foreground text-sm">
                  Valuation:{" "}
                  <span className="text-foreground font-semibold">
                    {formatCurrency(
                      isNaN(valuation as number) ? 0 : (valuation as number),
                    )}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabbed Sub-resources */}
      <Tabs defaultValue="key-people" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="key-people">Key People</TabsTrigger>
          <TabsTrigger value="shareholders">Shareholders</TabsTrigger>
          <TabsTrigger value="insurance-needs">Insurance Needs</TabsTrigger>
        </TabsList>

        <TabsContent value="key-people" className="space-y-4">
          <KeyPeopleSection clientId={clientId} businessId={businessId} />
        </TabsContent>

        <TabsContent value="shareholders" className="space-y-4">
          <ShareholdersSection clientId={clientId} businessId={businessId} />
        </TabsContent>

        <TabsContent value="insurance-needs" className="space-y-4">
          <InsuranceNeedsSection clientId={clientId} businessId={businessId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function BusinessDetailSkeleton({ clientId }: { clientId: string }) {
  return (
    <div className="container mx-auto px-4 pt-20">
      <div className="mb-6 flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" asChild>
            <Link href={`/clients/${clientId}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Client
            </Link>
          </Button>
        </div>
        <div className="flex items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-xl" />
          <div>
            <Skeleton className="mb-2 h-8 w-48" />
            <Skeleton className="h-5 w-64" />
          </div>
        </div>
      </div>
      <Skeleton className="mb-4 h-10 w-full" />
      <Card>
        <CardHeader>
          <Skeleton className="mb-2 h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

export default function BusinessDetailPage() {
  return (
    <>
      <SignedOut>
        <div className="flex min-h-screen items-center justify-center">
          <Card className="w-96">
            <CardHeader>
              <CardTitle>Authentication Required</CardTitle>
              <CardDescription>
                Please sign in to view business details.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/auth/sign-in"
                className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium"
              >
                Sign In
              </Link>
            </CardContent>
          </Card>
        </div>
      </SignedOut>

      <SignedIn>
        <BusinessDetailContent />
      </SignedIn>
    </>
  );
}
