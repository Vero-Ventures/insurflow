"use client";

import { useEffect, useState, useCallback } from "react";
import type { AuditEntityType, AuditAction } from "@/server/db/schemas";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

interface AuditLogEntry {
  id: string;
  entityType: AuditEntityType;
  entityId: string;
  action: AuditAction;
  userId: string | null;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  changedFields: string[] | null;
  ipAddress: string | null;
  userAgent: string | null;
  requestId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
  } | null;
}

interface AuditHistoryResponse {
  entityType: AuditEntityType;
  entityId: string;
  history: AuditLogEntry[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

interface EntityChangeHistoryProps {
  entityType: AuditEntityType;
  entityId: string;
  className?: string;
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

/**
 * Badge component for displaying action types with appropriate styling
 */
function ActionBadge({ action }: { action: AuditAction }) {
  const variants: Record<
    AuditAction,
    "default" | "success" | "destructive" | "secondary"
  > = {
    create: "success",
    update: "default",
    delete: "destructive",
    restore: "secondary",
  };

  const labels: Record<AuditAction, string> = {
    create: "Created",
    update: "Updated",
    delete: "Deleted",
    restore: "Restored",
  };

  return <Badge variant={variants[action]}>{labels[action]}</Badge>;
}

/**
 * Component for displaying field changes in a diff-like format
 */
function FieldChanges({
  changedFields,
  oldValues,
  newValues,
}: {
  changedFields: string[] | null;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
}) {
  if (!changedFields || changedFields.length === 0) {
    return null;
  }

  return (
    <div className="mt-2 space-y-1 text-sm">
      {changedFields.slice(0, 5).map((field) => (
        <div key={field} className="flex items-start gap-2">
          <code className="bg-muted rounded px-1 py-0.5 text-xs font-medium">
            {formatFieldName(field)}
          </code>
          <span className="text-muted-foreground">:</span>
          <span className="text-muted-foreground line-through">
            {formatValue(oldValues?.[field])}
          </span>
          <span className="text-muted-foreground">→</span>
          <span className="text-foreground">
            {formatValue(newValues?.[field])}
          </span>
        </div>
      ))}
      {changedFields.length > 5 && (
        <p className="text-muted-foreground text-xs">
          +{changedFields.length - 5} more field(s) changed
        </p>
      )}
    </div>
  );
}

/**
 * Formats a camelCase field name to human readable
 */
function formatFieldName(field: string): string {
  return field
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

/**
 * Formats a value for display
 */
function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "(empty)";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/**
 * Formats a timestamp to a human readable string
 */
function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * Component to display the change history for a specific entity.
 * Fetches audit logs from the API and displays them in a timeline format.
 *
 * @example
 * ```tsx
 * <EntityChangeHistory entityType="client" entityId={clientId} />
 * ```
 */
export function EntityChangeHistory({
  entityType,
  entityId,
  className,
}: EntityChangeHistoryProps) {
  const [data, setData] = useState<AuditHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/audit-logs/entity/${entityType}/${entityId}?page=${page}&limit=10`,
      );

      if (!response.ok) {
        throw new Error("Failed to fetch audit history");
      }

      const result = (await response.json()) as AuditHistoryResponse;
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId, page]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  if (loading && !data) {
    return (
      <Card className={cn(className)}>
        <CardHeader>
          <CardTitle>Change History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn(className)}>
        <CardHeader>
          <CardTitle>Change History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive text-sm">Error: {error}</p>
          <Button
            onClick={fetchHistory}
            variant="outline"
            size="sm"
            className="mt-2"
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.history.length === 0) {
    return (
      <Card className={cn(className)}>
        <CardHeader>
          <CardTitle>Change History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            No changes recorded yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle>
          Change History
          <span className="text-muted-foreground ml-2 text-sm font-normal">
            ({data.pagination.total} entries)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-32">Date</TableHead>
              <TableHead className="w-24">Action</TableHead>
              <TableHead className="w-48">User</TableHead>
              <TableHead>Changes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.history.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell className="text-muted-foreground text-sm">
                  {formatTimestamp(entry.createdAt)}
                </TableCell>
                <TableCell>
                  <ActionBadge action={entry.action} />
                </TableCell>
                <TableCell>
                  {entry.user ? (
                    <div>
                      <p className="text-sm font-medium">{entry.user.name}</p>
                      <p className="text-muted-foreground text-xs">
                        {entry.user.email}
                      </p>
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">
                      System
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  {entry.action === "create" && (
                    <span className="text-muted-foreground text-sm">
                      Entity created
                    </span>
                  )}
                  {entry.action === "delete" && (
                    <span className="text-muted-foreground text-sm">
                      Entity deleted
                    </span>
                  )}
                  {entry.action === "restore" && (
                    <span className="text-muted-foreground text-sm">
                      Entity restored
                    </span>
                  )}
                  {entry.action === "update" && (
                    <FieldChanges
                      changedFields={entry.changedFields}
                      oldValues={entry.oldValues}
                      newValues={entry.newValues}
                    />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Pagination */}
        {data.pagination.totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-muted-foreground text-sm">
              Page {data.pagination.page} of {data.pagination.totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p - 1)}
                disabled={!data.pagination.hasPreviousPage || loading}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={!data.pagination.hasNextPage || loading}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
