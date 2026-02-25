"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Send, CheckCircle2 } from "lucide-react";
import type { HouseholdStatus } from "@/types/inquiry";

interface IntakeData {
  householdStatus: HouseholdStatus | null;
  annualHouseholdIncome: string;
  totalDebts: string;
  currentCoverage: string;
  primaryGoal: string;
}

interface EstimateResult {
  coverageNeed: number;
  existingCoverage: number;
  coverageGap: number;
}

interface ShareWithAdvisorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  intakeData: IntakeData;
  estimateResult: EstimateResult | null;
  scenarioId: string;
}

export function ShareWithAdvisorModal({
  open,
  onOpenChange,
  intakeData,
  estimateResult,
  scenarioId,
}: ShareWithAdvisorModalProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone || undefined,
          householdStatus: intakeData.householdStatus,
          annualHouseholdIncome: intakeData.annualHouseholdIncome,
          totalDebts: intakeData.totalDebts || undefined,
          currentCoverage: intakeData.currentCoverage || undefined,
          primaryGoal: intakeData.primaryGoal || undefined,
          estimatedCoverageNeed:
            estimateResult?.coverageNeed.toString() || null,
          estimatedPremium: estimateResult?.coverageGap.toString() || null,
          scenarioId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to submit inquiry");
      }

      setIsSubmitted(true);
      toast.success("Request submitted! An advisor will contact you soon.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to submit request",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitted) {
      router.push("/demo");
    }
    setIsSubmitted(false);
    setFormData({ firstName: "", lastName: "", email: "", phone: "" });
    onOpenChange(false);
  };

  if (isSubmitted) {
    return (
      <AlertDialog open={open} onOpenChange={handleClose}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <AlertDialogTitle className="text-center">
              Request Submitted!
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              Thank you for sharing your information. An advisor will review
              your estimate and reach out within 1-2 business days.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center">
            <Button onClick={handleClose} className="w-full sm:w-auto">
              Done
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Share with an Advisor</AlertDialogTitle>
          <AlertDialogDescription>
            Enter your contact information and an advisor will reach out to
            discuss your estimate.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                placeholder="John"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                placeholder="Doe"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="john@example.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone (optional)</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleInputChange}
              placeholder="(555) 123-4567"
            />
          </div>

          <AlertDialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="gap-2">
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Submit Request
                </>
              )}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
