import type {
  EstimateRangeInput,
  PremiumRangeEstimate,
} from "@/lib/providers/carrier-provider";

export type EstimatePremiumRangeInput = EstimateRangeInput;

export interface TermLifeProvider {
  estimatePremiumRange(
    input: EstimatePremiumRangeInput,
  ): Promise<PremiumRangeEstimate>;
}
