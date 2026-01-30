"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, DollarSign, Droplet } from "lucide-react";
import { AssetsList } from "./assets-list";
import { AssetForm } from "./asset-form";
import type { Asset } from "@/types/asset";

interface AssetsSectionProps {
  clientId: string;
}

export function AssetsSection({ clientId }: AssetsSectionProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [totalAssets, setTotalAssets] = useState(0);
  const [totalLiquidAssets, setTotalLiquidAssets] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch assets once in parent component
  const fetchAssets = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/clients/${clientId}/assets`);
      if (response.ok) {
        const data = await response.json();
        const allAssets = data.assets || [];
        setAssets(allAssets);

        // Calculate totals
        let total = 0;
        let liquid = 0;

        allAssets.forEach((asset: Asset) => {
          const value =
            typeof asset.currentValue === "string"
              ? parseFloat(asset.currentValue)
              : asset.currentValue;
          const assetValue = isNaN(value) ? 0 : value;

          total += assetValue;
          if (asset.isLiquid) {
            liquid += assetValue;
          }
        });

        setTotalAssets(total);
        setTotalLiquidAssets(liquid);
      }
    } catch (error) {
      console.error("Error fetching assets:", error);
    } finally {
      setIsLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  const handleAddNew = () => {
    setSelectedAsset(null);
    setIsFormOpen(true);
  };

  const handleEdit = (asset: Asset) => {
    setSelectedAsset(asset);
    setIsFormOpen(true);
  };

  const handleAssetSaved = useCallback(() => {
    setIsFormOpen(false);
    setSelectedAsset(null);
    // Refetch assets after save
    fetchAssets();
  }, [fetchAssets]);

  const handleAssetDeleted = useCallback(() => {
    // Refetch assets after delete
    fetchAssets();
  }, [fetchAssets]);

  const handleCancel = () => {
    setIsFormOpen(false);
    setSelectedAsset(null);
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: "CAD",
    }).format(value);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Assets</h3>
              <CardDescription>
                Manage client&rsquo;s assets and calculate total net worth
              </CardDescription>
            </div>
            <Button onClick={handleAddNew} size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Asset
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Assets List */}
          <AssetsList
            clientId={clientId}
            assets={assets}
            isLoading={isLoading}
            onEdit={handleEdit}
            onAssetDeleted={handleAssetDeleted}
          />

          {/* Summary Section */}
          <div className="border-t pt-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="bg-muted/50 rounded-lg border p-4">
                <div className="text-muted-foreground mb-1 flex items-center gap-2 text-sm">
                  <DollarSign className="h-4 w-4" />
                  <p>Total Assets</p>
                </div>
                <p className="text-2xl font-bold">
                  {formatCurrency(totalAssets)}
                </p>
              </div>

              <div className="bg-muted/50 rounded-lg border p-4">
                <div className="text-muted-foreground mb-1 flex items-center gap-2 text-sm">
                  <Droplet className="h-4 w-4" />
                  <p>Total Liquid Assets</p>
                </div>
                <p className="text-2xl font-bold">
                  {formatCurrency(totalLiquidAssets)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Asset Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedAsset ? "Edit Asset" : "Add New Asset"}
            </DialogTitle>
          </DialogHeader>
          <AssetForm
            clientId={clientId}
            asset={selectedAsset}
            onSuccess={handleAssetSaved}
            onCancel={handleCancel}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
