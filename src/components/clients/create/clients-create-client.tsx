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
import { Plus } from "lucide-react";

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
      <AlertDialogTrigger asChild className="w-40">
        <Button>
          <Plus color="#001641" strokeWidth={2.75} />
          Create Client
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle>Create New Client</AlertDialogTitle>
          <AlertDialogDescription>
            Enter the client&apos;s information below. Fields marked with an
            asterisk (*) are required.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
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

          <AlertDialogFooter>
            <AlertDialogCancel type="button" disabled={isSubmitting}>
              Cancel
            </AlertDialogCancel>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Client"}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
