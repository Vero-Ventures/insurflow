"use client";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useClientForm } from "./use-client-form";
import { NameFields } from "./form-sections/name-fields";
import { DateOfBirthField } from "./form-sections/date-of-birth-field";
import { DemographicsFields } from "./form-sections/demographics-fields";
import { HealthFields } from "./form-sections/health-fields";
import { SpouseFields } from "./form-sections/spouse-fields";
import { Plus, UserPlus, Loader2 } from "lucide-react";

interface CreateClientDialogProps {
  onOptimisticCreate?: (clientData: {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    state: string;
  }) => string;
  onOptimisticSuccess?: (optimisticId: string, realClient: unknown) => void;
  onOptimisticError?: (optimisticId: string) => void;
}

export function CreateClientDialog({
  onOptimisticCreate,
  onOptimisticSuccess,
  onOptimisticError,
}: CreateClientDialogProps) {
  const [open, setOpen] = useState(false);
  const {
    formData,
    errors,
    isSubmitting,
    handleInputChange,
    handleSubmit,
    resetForm,
  } = useClientForm(() => setOpen(false), {
    onOptimisticCreate,
    onOptimisticSuccess,
    onOptimisticError,
  });

  const onOpenChange = (isOpen: boolean) => {
    // Prevent closing the dialog while submitting
    if (!isOpen && isSubmitting) {
      return;
    }

    if (!isOpen && !isSubmitting) {
      resetForm();
    }
    setOpen(isOpen);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogTrigger asChild>
        <Button className="bg-primary hover:bg-primary/90 gap-2 shadow-sm">
          <Plus className="h-4 w-4" />
          New Client
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="border-border/60 max-h-[90vh] max-w-2xl overflow-y-auto">
        <AlertDialogHeader className="pb-4">
          <div className="mb-2 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[oklch(0.35_0.08_250)] to-[oklch(0.45_0.1_230)]">
              <UserPlus className="h-5 w-5 text-white" />
            </div>
            <div>
              <AlertDialogTitle className="font-display text-xl font-semibold tracking-tight">
                Create New Client
              </AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground mt-0.5 text-sm">
                Enter client information to begin their financial analysis
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Visual separator */}
          <div className="border-border/60 -mx-6 border-t" />

          {/* Name Fields */}
          <NameFields
            formData={formData}
            errors={errors}
            onInputChange={handleInputChange}
          />

          {/* Date of Birth */}
          <DateOfBirthField
            formData={formData}
            errors={errors}
            onInputChange={handleInputChange}
          />

          {/* Demographics */}
          <DemographicsFields
            formData={formData}
            errors={errors}
            onInputChange={handleInputChange}
          />

          {/* Health Information */}
          <HealthFields
            formData={formData}
            errors={errors}
            onInputChange={handleInputChange}
          />

          {/* Spouse Information */}
          <SpouseFields
            formData={formData}
            errors={errors}
            onInputChange={handleInputChange}
          />

          {/* Visual separator */}
          <div className="border-border/60 -mx-6 border-t" />

          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel
              type="button"
              disabled={isSubmitting}
              className="border-border/60"
            >
              Cancel
            </AlertDialogCancel>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-emerald hover:bg-emerald/90 min-w-[120px] gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Client"
              )}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
