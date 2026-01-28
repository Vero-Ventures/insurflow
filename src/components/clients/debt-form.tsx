import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { Debt } from "./debts-list";

const DEBT_TYPES = [
  { value: "mortgage", label: "Mortgage" },
  { value: "heloc", label: "HELOC" },
  { value: "car_loan", label: "Car Loan" },
  { value: "student_loan", label: "Student Loan" },
  { value: "personal_loan", label: "Personal Loan" },
  { value: "credit_card", label: "Credit Card" },
  { value: "line_of_credit", label: "Line of Credit" },
  { value: "business_loan", label: "Business Loan" },
  { value: "other", label: "Other" },
];

interface DebtFormProps {
  clientId: string;
  debt?: Debt | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function DebtForm({
  clientId,
  debt,
  isOpen,
  onOpenChange,
  onSaved,
}: DebtFormProps) {
  const [name, setName] = useState(debt?.name || "");
  const [type, setType] = useState(debt?.type || "");
  const [currentBalance, setCurrentBalance] = useState(
    debt?.currentBalance?.toString() || "",
  );
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // Reset form when closing
      setName("");
      setType("");
      setCurrentBalance("");
      setErrors({});
    }
    onOpenChange(open);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = "Debt name is required";
    }

    if (!type) {
      newErrors.type = "Debt type is required";
    }

    if (!currentBalance.trim()) {
      newErrors.currentBalance = "Current balance is required";
    } else if (isNaN(parseFloat(currentBalance))) {
      newErrors.currentBalance = "Current balance must be a valid number";
    } else if (parseFloat(currentBalance) < 0) {
      newErrors.currentBalance = "Current balance must be positive";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setIsLoading(true);

      const payload = {
        name: name.trim(),
        type,
        currentBalance: parseFloat(currentBalance).toString(),
      };

      if (debt) {
        // Update existing debt
        const response = await fetch(
          `/api/clients/${clientId}/debts/${debt.id}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          },
        );

        if (!response.ok) {
          const data = await response.json();
          throw new Error(
            data.error || `HTTP ${response.status}: Failed to update debt`,
          );
        }

        toast.success("Debt updated successfully");
      } else {
        // Create new debt
        const response = await fetch(`/api/clients/${clientId}/debts`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(
            data.error || `HTTP ${response.status}: Failed to create debt`,
          );
        }

        toast.success("Debt created successfully");
      }

      // Reset form and close dialog
      setName("");
      setType("");
      setCurrentBalance("");
      setErrors({});
      onOpenChange(false);
      onSaved();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "An error occurred";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{debt ? "Edit Debt" : "Add New Debt"}</DialogTitle>
          <DialogDescription>
            {debt
              ? "Update the details of this debt"
              : "Add a new debt to track client liabilities"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Debt Name</Label>
            <Input
              id="name"
              placeholder="e.g., Primary Mortgage, Car Loan"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
              className={errors.name ? "border-destructive" : ""}
            />
            {errors.name && (
              <p className="text-destructive text-sm">{errors.name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Debt Type</Label>
            <Select value={type} onValueChange={setType} disabled={isLoading}>
              <SelectTrigger
                id="type"
                className={errors.type ? "border-destructive" : ""}
              >
                <SelectValue placeholder="Select a debt type" />
              </SelectTrigger>
              <SelectContent>
                {DEBT_TYPES.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.type && (
              <p className="text-destructive text-sm">{errors.type}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="balance">Current Balance (CAD)</Label>
            <Input
              id="balance"
              type="number"
              placeholder="0.00"
              step="0.01"
              min="0"
              value={currentBalance}
              onChange={(e) => setCurrentBalance(e.target.value)}
              disabled={isLoading}
              className={errors.currentBalance ? "border-destructive" : ""}
            />
            {errors.currentBalance && (
              <p className="text-destructive text-sm">
                {errors.currentBalance}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Debt"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
