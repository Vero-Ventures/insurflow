"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SignedIn, SignedOut } from "@daveyplate/better-auth-ui";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Search,
  Users,
  TrendingUp,
  FileText,
  ArrowUpRight,
} from "lucide-react";
import type { Client } from "@/types/client";
import { useDebounce } from "@/lib/hooks/use-debounce";
import { ClientsTableSkeleton } from "@/components/clients/clients-table-skeleton";
import { ClientsEmptyState } from "@/components/clients/clients-empty-state";
import { ClientsTable } from "@/components/clients/clients-table";
import { CreateClientDialog } from "@/components/clients/create/clients-create-client";
import { Button } from "@/components/ui/button";

// Optimistic client type for showing pending creations
type OptimisticClient = Client & {
  optimistic?: boolean;
};

// Quick stats card component
function StatCard({
  icon: Icon,
  label,
  value,
  trend,
  delay,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  trend?: string;
  delay: string;
}) {
  return (
    <Card
      className={`animate-fade-up border-border/60 bg-card/80 backdrop-blur-sm ${delay}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="bg-primary/5 flex h-10 w-10 items-center justify-center rounded-lg">
            <Icon className="text-primary h-5 w-5" />
          </div>
          {trend && (
            <span className="text-emerald flex items-center gap-0.5 text-xs font-medium">
              <ArrowUpRight className="h-3 w-3" />
              {trend}
            </span>
          )}
        </div>
        <div className="mt-3">
          <p className="font-display text-foreground text-2xl font-semibold tracking-tight">
            {value}
          </p>
          <p className="text-muted-foreground mt-0.5 text-sm">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [optimisticClients, setOptimisticClients] = useState<
    OptimisticClient[]
  >([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Debounce search query for better performance
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  useEffect(() => {
    async function fetchClients() {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch("/api/clients", {
          credentials: "include",
        });

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error("Please sign in to view your clients");
          }
          if (response.status === 500) {
            throw new Error(
              "Server error. Please try again later or contact support.",
            );
          }
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error || `Failed to fetch clients (${response.status})`,
          );
        }

        const data = await response.json();
        setClients(data.clients || []);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "An unexpected error occurred";
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    }

    fetchClients();
  }, []);

  // Combine real clients with optimistic clients
  const allClients = useMemo(() => {
    return [...optimisticClients, ...clients];
  }, [optimisticClients, clients]);

  // Filter clients using memoized derived state
  const filteredClients = useMemo(() => {
    if (!debouncedSearchQuery.trim()) {
      return allClients;
    }

    const query = debouncedSearchQuery.toLowerCase();
    return allClients.filter((client) => {
      const fullName = `${client.firstName} ${client.lastName}`.toLowerCase();
      return fullName.includes(query);
    });
  }, [debouncedSearchQuery, allClients]);

  // Calculate quick stats
  const stats = useMemo(() => {
    const activeClients = clients.filter((c) => c.status === "active").length;
    const draftClients = clients.filter((c) => c.status === "draft").length;
    return {
      total: clients.length,
      active: activeClients,
      drafts: draftClients,
    };
  }, [clients]);

  const handleRowClick = (clientId: string) => {
    router.push(`/clients/${clientId}`);
  };

  // Callback to handle optimistic client creation
  const handleOptimisticCreate = useCallback(
    (clientData: {
      firstName: string;
      lastName: string;
      dateOfBirth: string;
      state: string;
    }) => {
      const optimisticClient: OptimisticClient = {
        id: `optimistic-${Date.now()}`,
        firstName: clientData.firstName,
        lastName: clientData.lastName,
        dateOfBirth: clientData.dateOfBirth,
        state: clientData.state,
        updatedAt: new Date().toISOString(),
        status: "draft",
        optimistic: true,
      };

      setOptimisticClients((prev) => [optimisticClient, ...prev]);

      return optimisticClient.id;
    },
    [],
  );

  // Callback to remove optimistic client after real one is created
  const handleOptimisticSuccess = useCallback(
    (optimisticId: string, realClient: unknown) => {
      // Remove the optimistic client
      setOptimisticClients((prev) =>
        prev.filter((client) => client.id !== optimisticId),
      );

      // Add the real client to the top of the list
      setClients((prev) => [realClient as Client, ...prev]);
    },
    [],
  );

  // Callback to handle optimistic creation failure
  const handleOptimisticError = useCallback((optimisticId: string) => {
    setOptimisticClients((prev) =>
      prev.filter((client) => client.id !== optimisticId),
    );
  }, []);

  return (
    <>
      <SignedOut>
        <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center p-4">
          {/* Background gradient */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute top-0 right-0 h-[400px] w-[400px] rounded-full bg-gradient-to-br from-[oklch(0.35_0.08_250_/_0.08)] to-transparent blur-3xl" />
            <div className="absolute bottom-0 left-0 h-[300px] w-[300px] rounded-full bg-gradient-to-tr from-[oklch(0.696_0.17_162.48_/_0.06)] to-transparent blur-3xl" />
          </div>

          <Card className="animate-fade-up relative z-10 w-full max-w-md border-0 bg-white/80 text-center shadow-xl backdrop-blur-sm dark:bg-[oklch(0.2_0.025_250_/_0.9)]">
            <CardContent className="p-8">
              <div className="bg-primary/5 mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl">
                <Users className="text-primary h-8 w-8" />
              </div>
              <h2 className="font-display text-foreground mb-2 text-2xl font-semibold tracking-tight">
                Authentication Required
              </h2>
              <p className="text-muted-foreground mb-6">
                Sign in to access your client portfolio and financial analysis
                tools.
              </p>
              <Button asChild size="lg" className="w-full">
                <Link href="/auth/sign-in">Sign In to Continue</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </SignedOut>

      <SignedIn>
        <div className="min-h-[calc(100vh-3.5rem)]">
          {/* Background gradient mesh */}
          <div className="pointer-events-none fixed inset-0 overflow-hidden">
            <div className="absolute -top-32 -right-32 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-[oklch(0.35_0.08_250_/_0.06)] to-transparent blur-3xl" />
            <div className="absolute -bottom-32 -left-32 h-[400px] w-[400px] rounded-full bg-gradient-to-tr from-[oklch(0.696_0.17_162.48_/_0.04)] to-transparent blur-3xl" />
          </div>

          <div className="relative z-10 container mx-auto px-4 py-8 lg:px-8">
            {/* Page Header */}
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="animate-fade-up">
                <h1 className="font-display text-foreground text-3xl font-semibold tracking-tight lg:text-4xl">
                  Client Portfolio
                </h1>
                <p className="text-muted-foreground mt-1 text-base">
                  Manage financial analyses and insurance recommendations
                </p>
              </div>
              <div className="animate-fade-up animation-delay-100">
                <CreateClientDialog
                  onOptimisticCreate={handleOptimisticCreate}
                  onOptimisticSuccess={handleOptimisticSuccess}
                  onOptimisticError={handleOptimisticError}
                />
              </div>
            </div>

            {/* Quick Stats Row */}
            {!isLoading && !error && clients.length > 0 && (
              <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <StatCard
                  icon={Users}
                  label="Total Clients"
                  value={stats.total}
                  delay="animation-delay-100"
                />
                <StatCard
                  icon={TrendingUp}
                  label="Active Analyses"
                  value={stats.active}
                  trend={
                    stats.active > 0
                      ? `${Math.round((stats.active / stats.total) * 100)}%`
                      : undefined
                  }
                  delay="animation-delay-200"
                />
                <StatCard
                  icon={FileText}
                  label="Drafts in Progress"
                  value={stats.drafts}
                  delay="animation-delay-300"
                />
              </div>
            )}

            {/* Search Bar */}
            <div className="animate-fade-up animation-delay-200 mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full sm:w-80">
                <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                <Input
                  type="search"
                  placeholder="Search by client name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="border-border/60 bg-card/80 h-10 pl-10 backdrop-blur-sm"
                />
              </div>
              {!isLoading && clients.length > 0 && (
                <p className="text-muted-foreground text-sm">
                  Showing{" "}
                  <span className="text-foreground font-medium">
                    {filteredClients.length}
                  </span>{" "}
                  of{" "}
                  <span className="text-foreground font-medium">
                    {allClients.length}
                  </span>{" "}
                  clients
                </p>
              )}
            </div>

            {/* Content Area */}
            <Card className="animate-fade-up animation-delay-300 border-border/60 overflow-hidden shadow-sm">
              <CardContent className="p-0">
                {isLoading && (
                  <div className="p-6">
                    <ClientsTableSkeleton />
                  </div>
                )}

                {!isLoading && error && (
                  <div className="p-6">
                    <div className="border-destructive/30 bg-destructive/5 rounded-lg border p-4">
                      <p className="text-destructive text-sm font-medium">
                        Unable to load clients
                      </p>
                      <p className="text-destructive/80 mt-1 text-sm">
                        {error}
                      </p>
                    </div>
                  </div>
                )}

                {!isLoading && !error && filteredClients.length === 0 && (
                  <div className="p-8">
                    <ClientsEmptyState
                      message={
                        searchQuery
                          ? `No clients match "${searchQuery}"`
                          : "Start building your client portfolio"
                      }
                    />
                  </div>
                )}

                {!isLoading && !error && filteredClients.length > 0 && (
                  <div className="overflow-x-auto">
                    <ClientsTable
                      clients={filteredClients}
                      onRowClick={handleRowClick}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </SignedIn>
    </>
  );
}
