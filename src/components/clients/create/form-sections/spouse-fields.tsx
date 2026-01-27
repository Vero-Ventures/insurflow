import { Input } from "@/components/ui/input";
import { FormField } from "../form-field";
import type { FormState } from "../schema";

interface SpouseFieldsProps {
  formData: FormState;
  errors: Partial<Record<keyof FormState, string>>;
  onInputChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => void;
}

export function SpouseFields({
  formData,
  errors,
  onInputChange,
}: SpouseFieldsProps) {
  return (
    <div className="space-y-4">
      <FormField label="Spouse Information" htmlFor="hasSpouse">
        <div className="flex items-center space-x-2 pt-2">
          <input
            type="checkbox"
            id="hasSpouse"
            name="hasSpouse"
            checked={formData.hasSpouse}
            onChange={(e) => {
              const syntheticEvent = {
                target: {
                  name: e.target.name,
                  value: e.target.checked.toString(),
                  type: "checkbox",
                },
              } as React.ChangeEvent<HTMLInputElement>;
              onInputChange(syntheticEvent);
            }}
            className="text-primary focus:ring-ring h-4 w-4 rounded border-gray-300 focus:ring-2 focus:ring-offset-2"
          />
          <label htmlFor="hasSpouse" className="text-sm text-gray-700">
            Client has a spouse
          </label>
        </div>
      </FormField>

      {formData.hasSpouse && (
        <FormField
          label="Spouse Age"
          required
          error={errors.spouseAge}
          htmlFor="spouseAge"
        >
          <Input
            id="spouseAge"
            name="spouseAge"
            type="number"
            value={formData.spouseAge}
            onChange={onInputChange}
            placeholder="e.g., 35"
            min="0"
            max="120"
            className={errors.spouseAge ? "border-red-500" : ""}
          />
        </FormField>
      )}
    </div>
  );
}
