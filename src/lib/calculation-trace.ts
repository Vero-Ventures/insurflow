import type { CalculationTrace, TraceSection } from "@/types/calculation-trace";

export const CALCULATION_TRACE_VERSION = "1.0.0";

export function createCalculationTrace(
  sections: TraceSection[],
  version = CALCULATION_TRACE_VERSION,
): CalculationTrace {
  return {
    version,
    sections,
  };
}
