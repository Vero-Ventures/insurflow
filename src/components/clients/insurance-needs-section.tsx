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
import { Plus, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { InsuranceNeedsList } from "@/components/clients/insurance-needs-list";
import { InsuranceNeedForm } from "@/components/clients/insurance-need-form";
import type { CorporateInsuranceNeed } from "@/types/business";

interface InsuranceNeedsSectionProps {
  clientId: string;
  businessId: string;
}

export function InsuranceNeedsSection({
  clientId,
  businessId,
}: InsuranceNeedsSectionProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedItem, setSelectedItem] =
    useState<CorporateInsuranceNeed | null>(null);
  const [items, setItems] = useState<CorporateInsuranceNeed[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/clients/${clientId}/businesses/${businessId}/insurance-needs`,
        { credentials: "include" },
      );
      if (response.ok) {
        const data = await response.json();
        const itemsData = data.data?.items || data.items || [];
        setItems(itemsData);
      }
    } catch {
      toast.error("Failed to load insurance needs");
    } finally {
      setIsLoading(false);
    }
  }, [clientId, businessId]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleAddNew = () => {
    setSelectedItem(null);
    setIsFormOpen(true);
  };

  const handleEdit = (item: CorporateInsuranceNeed) => {
    setSelectedItem(item);
    setIsFormOpen(true);
  };

  const handleItemSaved = useCallback(() => {
    setIsFormOpen(false);
    setSelectedItem(null);
    fetchItems();
  }, [fetchItems]);

  return (
    <>
      <Card className="border-border/60 overflow-hidden">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
                <ShieldCheck className="text-primary h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display text-lg font-semibold tracking-tight">
                  Insurance Needs
                </h3>
                <CardDescription>
                  Corporate insurance requirements and coverage analysis
                </CardDescription>
              </div>
            </div>
            <Button
              onClick={handleAddNew}
              size="sm"
              className="bg-primary hover:bg-primary/90 gap-2 shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Insurance Need</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <InsuranceNeedsList
            clientId={clientId}
            businessId={businessId}
            items={items}
            isLoading={isLoading}
            onEdit={handleEdit}
            onItemDeleted={fetchItems}
          />
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
                <ShieldCheck className="text-primary h-5 w-5" />
              </div>
              <DialogTitle className="font-display text-xl font-semibold tracking-tight">
                {selectedItem
                  ? "Edit Insurance Need"
                  : "Add New Insurance Need"}
              </DialogTitle>
            </div>
          </DialogHeader>
          <InsuranceNeedForm
            clientId={clientId}
            businessId={businessId}
            item={selectedItem}
            onSuccess={handleItemSaved}
            onCancel={() => {
              setIsFormOpen(false);
              setSelectedItem(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
