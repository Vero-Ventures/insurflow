"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { clientFormSchema, type FormState } from "./schema";

interface UseClientFormOptions {
  onOptimisticCreate?: (clientData: {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    province: string;
  }) => string;
  onOptimisticSuccess?: (optimisticId: string) => void;
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
  province: "",
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
      [name]:
        type === "checkbox"
          ? value === "true"
          : type === "number"
            ? value
            : value,
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate form data
    const result = clientFormSchema.safeParse(formData);

    if (!result.success) {
      const fieldErrors: Partial<Record<keyof FormState, string>> = {};
      result.error.issues.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as keyof FormState] = err.message;
        }
      });
      setErrors(fieldErrors);
      toast.error("Please fix the errors in the form");
      return;
    }

    setIsSubmitting(true);

    // Create optimistic client if callback provided
    let optimisticId: string | undefined;
    if (options?.onOptimisticCreate) {
      optimisticId = options.onOptimisticCreate({
        firstName: result.data.firstName,
        lastName: result.data.lastName,
        dateOfBirth: result.data.dateOfBirth,
        province: result.data.province,
      });
    }

    try {
      // Prepare payload with defaults for fields not in the form
      const payload = {
        firstName: result.data.firstName,
        lastName: result.data.lastName,
        dateOfBirth: result.data.dateOfBirth,
        sex: result.data.sex,
        province: result.data.province,
        smoker: result.data.smoker,
        healthRating: result.data.healthRating,
        hasSpouse: result.data.hasSpouse,
        spouseAge:
          result.data.hasSpouse && result.data.spouseAge
            ? Number(result.data.spouseAge)
            : undefined,
        // Default values for fields not in the form
        clientIncome: "0",
        incomeReplacementPercent: "70",
        replacementDurationYears: 20,
        existingLifeInsuranceCoverage: "0",
        status: "draft",
      };

      const response = await fetch("/api/clients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();

        // If server returned validation errors with field details, map them
        if (errorData.details && typeof errorData.details === "object") {
          const serverErrors: Partial<Record<keyof FormState, string>> = {};

          // Zod's format() returns { fieldName: { _errors: ["message"] } }
          Object.keys(errorData.details).forEach((key) => {
            if (key !== "_errors" && errorData.details[key]?._errors?.[0]) {
              serverErrors[key as keyof FormState] =
                errorData.details[key]._errors[0];
            }
          });

          // If we found field-level errors, set them and show toast
          if (Object.keys(serverErrors).length > 0) {
            setErrors(serverErrors);
            toast.error("Please fix the errors in the form");

            // Remove optimistic client on validation error
            if (optimisticId && options?.onOptimisticError) {
              options.onOptimisticError(optimisticId);
            }
            return;
          }
        }

        // Otherwise show generic error message
        throw new Error(errorData.error || "Failed to create client");
      }

      await response.json(); // Consume response to complete the request

      toast.success("Client created successfully");
      resetForm();
      router.refresh();

      // Remove optimistic client and replace with real one
      if (optimisticId && options?.onOptimisticSuccess) {
        options.onOptimisticSuccess(optimisticId);
      }

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Error creating client:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create client",
      );

      // Remove optimistic client on error
      if (optimisticId && options?.onOptimisticError) {
        options.onOptimisticError(optimisticId);
      }
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
