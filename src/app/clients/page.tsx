"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SignedIn, SignedOut } from "@daveyplate/better-auth-ui";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Client = {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  province: string;
  updatedAt: string;
  status: "draft" | "active" | "archived";
};

function calculateAge(dateOfBirth: string): number {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }

  return age;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[...new Array(5)].map((_, i) => (
        <div key={`skeleton-${i}`} className="flex space-x-4">
          <Skeleton className="h-12 w-full" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({
  message,
  showSeedButton,
  onSeed,
  isSeeding,
}: {
  readonly message: string;
  readonly showSeedButton?: boolean;
  readonly onSeed?: () => void;
  readonly isSeeding?: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="bg-muted mb-4 rounded-full p-4">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="text-muted-foreground h-12 w-12"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      </div>
      <h3 className="mb-2 text-lg font-semibold">No Clients Found</h3>
      <p className="text-muted-foreground mb-4 max-w-sm">{message}</p>
      {showSeedButton && (
        <Button onClick={onSeed} disabled={isSeeding}>
          {isSeeding ? "Seeding..." : "Seed Test Clients"}
        </Button>
      )}
    </div>
  );
}

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);

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
        setFilteredClients(data.clients || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    }

    fetchClients();
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredClients(clients);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = clients.filter((client) => {
      const fullName = `${client.firstName} ${client.lastName}`.toLowerCase();
      return fullName.includes(query);
    });

    setFilteredClients(filtered);
  }, [searchQuery, clients]);

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
        setFilteredClients(refreshData.clients || []);
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
          <Card className="w-100">
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
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle>Client List</CardTitle>
                <div className="w-full sm:w-75">
                  <Input
                    type="search"
                    placeholder="Search clients by name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading && <LoadingSkeleton />}

              {!isLoading && error && (
                <div className="border-destructive/50 bg-destructive/10 rounded-lg border p-4">
                  <p className="text-destructive text-sm">
                    Error loading clients: {error}
                  </p>
                </div>
              )}

              {!isLoading && !error && filteredClients.length === 0 && (
                <EmptyState
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
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Age</TableHead>
                        <TableHead>Province</TableHead>
                        <TableHead>Last Updated</TableHead>
                        <TableHead>Insurance Needs</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredClients.map((client) => (
                        <TableRow
                          key={client.id}
                          className="hover:bg-muted/50 cursor-pointer"
                          onClick={() => handleRowClick(client.id)}
                        >
                          <TableCell className="font-medium">
                            {client.firstName} {client.lastName}
                          </TableCell>
                          <TableCell>
                            {calculateAge(client.dateOfBirth)}
                          </TableCell>
                          <TableCell className="uppercase">
                            {client.province}
                          </TableCell>
                          <TableCell>{formatDate(client.updatedAt)}</TableCell>
                          <TableCell className="text-muted-foreground">
                            N/A
                          </TableCell>
                          <TableCell>
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
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </SignedIn>
    </>
  );
}
