"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
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
import { Checkbox } from "@/components/ui/checkbox";
import { UserPlus, Loader2, CheckCircle2 } from "lucide-react";
import { useDemoContext } from "@/components/demo/demo-context";
import { TourOverlay } from "@/components/demo/tour-overlay";
import { addClientTourSteps } from "@/components/demo/tour-steps";
import { STATES } from "@/lib/validation/client";

type HealthRating = "preferred_plus" | "preferred" | "standard" | "substandard";

interface FormData {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  state: string;
  sex: string;
  smoker: boolean;
  healthRating: HealthRating;
  hasSpouse: boolean;
  spouseAge: string;
}

const HEALTH_RATINGS: { value: HealthRating; label: string }[] = [
  { value: "preferred_plus", label: "Preferred Plus" },
  { value: "preferred", label: "Preferred" },
  { value: "standard", label: "Standard" },
  { value: "substandard", label: "Substandard" },
];

/**
 * Demo add client page with simulated form submission.
 */
export default function DemoAddClientPage() {
  const router = useRouter();
  const {
    state,
    nextTourStep,
    prevTourStep,
    setShowTour,
    simulateClientCreation,
  } = useDemoContext();

  const [formData, setFormData] = useState<FormData>({
    firstName: "James",
    lastName: "Wilson",
    dateOfBirth: "1985-04-12",
    state: "FL",
    sex: "M",
    smoker: false,
    healthRating: "preferred",
    hasSpouse: true,
    spouseAge: "38",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleInputChange = (
    field: keyof FormData,
    value: string | boolean,
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setIsSubmitting(false);
    setIsSuccess(true);
    simulateClientCreation();

    // Navigate to client page after showing success
    await new Promise((resolve) => setTimeout(resolve, 1000));
    router.push("/demo/client");
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)]">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-32 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-[oklch(0.35_0.08_250_/_0.06)] to-transparent blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-[400px] w-[400px] rounded-full bg-gradient-to-tr from-[oklch(0.696_0.17_162.48_/_0.04)] to-transparent blur-3xl" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8 lg:px-8">
        {/* Header */}
        <div className="animate-fade-up mb-8">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[oklch(0.35_0.08_250)] to-[oklch(0.45_0.1_230)]">
              <UserPlus className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="font-display text-foreground text-2xl font-semibold tracking-tight lg:text-3xl">
                Add New Client
              </h1>
              <p className="text-muted-foreground">
                Enter client information to begin their financial analysis
              </p>
            </div>
          </div>
        </div>

        {/* Form Card */}
        <Card
          className="animate-fade-up animation-delay-100 border-border/60 mx-auto max-w-2xl p-6"
          data-tour="client-form"
        >
          {isSuccess ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="bg-emerald/10 mb-4 flex h-16 w-16 items-center justify-center rounded-full">
                <CheckCircle2 className="text-emerald h-8 w-8" />
              </div>
              <h2 className="text-foreground mb-2 text-xl font-semibold">
                Client Created Successfully!
              </h2>
              <p className="text-muted-foreground mb-4">
                Redirecting to client analysis...
              </p>
              <Loader2 className="text-primary h-5 w-5 animate-spin" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name Fields */}
              <div data-tour="name-fields">
                <h3 className="text-foreground mb-4 text-sm font-medium">
                  Client Information
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) =>
                        handleInputChange("firstName", e.target.value)
                      }
                      className="border-border/60"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) =>
                        handleInputChange("lastName", e.target.value)
                      }
                      className="border-border/60"
                    />
                  </div>
                </div>
              </div>

              {/* Demographics */}
              <div data-tour="demographics-fields">
                <h3 className="text-foreground mb-4 text-sm font-medium">
                  Demographics
                </h3>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="dateOfBirth">Date of Birth</Label>
                    <Input
                      id="dateOfBirth"
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={(e) =>
                        handleInputChange("dateOfBirth", e.target.value)
                      }
                      className="border-border/60"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Select
                      value={formData.state}
                      onValueChange={(value) =>
                        handleInputChange("state", value)
                      }
                    >
                      <SelectTrigger className="border-border/60">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATES.map((stateCode) => (
                          <SelectItem key={stateCode} value={stateCode}>
                            {stateCode}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sex">Sex</Label>
                    <Select
                      value={formData.sex}
                      onValueChange={(value) => handleInputChange("sex", value)}
                    >
                      <SelectTrigger className="border-border/60">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="M">Male</SelectItem>
                        <SelectItem value="F">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Health Information */}
              <div data-tour="health-fields">
                <h3 className="text-foreground mb-4 text-sm font-medium">
                  Health Information
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="healthRating">Health Rating</Label>
                    <Select
                      value={formData.healthRating}
                      onValueChange={(value) =>
                        handleInputChange("healthRating", value)
                      }
                    >
                      <SelectTrigger className="border-border/60">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {HEALTH_RATINGS.map((rating) => (
                          <SelectItem key={rating.value} value={rating.value}>
                            {rating.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end space-x-3 pb-2">
                    <Checkbox
                      id="smoker"
                      checked={formData.smoker}
                      onCheckedChange={(checked: boolean | "indeterminate") =>
                        handleInputChange("smoker", Boolean(checked))
                      }
                    />
                    <Label htmlFor="smoker" className="cursor-pointer">
                      Tobacco user
                    </Label>
                  </div>
                </div>
              </div>

              {/* Spouse Information */}
              <div data-tour="spouse-fields">
                <h3 className="text-foreground mb-4 text-sm font-medium">
                  Family Information
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="hasSpouse"
                      checked={formData.hasSpouse}
                      onCheckedChange={(checked: boolean | "indeterminate") =>
                        handleInputChange("hasSpouse", Boolean(checked))
                      }
                    />
                    <Label htmlFor="hasSpouse" className="cursor-pointer">
                      Has spouse/partner
                    </Label>
                  </div>
                  {formData.hasSpouse && (
                    <div className="max-w-[200px] space-y-2">
                      <Label htmlFor="spouseAge">Spouse Age</Label>
                      <Input
                        id="spouseAge"
                        type="number"
                        value={formData.spouseAge}
                        onChange={(e) =>
                          handleInputChange("spouseAge", e.target.value)
                        }
                        className="border-border/60"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <div
                className="border-border/60 flex justify-end gap-3 border-t pt-6"
                data-tour="submit-button"
              >
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/demo/portfolio")}
                  className="border-border/60"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-emerald hover:bg-emerald/90 min-w-[140px] gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Client"
                  )}
                </Button>
              </div>
            </form>
          )}
        </Card>
      </div>

      {/* Tour Overlay */}
      <TourOverlay
        steps={addClientTourSteps}
        currentStep={state.currentTourStep}
        onNext={() => {
          if (state.currentTourStep >= addClientTourSteps.length - 1) {
            setShowTour(false);
          } else {
            nextTourStep();
          }
        }}
        onPrev={prevTourStep}
        onSkip={() => setShowTour(false)}
        isVisible={state.showTour && !isSuccess}
      />
    </div>
  );
}
