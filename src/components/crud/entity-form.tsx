"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GenericCrudForm } from "@/components/crud/generic-crud-form";
import { toast } from "sonner";

/**
 * Descriptor for a single form field rendered by EntityForm.
 */
export interface EntityFormField {
  /** Field name (key in the values object) */
  name: string;
  /** Display label */
  label: string;
  /** Input type */
  type: "text" | "number" | "select" | "textarea";
  /** Whether the field must be non-empty to submit */
  required?: boolean;
  /** HTML id attribute */
  htmlId: string;
  /** Placeholder text */
  placeholder?: string;
  /** Step attribute for number inputs */
  step?: string;
  /** Min attribute for number inputs */
  min?: string;
  /** Max attribute for number inputs */
  max?: string;
  /** Options for select fields */
  options?: { value: string; label: string }[];
  /** Row count for textarea fields */
  rows?: number;
}

interface EntityFormProps {
  /** Field descriptors */
  fields: EntityFormField[];
  /** Initial values keyed by field name */
  defaultValues: Record<string, string>;
  /** When this changes, internal state resets to defaultValues */
  resetKey?: string;
  /** Called with current field values on valid submit. Throw to display error toast. */
  onSubmit: (values: Record<string, string>) => Promise<void>;
  /** Cancel button handler */
  onCancel: () => void;
  /** Submit button label */
  submitLabel?: string;
}

/**
 * Generic entity form that manages field state, renders inputs from
 * descriptors, validates required fields, and delegates submission.
 *
 * Eliminates duplicated form structure, state management, and input
 * wrappers across business sub-resource forms (key people, shareholders,
 * insurance needs).
 */
export function EntityForm({
  fields,
  defaultValues,
  resetKey,
  onSubmit,
  onCancel,
  submitLabel,
}: EntityFormProps) {
  const [values, setValues] = useState<Record<string, string>>(defaultValues);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form state when the entity changes
  useEffect(() => {
    setValues(defaultValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  const setValue = (name: string, value: string) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Validate required fields (text/textarea trim, others check presence)
    const missingRequired = fields.some((f) => {
      if (!f.required) return false;
      const val = values[f.name] ?? "";
      return f.type === "text" || f.type === "textarea" ? !val.trim() : !val;
    });

    if (missingRequired) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit(values);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <GenericCrudForm
      onSubmit={handleSubmit}
      onCancel={onCancel}
      isSubmitting={isSubmitting}
      submitLabel={submitLabel}
    >
      <div className="space-y-4">
        {fields.map((field) => (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.htmlId}>{field.label}</Label>
            <FieldInput
              field={field}
              value={values[field.name] ?? ""}
              onChange={setValue}
              disabled={isSubmitting}
            />
          </div>
        ))}
      </div>
    </GenericCrudForm>
  );
}

// ---------------------------------------------------------------------------
// Field renderer
// ---------------------------------------------------------------------------

function FieldInput({
  field,
  value,
  onChange,
  disabled,
}: {
  field: EntityFormField;
  value: string;
  onChange: (name: string, value: string) => void;
  disabled: boolean;
}) {
  switch (field.type) {
    case "text":
      return (
        <Input
          id={field.htmlId}
          value={value}
          onChange={(e) => onChange(field.name, e.target.value)}
          placeholder={field.placeholder}
          disabled={disabled}
        />
      );

    case "number":
      return (
        <Input
          id={field.htmlId}
          type="number"
          step={field.step}
          min={field.min}
          max={field.max}
          value={value}
          onChange={(e) => onChange(field.name, e.target.value)}
          placeholder={field.placeholder}
          disabled={disabled}
        />
      );

    case "select":
      return (
        <Select
          value={value}
          onValueChange={(v) => onChange(field.name, v)}
          disabled={disabled}
        >
          <SelectTrigger id={field.htmlId}>
            <SelectValue placeholder={field.placeholder} />
          </SelectTrigger>
          <SelectContent>
            {field.options?.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );

    case "textarea":
      return (
        <Textarea
          id={field.htmlId}
          value={value}
          onChange={(e) => onChange(field.name, e.target.value)}
          placeholder={field.placeholder}
          rows={field.rows}
          disabled={disabled}
        />
      );
  }
}
