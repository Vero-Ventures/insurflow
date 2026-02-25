import type {
  CalculationTrace,
  TraceItem,
  TraceItemKind,
  TraceSection,
} from "@/types/calculation-trace";

export const CALCULATION_TRACE_VERSION = "1.0.0";

type TraceItemInput = Omit<TraceItem, "kind"> & {
  kind: TraceItemKind;
};

type TraceSectionInput = Omit<TraceSection, "items"> & {
  items?: TraceItem[];
};

export function createTraceItem(input: TraceItemInput): TraceItem {
  return {
    key: input.key,
    label: input.label,
    value: input.value,
    kind: input.kind,
    unit: input.unit,
  };
}

export function createTraceSection(input: TraceSectionInput): TraceSection {
  return {
    key: input.key,
    label: input.label,
    items: input.items ?? [],
    result: input.result,
    notes: input.notes,
  };
}

export function createCalculationTrace(
  sections: TraceSection[],
  version = CALCULATION_TRACE_VERSION,
): CalculationTrace {
  return {
    version,
    sections,
  };
}
