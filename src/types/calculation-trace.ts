export type CalculationTrace = {
  version: string;
  sections: TraceSection[];
};

export type TraceSection = {
  key: string;
  label: string;
  items: TraceItem[];
  result?: number;
  notes?: string[];
};

export type TraceItemKind = "input" | "assumption" | "intermediate" | "result";

export type TraceItem = {
  key: string;
  label: string;
  value: number | string | null;
  kind: TraceItemKind;
  unit?: string;
};
