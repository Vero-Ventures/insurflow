import { Input } from "@/components/ui/input";
import { FormField } from "../form-field";
import { calculateAge, type FormState } from "../schema";

interface DateOfBirthFieldProps {
  formData: FormState;
  errors: Partial<Record<keyof FormState, string>>;
  onInputChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => void;
}

export function DateOfBirthField({
  formData,
  errors,
  onInputChange,
}: DateOfBirthFieldProps) {
  const age = formData.dateOfBirth ? calculateAge(formData.dateOfBirth) : null;

  return (
    <FormField
      label="Date of Birth"
      required
      error={errors.dateOfBirth}
      htmlFor="dateOfBirth"
    >
      <div className="space-y-2">
        <Input
          id="dateOfBirth"
          name="dateOfBirth"
          type="date"
          value={formData.dateOfBirth}
          onChange={onInputChange}
          className={errors.dateOfBirth ? "border-red-500" : ""}
        />
        {age !== null && (
          <p className="text-sm text-gray-600">
            Age: {age} year{age !== 1 ? "s" : ""} old
          </p>
        )}
      </div>
    </FormField>
  );
}
