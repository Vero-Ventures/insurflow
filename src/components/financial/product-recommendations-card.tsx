"use client";

import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertTriangle,
  Info,
  ShieldAlert,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { formatCurrency } from "@/lib/client-utils";
import {
  generateRecommendations,
  type RecommendationInput,
  type ProductRecommendation,
} from "@/lib/financial/product-recommendation";

interface ProductRecommendationsCardProps {
  input: RecommendationInput;
}

function ScoreBar({ score }: { score: number }) {
  return (
    <div className="bg-border h-2 w-full overflow-hidden rounded-full">
      <div
        className={`h-full transition-all duration-500 ${
          score >= 80
            ? "bg-emerald"
            : score >= 60
              ? "bg-amber-500"
              : "bg-rose-500"
        }`}
        style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
      />
    </div>
  );
}

function ProductCard({ rec }: { rec: ProductRecommendation }) {
  return (
    <Card className="border-border/60 flex flex-col">
      <div className="flex items-start justify-between p-4 pb-0 sm:p-6">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-lg font-semibold">{rec.productName}</h4>
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            Overall Match Score: {Math.round(rec.score)}/100
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold">
            {formatCurrency(rec.monthlyPremium)}/mo
          </p>
          <p className="text-muted-foreground text-sm">
            {formatCurrency(rec.annualPremium)}/yr
          </p>
        </div>
      </div>

      <div className="mt-2 mb-4 px-4 sm:px-6">
        <ScoreBar score={rec.score} />
      </div>

      <div className="grid flex-1 gap-4 p-4 pt-0 sm:grid-cols-2 sm:p-6">
        <div className="space-y-3">
          <div>
            <span className="text-foreground flex items-center gap-1.5 text-sm font-medium">
              <CheckCircle2 className="text-emerald h-4 w-4" />
              Why it fits
            </span>
            <ul className="mt-1.5 space-y-1">
              {rec.reasons.map((reason, i) => (
                <li
                  key={i}
                  className="text-muted-foreground text-sm leading-snug"
                >
                  • {reason}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <span className="text-foreground flex items-center gap-1.5 text-sm font-medium">
              <Info className="h-4 w-4 text-blue-500" />
              Key Features
            </span>
            <ul className="mt-1.5 space-y-1">
              {rec.features.map((feature, i) => (
                <li
                  key={i}
                  className="text-muted-foreground text-sm leading-snug"
                >
                  • {feature}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div>
          <span className="text-foreground flex items-center gap-1.5 text-sm font-medium">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Considerations
          </span>
          <ul className="mt-1.5 space-y-1">
            {rec.considerations.map((consideration, i) => (
              <li
                key={i}
                className="text-muted-foreground text-sm leading-snug"
              >
                • {consideration}
              </li>
            ))}
          </ul>

          <div className="bg-muted border-border/50 mt-4 rounded-md border p-3">
            <p className="text-sm font-medium">Recommended Coverage</p>
            <p className="mt-0.5 text-lg font-semibold">
              {formatCurrency(rec.recommendedFaceAmount)}
            </p>
            <p className="text-muted-foreground mt-1 text-xs">
              Meets {Math.round(rec.percentNeedMet)}% of your calculated need
            </p>
            {!rec.withinBudget && (
              <p className="mt-1.5 flex items-center gap-1 text-xs text-amber-600">
                <AlertTriangle className="h-3 w-3" />
                Exceeds suggested budget
              </p>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

export function ProductRecommendationsCard({
  input,
}: ProductRecommendationsCardProps) {
  const [isOpen, setIsOpen] = useState(true);

  const result = useMemo(() => {
    try {
      return generateRecommendations(input);
    } catch (e) {
      console.error("Failed to generate recommendations:", e);
      return null;
    }
  }, [input]);

  if (!result) return null;

  return (
    <Card
      className="border-border/60 overflow-hidden"
      data-tour="product-recommendations"
    >
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="border-border/60 bg-muted/20 flex items-center justify-between border-b p-4 sm:p-6">
          <div>
            <h2 className="text-foreground text-lg font-semibold sm:text-xl">
              Product Recommendations
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              AI-driven analysis based on your financial profile and coverage
              needs.
            </p>
          </div>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              {isOpen ? (
                <ChevronUp className="h-5 w-5" />
              ) : (
                <ChevronDown className="h-5 w-5" />
              )}
              <span className="sr-only">Toggle Recommendations</span>
            </Button>
          </CollapsibleTrigger>
        </div>

        <CollapsibleContent>
          <CardContent className="space-y-6 p-4 sm:p-6">
            {/* Analysis Summary */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="bg-muted/30 border-border/50 rounded-lg border p-4">
                <h3 className="text-muted-foreground mb-3 flex items-center gap-1.5 text-sm font-medium">
                  <ShieldAlert className="h-4 w-4" /> Coverage Gap Analysis
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Total Need:</span>
                    <span className="font-medium">
                      {formatCurrency(result.coverageAnalysis.totalNeed)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Existing Coverage:</span>
                    <span className="font-medium">
                      {formatCurrency(result.coverageAnalysis.existingCoverage)}
                    </span>
                  </div>
                  <div className="bg-border my-2 h-px w-full" />
                  <div className="flex justify-between text-sm font-semibold">
                    <span>Identified Gap:</span>
                    <span className="text-chart-3">
                      {formatCurrency(result.coverageAnalysis.coverageGap)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-muted/30 border-border/50 rounded-lg border p-4">
                <h3 className="text-muted-foreground mb-3 flex items-center gap-1.5 text-sm font-medium">
                  <CheckCircle2 className="h-4 w-4" /> Budget Analysis
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Suggested Annual Budget:</span>
                    <span className="font-medium">
                      {formatCurrency(result.budgetAnalysis.suggestedBudget)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Monthly Equivalent:</span>
                    <span className="font-medium">
                      {formatCurrency(
                        result.budgetAnalysis.suggestedBudget / 12,
                      )}
                      /mo
                    </span>
                  </div>
                  <p className="text-muted-foreground mt-2 text-xs">
                    Can typically afford up to{" "}
                    <strong>
                      {formatCurrency(
                        result.budgetAnalysis.maxAffordableFaceAmount,
                      )}
                    </strong>{" "}
                    in baseline coverage.
                  </p>
                </div>
              </div>
            </div>

            {/* Recommendations List */}
            <div className="space-y-4">
              <h3 className="text-base font-semibold">Recommended Option</h3>
              <div className="grid gap-4">
                {result.recommendations
                  .filter((rec) => rec.productType === "term_life")
                  .map((rec) => (
                    <ProductCard key={rec.productType} rec={rec} />
                  ))}
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
