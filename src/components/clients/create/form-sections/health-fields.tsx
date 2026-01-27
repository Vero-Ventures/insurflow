import { FormField } from "../form-field";
import type { FormState } from "../schema";

interface HealthFieldsProps {
  formData: FormState;
  errors: Partial<Record<keyof FormState, string>>;
  onInputChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => void;
}

export function HealthFields({
  formData,
  errors,
  onInputChange,
}: HealthFieldsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <FormField label="Smoker Status" required htmlFor="smoker">
        <div className="flex items-center space-x-2 pt-2">
          <input
            type="checkbox"
            id="smoker"
            name="smoker"
            checked={formData.smoker}
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
          <label htmlFor="smoker" className="text-sm text-gray-700">
            Client is a smoker
          </label>
        </div>
        {errors.smoker && (
          <p className="mt-1 text-sm text-red-600">{errors.smoker}</p>
        )}
      </FormField>

      <FormField
        label="Health Rating"
        required
        error={errors.healthRating}
        htmlFor="healthRating"
      >
        <select
          id="healthRating"
          name="healthRating"
          value={formData.healthRating}
          onChange={onInputChange}
          className={`border-input bg-background ring-offset-background focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none ${
            errors.healthRating ? "border-red-500" : ""
          }`}
        >
          <option value="">Select health rating</option>
          <option value="preferred_plus">Preferred Plus</option>
          <option value="preferred">Preferred</option>
          <option value="standard_plus">Standard Plus</option>
          <option value="standard">Standard</option>
          <option value="substandard">Substandard</option>
        </select>
      </FormField>
    </div>
  );
}
