"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Trash2,
  Copy,
  Check,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { toast } from "sonner";
import type { Client } from "@/types/client";
import {
  calculateAge,
  formatDate,
  calculateCompletionStatus,
  getCompletionCount,
} from "@/lib/client-utils";
import { COPY_FEEDBACK_DURATION_MS } from "@/lib/constants";
import { FinancialInputsForm } from "@/components/clients/financial-inputs-form";
import { DebtsSection } from "@/components/clients/debts-section";
import { AssetsSection } from "@/components/clients/assets-section";
import { useInsuranceNeeds } from "@/lib/hooks/use-insurance-needs";
import {
  InsuranceNeedsCard,
  InsuranceNeedsChart,
} from "@/components/clients/insurance-needs";
import { ClientReportView } from "@/components/clients/client-report-view";

function ClientDetailContent() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;

  const [client, setClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [totalAssets, setTotalAssets] = useState(0);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  // Insurance needs calculation hook
  const {
    result: insuranceResult,
    isLoading: isInsuranceLoading,
    error: insuranceError,
    recalculate: recalculateInsurance,
    calculatedAt: insuranceCalculatedAt,
  } = useInsuranceNeeds({
    clientId,
    enabled: !!client,
  });

  useEffect(() => {
    async function fetchClient() {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`/api/clients/${clientId}`);

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("Client not found");
          }
          if (response.status === 401) {
            throw new Error("Unauthorized");
          }
          throw new Error("Failed to fetch client");
        }

        const data = await response.json();
        setClient(data.client);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    }

    fetchClient();
  }, [clientId]);

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      const response = await fetch(`/api/clients/${clientId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete client");
      }

      toast.success("Client deleted successfully");
      router.push("/clients");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete client",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCopyId = async () => {
    if (!client) return;

    try {
      await navigator.clipboard.writeText(client.id);
      setIsCopied(true);
      toast.success("Client ID copied to clipboard");

      // Clear any existing timeout before setting a new one
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
      copyTimeoutRef.current = setTimeout(() => {
        setIsCopied(false);
      }, COPY_FEEDBACK_DURATION_MS);
    } catch {
      toast.error("Failed to copy client ID");
    }
  };

  if (isLoading) {
    return <ClientDetailSkeleton />;
  }

  if (error || !client) {
    return (
      <div className="container mx-auto px-4 pt-20">
        <Card className="mx-auto max-w-2xl">
          <CardHeader>
            <CardTitle>Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-destructive mb-4">
              {error || "Client not found"}
            </p>
            <Button asChild>
              <Link href="/clients">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Clients
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate completion status for sections
  const completionStatus = calculateCompletionStatus(client, insuranceResult);
  const { completed, total } = getCompletionCount(completionStatus);

  return (
    <div className="container mx-auto px-4 pt-20">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" asChild>
            <Link href="/clients">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Clients
            </Link>
          </Button>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-3">
              <h1 className="text-3xl font-bold">
                {client.firstName} {client.lastName}
              </h1>
              <Badge
                variant={completed === total ? "default" : "secondary"}
                className="text-xs"
              >
                {completed}/{total} complete
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-muted-foreground font-mono text-sm">
                Client ID: {client.id}
              </p>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={handleCopyId}
                className="h-6 w-6"
              >
                {isCopied ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            </div>
          </div>

          <div className="flex gap-2">
            <Badge
              variant={
                client.status === "active"
                  ? "default"
                  : client.status === "draft"
                    ? "secondary"
                    : "outline"
              }
            >
              {client.status}
            </Badge>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="icon">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Client</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete {client.firstName}{" "}
                    {client.lastName}? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isDeleting ? "Deleting..." : "Delete"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>

      {/* Tabbed Navigation */}
      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile" className="flex items-center gap-1.5">
            {completionStatus.profile ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <Circle className="text-muted-foreground h-3.5 w-3.5" />
            )}
            Profile
          </TabsTrigger>
          <TabsTrigger value="financial" className="flex items-center gap-1.5">
            {completionStatus.financialInputs ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <Circle className="text-muted-foreground h-3.5 w-3.5" />
            )}
            Financial
          </TabsTrigger>
          <TabsTrigger value="insurance" className="flex items-center gap-1.5">
            {completionStatus.insuranceNeeds ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <Circle className="text-muted-foreground h-3.5 w-3.5" />
            )}
            Insurance
          </TabsTrigger>
          <TabsTrigger value="report">Report</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>
                Basic demographic and contact details
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-muted-foreground text-sm">Full Name</p>
                <p className="font-medium">
                  {client.firstName} {client.lastName}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Date of Birth</p>
                <p className="font-medium">
                  {formatDate(client.dateOfBirth)} (Age:{" "}
                  {calculateAge(client.dateOfBirth)})
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">State</p>
                <p className="font-medium uppercase">{client.state}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Status</p>
                <Badge
                  variant={
                    client.status === "active"
                      ? "default"
                      : client.status === "draft"
                        ? "secondary"
                        : "outline"
                  }
                >
                  {client.status}
                </Badge>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Last Updated</p>
                <p className="font-medium">{formatDate(client.updatedAt)}</p>
              </div>
            </CardContent>
          </Card>

          {/* Assets Section */}
          <AssetsSection clientId={clientId} onTotalsChange={setTotalAssets} />

          {/* Debts Section */}
          <DebtsSection clientId={clientId} totalAssets={totalAssets} />
        </TabsContent>

        {/* Financial Inputs Tab */}
        <TabsContent value="financial" className="space-y-4">
          <FinancialInputsForm
            client={client}
            onUpdate={async (updatedClient) => setClient(updatedClient)}
          />
        </TabsContent>

        {/* Insurance Needs Tab */}
        <TabsContent value="insurance" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <InsuranceNeedsCard
              result={insuranceResult}
              isLoading={isInsuranceLoading}
              error={insuranceError}
              onRecalculate={recalculateInsurance}
              calculatedAt={insuranceCalculatedAt}
            />
            <InsuranceNeedsChart
              result={insuranceResult}
              isLoading={isInsuranceLoading}
            />
          </div>
        </TabsContent>

        {/* Report Tab */}
        <TabsContent value="report" className="space-y-4">
          <ClientReportView client={client} clientId={clientId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ClientDetailSkeleton() {
  return (
    <div className="container mx-auto px-4 pt-20">
      <div className="mb-6 flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-32" />
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Skeleton className="mb-2 h-8 w-48" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-72" />
              <Skeleton className="h-6 w-6" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-10 w-10" />
          </div>
        </div>
      </div>

      <Skeleton className="mb-4 h-10 w-full" />

      <Card>
        <CardHeader>
          <Skeleton className="mb-2 h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i}>
              <Skeleton className="mb-2 h-4 w-24" />
              <Skeleton className="h-5 w-32" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export default function ClientDetailPage() {
  return (
    <>
      <SignedOut>
        <div className="flex min-h-screen items-center justify-center">
          <Card className="w-96">
            <CardHeader>
              <CardTitle>Authentication Required</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Please sign in to view client details.
              </p>
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
        <ClientDetailContent />
      </SignedIn>
    </>
  );
}
