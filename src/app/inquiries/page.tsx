"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SignedIn, SignedOut } from "@daveyplate/better-auth-ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Eye,
  CheckCircle2,
  UserPlus,
  Archive,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  INQUIRY_STATUS_LABELS,
  INQUIRY_STATUS_COLORS,
  type Inquiry,
  type InquiryStatus,
} from "@/types/inquiry";

interface InquiryWithEstimate extends Inquiry {
  estimatedCoverageNeed: string | null;
}

function InquiriesContent() {
  const [inquiries, setInquiries] = useState<InquiryWithEstimate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    fetchInquiries();
  }, []);

  const fetchInquiries = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/inquiries", {
        credentials: "include",
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Please sign in to view inquiries");
        }
        throw new Error("Failed to fetch inquiries");
      }

      const data = await response.json();
      setInquiries(data.inquiries || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusUpdate = async (
    inquiryId: string,
    status: InquiryStatus,
  ) => {
    setUpdatingId(inquiryId);
    try {
      const response = await fetch(`/api/inquiries/${inquiryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error("Failed to update inquiry");
      }

      toast.success(`Inquiry marked as ${INQUIRY_STATUS_LABELS[status]}`);
      fetchInquiries();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setUpdatingId(null);
    }
  };

  const formatCurrency = (value: string | null | undefined) => {
    if (!value) return "—";
    const num = Number(value);
    if (isNaN(num)) return "—";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(num);
  };

  if (isLoading) {
    return <InquiriesSkeleton />;
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 pt-20">
        <Card className="mx-auto max-w-2xl">
          <CardHeader>
            <CardTitle>Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={fetchInquiries}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 pt-20">
      <div className="mb-6 flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Inquiries</h1>
            <p className="text-muted-foreground">
              Manage leads from potential clients
            </p>
          </div>
          <Badge variant="secondary" className="self-start">
            {inquiries.length} total
          </Badge>
        </div>
      </div>

      {inquiries.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">
              No inquiries yet. Share your estimate with potential clients to
              get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Coverage Need</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inquiries.map((inquiry) => (
                <TableRow key={inquiry.id}>
                  <TableCell className="font-medium">
                    {inquiry.firstName} {inquiry.lastName}
                  </TableCell>
                  <TableCell>{inquiry.email}</TableCell>
                  <TableCell>
                    <Badge className={INQUIRY_STATUS_COLORS[inquiry.status]}>
                      {INQUIRY_STATUS_LABELS[inquiry.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {formatCurrency(inquiry.estimatedCoverageNeed)}
                  </TableCell>
                  <TableCell>
                    {new Date(inquiry.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStatusUpdate(inquiry.id, "viewed")}
                        disabled={updatingId === inquiry.id}
                        title="Mark as Viewed"
                      >
                        {updatingId === inquiry.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleStatusUpdate(inquiry.id, "claimed")
                        }
                        disabled={updatingId === inquiry.id}
                        title="Claim Inquiry"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleStatusUpdate(inquiry.id, "converted")
                        }
                        disabled={updatingId === inquiry.id}
                        title="Convert to Client"
                      >
                        <UserPlus className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleStatusUpdate(inquiry.id, "archived")
                        }
                        disabled={updatingId === inquiry.id}
                        title="Archive"
                      >
                        <Archive className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

function InquiriesSkeleton() {
  return (
    <div className="container mx-auto px-4 pt-20">
      <div className="mb-6 space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-8 w-64" />
      </div>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Coverage Need</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }, (_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <Skeleton className="h-5 w-32" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-40" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-20" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-24" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-24" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-8 w-8" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

export default function InquiriesPage() {
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
                Please sign in to view inquiries.
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
        <InquiriesContent />
      </SignedIn>
    </>
  );
}
