"use client";

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
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, Clock3 } from "lucide-react";
import {
  useDemoContext,
  type HouseholdStatus,
} from "@/components/demo/demo-context";

const TOTAL_STEPS = 4;
const CURRENT_STEP = 1;

export default function DemoIntakePage() {
  const router = useRouter();
  const { state, updateIntakeData } = useDemoContext();

  const handleContinue = () => {
    router.push("/demo/estimate");
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)]">
      <div className="relative z-10 container mx-auto px-4 py-8 lg:px-8">
        <div className="mb-8 max-w-3xl">
          <div className="mb-3 flex items-center gap-3">
            <span className="text-muted-foreground text-sm">
              Step {CURRENT_STEP} of {TOTAL_STEPS}
            </span>
            <div className="bg-border h-1.5 w-32 overflow-hidden rounded-full">
              <div
                className="bg-emerald h-full"
                style={{ width: `${(CURRENT_STEP / TOTAL_STEPS) * 100}%` }}
              />
            </div>
            <span className="text-muted-foreground inline-flex items-center gap-1.5 text-sm">
              <Clock3 className="h-3.5 w-3.5" />
              About 5-7 minutes
            </span>
          </div>

          <h1
            className="font-display text-foreground text-2xl font-semibold tracking-tight lg:text-3xl"
            data-tour="intake-heading"
          >
            Tell us about your household
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            This quick intake keeps things simple and helps generate an initial
            estimate before you speak with an advisor.
          </p>
        </div>

        <Card
          className="border-border/60 mx-auto max-w-3xl p-6"
          data-tour="intake-form"
        >
          <form
            className="space-y-6"
            onSubmit={(event) => {
              event.preventDefault();
              handleContinue();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="household-status">Household status</Label>
              <Select
                value={state.intakeData.householdStatus}
                onValueChange={(value) =>
                  updateIntakeData({
                    householdStatus: value as HouseholdStatus,
                  })
                }
              >
                <SelectTrigger
                  id="household-status"
                  className="border-border/60"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single</SelectItem>
                  <SelectItem value="married">Married</SelectItem>
                  <SelectItem value="partnered">Partnered</SelectItem>
                  <SelectItem value="single_parent">Single parent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="annual-income">Annual household income</Label>
                <Input
                  id="annual-income"
                  inputMode="numeric"
                  value={state.intakeData.annualHouseholdIncome}
                  onChange={(event) =>
                    updateIntakeData({
                      annualHouseholdIncome: event.target.value,
                    })
                  }
                  className="border-border/60"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="total-debts">Total debts</Label>
                <Input
                  id="total-debts"
                  inputMode="numeric"
                  value={state.intakeData.totalDebts}
                  onChange={(event) =>
                    updateIntakeData({ totalDebts: event.target.value })
                  }
                  className="border-border/60"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="current-coverage">
                Current life insurance coverage
              </Label>
              <Input
                id="current-coverage"
                inputMode="numeric"
                value={state.intakeData.currentCoverage}
                onChange={(event) =>
                  updateIntakeData({ currentCoverage: event.target.value })
                }
                className="border-border/60"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="primary-goal">
                What matters most for your family?
              </Label>
              <Textarea
                id="primary-goal"
                rows={4}
                value={state.intakeData.primaryGoal}
                onChange={(event) =>
                  updateIntakeData({ primaryGoal: event.target.value })
                }
                className="border-border/60"
              />
            </div>

            <div className="border-border/60 flex justify-end border-t pt-4">
              <Button
                type="submit"
                className="bg-emerald hover:bg-emerald/90 gap-2"
              >
                See Estimate
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
