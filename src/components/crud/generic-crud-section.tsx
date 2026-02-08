"use client";

import { useCallback, useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
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
import { Plus } from "lucide-react";
import { toast } from "sonner";

export interface CrudItem {
  id: string;
  clientId: string;
  [key: string]: unknown;
}

export interface CrudSectionConfig {
  title: string;
  itemName: string;
  description: string;
  createButtonLabel?: string;
  fetchEndpoint: string;
  emptyMessage?: string;
  icon?: LucideIcon;
  iconClassName?: string;
}

interface GenericCrudSectionProps<T extends CrudItem> {
  config: CrudSectionConfig;
  ListComponent: React.ComponentType<{
    items: T[];
    isLoading: boolean;
    onEdit: (item: T) => void;
    onItemDeleted: () => void;
    clientId: string;
  }>;
  FormComponent: React.ComponentType<{
    clientId: string;
    item: T | null;
    onSuccess: () => void;
    onCancel: () => void;
  }>;
  SummaryComponent?: React.ComponentType<{
    items: T[];
  }>;
  onItemsChange?: (items: T[]) => void;
  clientId: string;
}

export function GenericCrudSection<T extends CrudItem>({
  config,
  ListComponent,
  FormComponent,
  SummaryComponent,
  onItemsChange,
  clientId,
}: GenericCrudSectionProps<T>) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<T | null>(null);
  const [items, setItems] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(config.fetchEndpoint, {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        // Extract items from standardized { data: { items: [...] } } response
        const itemsData = Array.isArray(data)
          ? data
          : data.data?.items || data.items || data.assets || data.debts || [];
        setItems(itemsData);
        onItemsChange?.(itemsData);
      }
    } catch {
      // Show error toast so users can distinguish "no items" from "failed to load"
      toast.error(`Failed to load ${config.title.toLowerCase()}`);
    } finally {
      setIsLoading(false);
    }
  }, [config.fetchEndpoint, config.title, onItemsChange]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleAddNew = () => {
    setSelectedItem(null);
    setIsFormOpen(true);
  };

  const handleEdit = (item: T) => {
    setSelectedItem(item);
    setIsFormOpen(true);
  };

  const handleItemSaved = useCallback(() => {
    setIsFormOpen(false);
    setSelectedItem(null);
    fetchItems();
  }, [fetchItems]);

  const handleItemDeleted = useCallback(() => {
    fetchItems();
  }, [fetchItems]);

  const handleCancel = () => {
    setIsFormOpen(false);
    setSelectedItem(null);
  };

  const Icon = config.icon;

  return (
    <>
      <Card className="border-border/60 overflow-hidden">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {Icon && (
                <div
                  className={`bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg ${config.iconClassName || ""}`}
                >
                  <Icon className="text-primary h-5 w-5" />
                </div>
              )}
              <div>
                <h3 className="font-display text-lg font-semibold tracking-tight">
                  {config.title}
                </h3>
                <CardDescription>{config.description}</CardDescription>
              </div>
            </div>
            <Button
              onClick={handleAddNew}
              size="sm"
              className="bg-primary hover:bg-primary/90 gap-2 shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">
                {config.createButtonLabel || "Add Item"}
              </span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {/* List Component */}
          <ListComponent
            items={items}
            isLoading={isLoading}
            onEdit={handleEdit}
            onItemDeleted={handleItemDeleted}
            clientId={clientId}
          />

          {/* Summary Component */}
          {SummaryComponent && items.length > 0 && (
            <div className="border-border/60 mt-6 border-t pt-6">
              <SummaryComponent items={items} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* CRUD Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader className="space-y-3">
            <div className="flex items-center gap-3">
              {Icon && (
                <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
                  <Icon className="text-primary h-5 w-5" />
                </div>
              )}
              <DialogTitle className="font-display text-xl font-semibold tracking-tight">
                {selectedItem
                  ? `Edit ${config.itemName}`
                  : `Add New ${config.itemName}`}
              </DialogTitle>
            </div>
          </DialogHeader>
          <FormComponent
            clientId={clientId}
            item={selectedItem}
            onSuccess={handleItemSaved}
            onCancel={handleCancel}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
