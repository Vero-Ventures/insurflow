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
import { Trash2, Edit2, Droplet } from "lucide-react";
import { toast } from "sonner";
import type { Asset } from "@/types/asset";

interface AssetsListProps {
  clientId: string;
  assets: Asset[];
  isLoading: boolean;
  onEdit: (asset: Asset) => void;
  onAssetDeleted: () => void;
}

export function AssetsList({
  clientId,
  assets,
  isLoading,
  onEdit,
  onAssetDeleted,
}: AssetsListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (assetId: string) => {
    try {
      setDeletingId(assetId);
      const response = await fetch(
        `/api/clients/${clientId}/assets/${assetId}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        throw new Error("Failed to delete asset");
      }

      toast.success("Asset deleted successfully");
      onAssetDeleted();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete asset",
      );
    } finally {
      setDeletingId(null);
    }
  };

  const formatAssetType = (type: string): string => {
    const typeMap: Record<string, string> = {
      rrsp: "RRSP",
      tfsa: "TFSA",
      non_registered: "Non-Registered",
      rrif: "RRIF",
      lira: "LIRA",
      lif: "LIF",
      real_estate: "Real Estate",
      life_insurance: "Life Insurance",
      business_interest: "Business Interest",
      pension: "Pension",
      stock_options: "Stock Options",
      cryptocurrency: "Cryptocurrency",
      collectibles: "Collectibles",
      other: "Other",
    };
    return typeMap[type] || type;
  };

  const formatCurrency = (value: string | number): string => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: "CAD",
    }).format(num);
  };

  if (isLoading) {
    return <AssetsListSkeleton />;
  }

  if (assets.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-6 text-center">
        <p className="text-muted-foreground mb-4">No assets added yet</p>
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
            <TableHead className="text-right">Current Value</TableHead>
            <TableHead className="text-center">Liquid</TableHead>
            <TableHead className="w-20 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {assets.map((asset) => (
            <TableRow key={asset.id}>
              <TableCell className="font-medium">{asset.name}</TableCell>
              <TableCell>
                <Badge variant="secondary">{formatAssetType(asset.type)}</Badge>
              </TableCell>
              <TableCell className="text-right font-semibold">
                {formatCurrency(asset.currentValue)}
              </TableCell>
              <TableCell className="text-center">
                {asset.isLiquid ? (
                  <Droplet className="text-primary mx-auto h-4 w-4" />
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(asset)}
                    className="h-8 w-8"
                  >
                    <Edit2 className="h-4 w-4" />
                    <span className="sr-only">Edit asset</span>
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive h-8 w-8"
                        disabled={deletingId === asset.id}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete asset</span>
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Asset</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete &ldquo;{asset.name}
                          &rdquo;? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(asset.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
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

function AssetsListSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
    </div>
  );
}
