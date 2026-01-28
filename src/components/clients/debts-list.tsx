import { useCallback, useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Trash2, Edit2 } from "lucide-react";
import { toast } from "sonner";

export interface Debt {
  id: string;
  name: string;
  type: string;
  currentBalance: string | number;
  createdAt: string;
  updatedAt: string;
}

interface DebtsListProps {
  clientId: string;
  onEdit: (debt: Debt) => void;
  onDebtDeleted: () => void;
  isLoading?: boolean;
}

export function DebtsList({
  clientId,
  onEdit,
  onDebtDeleted,
  isLoading = false,
}: DebtsListProps) {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [isLoading_state, setIsLoading] = useState(isLoading);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchDebts = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/clients/${clientId}/debts`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Client not found");
        }
        throw new Error("Failed to fetch debts");
      }

      const data = await response.json();
      const debtList = data.debts || [];
      setDebts(debtList);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      toast.error("Failed to load debts");
    } finally {
      setIsLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchDebts();
  }, [fetchDebts]);

  const handleDelete = async (debtId: string) => {
    try {
      setDeletingId(debtId);
      const response = await fetch(`/api/clients/${clientId}/debts/${debtId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete debt");
      }

      toast.success("Debt deleted successfully");
      setDebts((prev) => prev.filter((d) => d.id !== debtId));
      onDebtDeleted();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete debt");
    } finally {
      setDeletingId(null);
    }
  };

  const formatDebtType = (type: string): string => {
    return type
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const formatCurrency = (value: string | number): string => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: "CAD",
    }).format(num);
  };

  if (isLoading_state) {
    return <DebtsListSkeleton />;
  }

  if (error) {
    return (
      <div className="border-destructive/50 bg-destructive/10 rounded-md border p-4">
        <p className="text-destructive text-sm">{error}</p>
        <Button
          size="sm"
          variant="outline"
          className="mt-2"
          onClick={() => fetchDebts()}
        >
          Retry
        </Button>
      </div>
    );
  }

  if (debts.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-6 text-center">
        <p className="text-muted-foreground mb-4">No debts added yet</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Balance</TableHead>
            <TableHead className="w-20 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {debts.map((debt) => (
            <TableRow key={debt.id}>
              <TableCell className="font-medium">{debt.name}</TableCell>
              <TableCell>
                <Badge variant="secondary">{formatDebtType(debt.type)}</Badge>
              </TableCell>
              <TableCell className="text-right font-semibold">
                {formatCurrency(debt.currentBalance)}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(debt)}
                    className="h-8 w-8"
                  >
                    <Edit2 className="h-4 w-4" />
                    <span className="sr-only">Edit debt</span>
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive h-8 w-8"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete debt</span>
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Debt</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete &ldquo;{debt.name}
                          &rdquo;? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(debt.id)}
                          disabled={deletingId === debt.id}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {deletingId === debt.id ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function DebtsListSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 3 }, (_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}
