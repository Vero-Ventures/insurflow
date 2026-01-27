import { FormField } from "../form-field";
import type { FormState } from "../schema";

interface DemographicsFieldsProps {
  formData: FormState;
  errors: Partial<Record<keyof FormState, string>>;
  onInputChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => void;
}

const PROVINCES = [
  { value: "AB", label: "Alberta" },
  { value: "BC", label: "British Columbia" },
  { value: "MB", label: "Manitoba" },
  { value: "NB", label: "New Brunswick" },
  { value: "NL", label: "Newfoundland and Labrador" },
  { value: "NS", label: "Nova Scotia" },
  { value: "ON", label: "Ontario" },
  { value: "PE", label: "Prince Edward Island" },
  { value: "QC", label: "Quebec" },
  { value: "SK", label: "Saskatchewan" },
  { value: "NT", label: "Northwest Territories" },
  { value: "NU", label: "Nunavut" },
  { value: "YT", label: "Yukon" },
];

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

      <FormField
        label="Province"
        required
        error={errors.province}
        htmlFor="province"
      >
        <select
          id="province"
          name="province"
          value={formData.province}
          onChange={onInputChange}
          className={`border-input bg-background ring-offset-background focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none ${
            errors.province ? "border-red-500" : ""
          }`}
        >
          <option value="">Select province</option>
          {PROVINCES.map((prov) => (
            <option key={prov.value} value={prov.value}>
              {prov.label}
            </option>
          ))}
        </select>
      </FormField>
    </div>
  );
}
