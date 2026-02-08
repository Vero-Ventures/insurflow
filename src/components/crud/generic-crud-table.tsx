"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Trash2, Edit2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export interface ColumnDef<T> {
  key: keyof T;
  header: string;
  render?: (value: unknown, item: T) => React.ReactNode;
  className?: string;
}

interface GenericCrudTableProps<T extends { id: string }> {
  columns: ColumnDef<T>[];
  items: T[];
  isLoading: boolean;
  onEdit: (item: T) => void;
  onDelete: (id: string) => Promise<void>;
  onDeleteSuccess: () => void;
  emptyMessage?: string;
  itemName?: string;
  _clientId?: string; // Unused - kept for interface compatibility
}

export function GenericCrudTable<T extends { id: string }>({
  columns,
  items,
  isLoading,
  onEdit,
  onDelete,
  onDeleteSuccess,
  emptyMessage = "No items found.",
  itemName = "item",
}: GenericCrudTableProps<T>) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    try {
      setDeletingId(id);
      await onDelete(id);
      toast.success(
        `${itemName.charAt(0).toUpperCase() + itemName.slice(1)} deleted successfully`,
      );
      onDeleteSuccess();
    } catch {
      toast.error(`Failed to delete ${itemName}`);
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="border-border/40 bg-muted/20 flex items-center gap-4 rounded-lg border p-4"
          >
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="border-border/60 bg-muted/20 flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
        <div className="bg-muted/50 mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
          <div className="bg-muted h-6 w-6 rounded-full" />
        </div>
        <p className="text-muted-foreground text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="border-border/60 overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow className="border-border/60 bg-muted/30 hover:bg-muted/30">
            {columns.map((column) => (
              <TableHead
                key={String(column.key)}
                className={`text-muted-foreground/70 text-xs font-semibold tracking-wider uppercase ${column.className || ""}`}
              >
                {column.header}
              </TableHead>
            ))}
            <TableHead className="text-muted-foreground/70 w-24 text-right text-xs font-semibold tracking-wider uppercase">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item, index) => (
            <TableRow
              key={item.id}
              className={`border-border/40 hover:bg-muted/30 transition-colors ${
                index % 2 === 0 ? "bg-background" : "bg-muted/10"
              }`}
            >
              {columns.map((column) => (
                <TableCell
                  key={String(column.key)}
                  className={`py-4 ${column.className || ""}`}
                >
                  {column.render
                    ? column.render(item[column.key], item)
                    : String(item[column.key] ?? "")}
                </TableCell>
              ))}
              <TableCell className="py-4 text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(item)}
                    className="text-muted-foreground hover:bg-primary/10 hover:text-primary h-8 w-8"
                  >
                    <Edit2 className="h-4 w-4" />
                    <span className="sr-only">Edit {itemName}</span>
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive h-8 w-8"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete {itemName}</span>
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <div className="flex items-center gap-3">
                          <div className="bg-destructive/10 flex h-10 w-10 items-center justify-center rounded-full">
                            <AlertTriangle className="text-destructive h-5 w-5" />
                          </div>
                          <AlertDialogTitle className="font-display text-lg font-semibold">
                            Delete {itemName}
                          </AlertDialogTitle>
                        </div>
                        <AlertDialogDescription className="text-muted-foreground pl-13">
                          Are you sure you want to delete this {itemName}? This
                          action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="gap-2 sm:gap-0">
                        <AlertDialogCancel className="border-border/60">
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(item.id)}
                          disabled={deletingId === item.id}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {deletingId === item.id ? "Deleting..." : "Delete"}
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
