import { Input } from "@/components/ui/input";
import { FormField } from "../form-field";
import type { FormState } from "../schema";

interface NameFieldsProps {
  formData: FormState;
  errors: Partial<Record<keyof FormState, string>>;
  onInputChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => void;
}

export function NameFields({
  formData,
  errors,
  onInputChange,
}: NameFieldsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <FormField
        label="First Name"
        required
        error={errors.firstName}
        htmlFor="firstName"
      >
        <Input
          id="firstName"
          name="firstName"
          value={formData.firstName}
          onChange={onInputChange}
          placeholder="John"
          className={errors.firstName ? "border-red-500" : ""}
        />
      </FormField>

      <FormField
        label="Last Name"
        required
        error={errors.lastName}
        htmlFor="lastName"
      >
        <Input
          id="lastName"
          name="lastName"
          value={formData.lastName}
          onChange={onInputChange}
          placeholder="Doe"
          className={errors.lastName ? "border-red-500" : ""}
        />
      </FormField>
    </div>
  );
}
