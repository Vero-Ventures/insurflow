"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { z } from "zod";
import { clientFormSchema, type FormState } from "./schema";

interface UseClientFormOptions {
  onOptimisticCreate?: (clientData: {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    state: string;
  }) => string;
  onOptimisticSuccess?: (optimisticId: string, realClient: unknown) => void;
  onOptimisticError?: (optimisticId: string) => void;
}

interface UseClientFormReturn {
  formData: FormState;
  errors: Partial<Record<keyof FormState, string>>;
  isSubmitting: boolean;
  handleInputChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  resetForm: () => void;
}

const initialFormData: FormState = {
  firstName: "",
  lastName: "",
  dateOfBirth: "",
  sex: "",
  state: "",
  smoker: false,
  healthRating: "",
  hasSpouse: false,
  spouseAge: "",
};

export function useClientForm(
  onSuccess?: () => void,
  options?: UseClientFormOptions,
): UseClientFormReturn {
  const router = useRouter();
  const [formData, setFormData] = useState<FormState>(initialFormData);
  const [errors, setErrors] = useState<
    Partial<Record<keyof FormState, string>>
  >({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = e.target;

    setFormData((prev: FormState) => ({
      ...prev,
      [name]: type === "checkbox" ? value === "true" : value,
    }));

    // Clear error for this field when user starts typing
    if (errors[name as keyof FormState]) {
      setErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setErrors({});
    setIsSubmitting(false);
  };

  // Helper: Convert validation errors to field errors
  const mapValidationErrors = (
    zodError: z.ZodError,
  ): Partial<Record<keyof FormState, string>> => {
    const fieldErrors: Partial<Record<keyof FormState, string>> = {};
    zodError.issues.forEach((err) => {
      const fieldName = err.path[0];
      if (fieldName && typeof fieldName === "string") {
        fieldErrors[fieldName as keyof FormState] = err.message;
      }
    });
    return fieldErrors;
  };

  // Helper: Map server validation errors to form fields
  const mapServerErrors = (
    errorDetails: Record<string, { _errors?: string[] }>,
  ): Partial<Record<keyof FormState, string>> => {
    const serverErrors: Partial<Record<keyof FormState, string>> = {};
    Object.keys(errorDetails).forEach((key) => {
      if (key !== "_errors" && errorDetails[key]?._errors?.[0]) {
        serverErrors[key as keyof FormState] = errorDetails[key]._errors[0];
      }
    });
    return serverErrors;
  };

  // Helper: Handle optimistic client creation
  const createOptimisticClient = (validatedData: {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    state: string;
  }): string | undefined => {
    if (!options?.onOptimisticCreate) return undefined;
    return options.onOptimisticCreate(validatedData);
  };

  // Helper: Handle successful submission
  const handleSuccess = (
    optimisticId: string | undefined,
    createdClient: unknown,
  ) => {
    toast.success("Client created successfully");
    resetForm();
    router.refresh();

    if (optimisticId && options?.onOptimisticSuccess) {
      options.onOptimisticSuccess(optimisticId, createdClient);
    }

    if (onSuccess) {
      onSuccess();
    }
  };

  // Helper: Handle submission errors
  const handleError = (error: unknown, optimisticId: string | undefined) => {
    const message =
      error instanceof Error ? error.message : "Failed to create client";
    toast.error(message);

    if (optimisticId && options?.onOptimisticError) {
      options.onOptimisticError(optimisticId);
    }
  };

  // Helper: Handle server validation errors
  const handleServerValidationErrors = (
    errorData: { details?: Record<string, { _errors?: string[] }> },
    optimisticId: string | undefined,
  ): boolean => {
    if (!errorData.details || typeof errorData.details !== "object") {
      return false;
    }

    const serverErrors = mapServerErrors(errorData.details);
    if (Object.keys(serverErrors).length > 0) {
      setErrors(serverErrors);
      toast.error("Please fix the errors in the form");

      if (optimisticId && options?.onOptimisticError) {
        options.onOptimisticError(optimisticId);
      }
      return true;
    }

    return false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate form data
    const result = clientFormSchema.safeParse(formData);

    if (!result.success) {
      setErrors(mapValidationErrors(result.error));
      toast.error("Please fix the errors in the form");
      return;
    }

    setIsSubmitting(true);

    const optimisticId = createOptimisticClient(result.data);

    try {
      // Prepare payload with defaults for fields not in the form
      const payload = {
        ...result.data,
        spouseAge:
          result.data.hasSpouse && result.data.spouseAge
            ? Number(result.data.spouseAge)
            : undefined,
        clientIncome: "0",
        incomeReplacementPercent: "70",
        replacementDurationYears: 20,
        existingLifeInsuranceCoverage: "0",
        status: "draft",
      };

      const response = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();

        // Handle server validation errors
        if (handleServerValidationErrors(errorData, optimisticId)) {
          return;
        }

        throw new Error(errorData.error || "Failed to create client");
      }

      const responseData = await response.json();
      handleSuccess(optimisticId, responseData.client);
    } catch (error) {
      handleError(error, optimisticId);
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    formData,
    errors,
    isSubmitting,
    handleInputChange,
    handleSubmit,
    resetForm,
  };
}
