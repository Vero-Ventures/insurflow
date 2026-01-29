"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface GenericCrudFormProps {
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void | Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
  submitLabel?: string;
  children: ReactNode;
}

export function GenericCrudForm({
  onSubmit,
  onCancel,
  isSubmitting = false,
  submitLabel = "Save",
  children,
}: GenericCrudFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {children}
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
