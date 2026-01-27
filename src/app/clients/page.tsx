"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SignedIn, SignedOut } from "@daveyplate/better-auth-ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import type { Client } from "@/types/client";
import { useDebounce } from "@/lib/hooks/use-debounce";
import { ClientsTableSkeleton } from "@/components/clients/clients-table-skeleton";
import { ClientsEmptyState } from "@/components/clients/clients-empty-state";
import { ClientsTableHeader } from "@/components/clients/clients-table-header";
import { ClientsTable } from "@/components/clients/clients-table";

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);

  // Debounce search query for better performance
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  useEffect(() => {
    async function fetchClients() {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch("/api/clients");

        if (!response.ok) {
          throw new Error("Failed to fetch clients");
        }

        const data = await response.json();
        setClients(data.clients || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    }

    fetchClients();
  }, []);

  // Filter clients using memoized derived state
  const filteredClients = useMemo(() => {
    if (!debouncedSearchQuery.trim()) {
      return clients;
    }

    const query = debouncedSearchQuery.toLowerCase();
    return clients.filter((client) => {
      const fullName = `${client.firstName} ${client.lastName}`.toLowerCase();
      return fullName.includes(query);
    });
  }, [debouncedSearchQuery, clients]);

  const handleRowClick = (clientId: string) => {
    router.push(`/clients/${clientId}`);
  };

  const handleSeedClients = async () => {
    try {
      setIsSeeding(true);
      const response = await fetch("/api/clients/seed", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to seed clients");
      }

      const data = await response.json();
      toast.success(data.message);

      // Refresh the client list
      const refreshResponse = await fetch("/api/clients");
      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json();
        setClients(refreshData.clients || []);
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to seed clients",
      );
    } finally {
      setIsSeeding(false);
    }
  };

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
                Please sign in to view your clients.
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
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="mb-2 text-3xl font-bold">Clients</h1>
            <p className="text-muted-foreground">
              Manage your client portfolio and financial analyses
            </p>
          </div>

          <Card>
            <CardHeader>
              <ClientsTableHeader
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
              />
            </CardHeader>
            <CardContent>
              {isLoading && <ClientsTableSkeleton />}

              {!isLoading && error && (
                <div className="border-destructive/50 bg-destructive/10 rounded-lg border p-4">
                  <p className="text-destructive text-sm">
                    Error loading clients: {error}
                  </p>
                </div>
              )}

              {!isLoading && !error && filteredClients.length === 0 && (
                <ClientsEmptyState
                  message={
                    searchQuery
                      ? `No clients match "${searchQuery}". Try a different search term.`
                      : "Get started by creating your first client profile."
                  }
                  showSeedButton={!searchQuery && clients.length === 0}
                  onSeed={handleSeedClients}
                  isSeeding={isSeeding}
                />
              )}

              {!isLoading && !error && filteredClients.length > 0 && (
                <ClientsTable
                  clients={filteredClients}
                  onRowClick={handleRowClick}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </SignedIn>
    </>
  );
}
