import { STATE_OPTIONS } from "@/lib/constants";

import { FormField } from "../form-field";
import type { FormState } from "../schema";

interface DemographicsFieldsProps {
  formData: FormState;
  errors: Partial<Record<keyof FormState, string>>;
  onInputChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => void;
}

export function DemographicsFields({
  formData,
  errors,
  onInputChange,
}: DemographicsFieldsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <FormField label="Sex" required error={errors.sex} htmlFor="sex">
        <select
          id="sex"
          name="sex"
          value={formData.sex}
          onChange={onInputChange}
          className={`border-input bg-background ring-offset-background focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none ${
            errors.sex ? "border-red-500" : ""
          }`}
        >
          <option value="">Select sex</option>
          <option value="M">Male</option>
          <option value="F">Female</option>
        </select>
      </FormField>

      <FormField label="State" required error={errors.state} htmlFor="state">
        <select
          id="state"
          name="state"
          value={formData.state}
          onChange={onInputChange}
          className={`border-input bg-background ring-offset-background focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none ${
            errors.state ? "border-red-500" : ""
          }`}
        >
          <option value="">Select state</option>
          {STATE_OPTIONS.map((state) => (
            <option key={state.value} value={state.value}>
              {state.label}
            </option>
          ))}
        </select>
      </FormField>
    </div>
  );
}
