"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Minus, FileDown } from "lucide-react";
import { toast } from "sonner";
import {
  ScenarioCard,
  type Scenario,
  type ScenarioCoverage,
} from "@/components/scenario-comparison/scenario-card";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MIN_SCENARIOS = 2;
const MAX_SCENARIOS = 3;

const DEFAULT_COVERAGE = {
  life: 500_000,
  disability: 60_000,
  criticalIllness: 100_000,
};

const SCENARIO_LABELS = ["A", "B", "C"] as const;

function createScenario(index: number): Scenario {
  return {
    id: crypto.randomUUID(),
    name: `Scenario ${SCENARIO_LABELS[index] ?? String(index + 1)}`,
    coverage: { ...DEFAULT_COVERAGE },
    results: {},
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ScenarioComparisonViewProps {
  clientId: string;
}

export function ScenarioComparisonView({
  clientId: _clientId,
}: ScenarioComparisonViewProps) {
  const [scenarios, setScenarios] = useState<Scenario[]>(() => [
    createScenario(0),
    createScenario(1),
  ]);

  // ---- Mutations ----------------------------------------------------------

  const handleNameChange = useCallback((id: string, name: string) => {
    setScenarios((prev) => prev.map((s) => (s.id === id ? { ...s, name } : s)));
  }, []);

  const handleCoverageChange = useCallback(
    (id: string, coverage: ScenarioCoverage) => {
      setScenarios((prev) =>
        prev.map((s) => (s.id === id ? { ...s, coverage } : s)),
      );
    },
    [],
  );

  const addScenario = useCallback(() => {
    setScenarios((prev) => {
      if (prev.length >= MAX_SCENARIOS) return prev;
      return [...prev, createScenario(prev.length)];
    });
  }, []);

  const removeScenario = useCallback(() => {
    setScenarios((prev) => {
      if (prev.length <= MIN_SCENARIOS) return prev;
      return prev.slice(0, -1);
    });
  }, []);

  const handleExportPdf = useCallback(() => {
    // TODO: integrate PDF export
    toast.info("PDF export coming soon");
  }, []);

  // ---- Render -------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">
          Scenario Comparison
        </h1>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={addScenario}
            disabled={scenarios.length >= MAX_SCENARIOS}
          >
            <Plus className="size-4" data-icon="inline-start" />
            Add Scenario
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={removeScenario}
            disabled={scenarios.length <= MIN_SCENARIOS}
          >
            <Minus className="size-4" data-icon="inline-start" />
            Remove
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPdf}>
            <FileDown className="size-4" data-icon="inline-start" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Scenario grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {scenarios.map((scenario) => (
          <ScenarioCard
            key={scenario.id}
            scenario={scenario}
            onNameChange={handleNameChange}
          />
        ))}
      </div>
    </div>
  );
}
