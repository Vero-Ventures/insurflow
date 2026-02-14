"use client";

import { useCallback, useEffect, useState, type ComponentType } from "react";
import type { LucideIcon } from "lucide-react";
import { Plus } from "lucide-react";
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
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Shared prop shapes for list and form sub-components
// ---------------------------------------------------------------------------

/** Props that every list component rendered inside EntitySection must accept. */
export interface EntityListProps<T> {
  clientId: string;
  businessId: string;
  items: T[];
  isLoading: boolean;
  onEdit: (item: T) => void;
  onItemDeleted: () => void;
}

/** Props that every form component rendered inside EntitySection must accept. */
export interface EntityFormProps<T> {
  clientId: string;
  businessId: string;
  item: T | null;
  onSuccess: () => void;
  onCancel: () => void;
}

// ---------------------------------------------------------------------------
// EntitySection configuration
// ---------------------------------------------------------------------------

interface EntitySectionProps<T extends { id: string }> {
  /** Card / dialog header title (e.g. "Key People") */
  title: string;
  /** Card description text */
  description: string;
  /** Add-button label (e.g. "Add Key Person") */
  addLabel: string;
  /** Singular noun for dialog title (e.g. "Key Person") */
  entityName: string;
  /** Lucide icon rendered in the card header and dialog */
  icon: LucideIcon;
  /** Client ID passed through to list & form components */
  clientId: string;
  /** Business ID passed through to list & form components */
  businessId: string;
  /** API endpoint path (e.g. "key-people"). Fetched as /api/clients/{id}/businesses/{bid}/{apiPath} */
  apiPath: string;
  /** List component to render items */
  ListComponent: ComponentType<EntityListProps<T>>;
  /** Form component rendered inside the dialog */
  FormComponent: ComponentType<EntityFormProps<T>>;
}

/**
 * Generic section wrapper for business sub-resources.
 *
 * Handles data fetching, add/edit modal lifecycle, and renders
 * a Card with a list component plus a Dialog with a form component.
 *
 * Eliminates duplicated layout, state management, and fetch logic
 * across key-people, shareholders, and insurance-needs sections.
 */
export function EntitySection<T extends { id: string }>({
  title,
  description,
  addLabel,
  entityName,
  icon: Icon,
  clientId,
  businessId,
  apiPath,
  ListComponent,
  FormComponent,
}: EntitySectionProps<T>) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<T | null>(null);
  const [items, setItems] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/clients/${clientId}/businesses/${businessId}/${apiPath}`,
        { credentials: "include" },
      );
      if (response.ok) {
        const data = await response.json();
        const itemsData = (data.data?.items || data.items || []) as T[];
        setItems(itemsData);
      }
    } catch {
      toast.error(`Failed to load ${title.toLowerCase()}`);
    } finally {
      setIsLoading(false);
    }
  }, [clientId, businessId, apiPath, title]);

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

  return (
    <>
      <Card className="border-border/60 overflow-hidden">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
                <Icon className="text-primary h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display text-lg font-semibold tracking-tight">
                  {title}
                </h3>
                <CardDescription>{description}</CardDescription>
              </div>
            </div>
            <Button
              onClick={handleAddNew}
              size="sm"
              className="bg-primary hover:bg-primary/90 gap-2 shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">{addLabel}</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <ListComponent
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
                <Icon className="text-primary h-5 w-5" />
              </div>
              <DialogTitle className="font-display text-xl font-semibold tracking-tight">
                {selectedItem ? `Edit ${entityName}` : `Add New ${entityName}`}
              </DialogTitle>
            </div>
          </DialogHeader>
          <FormComponent
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
