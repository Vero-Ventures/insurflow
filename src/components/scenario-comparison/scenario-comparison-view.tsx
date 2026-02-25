"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Minus,
  FileDown,
  MonitorUp,
  SlidersHorizontal,
} from "lucide-react";
import {
  ScenarioCard,
  type Scenario,
  type ScenarioCoverage,
} from "@/components/scenario-comparison/scenario-card";
import { ScenarioMeetingSummary } from "@/components/scenario-comparison/scenario-meeting-summary";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MIN_SCENARIOS = 2;
const MAX_SCENARIOS = 3;

const DEFAULT_COVERAGE = {
  life: 500_000,
  disability: 5_000, // monthly
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

export function ScenarioComparisonView() {
  const [scenarios, setScenarios] = useState<Scenario[]>(() => [
    createScenario(0),
    createScenario(1),
  ]);
  const [isMeetingMode, setIsMeetingMode] = useState(false);
  const [meetingSummaryCalculatedAt, setMeetingSummaryCalculatedAt] = useState(
    () => new Date(),
  );

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
    window.print();
  }, []);

  const handleMeetingRecalculate = useCallback(() => {
    // Summary values are derived from current scenarios, so recalculation
    // refreshes the visible snapshot timestamp during the meeting.
    setMeetingSummaryCalculatedAt(new Date());
  }, []);

  // ---- Render -------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={addScenario}
            disabled={scenarios.length >= MAX_SCENARIOS}
            className="w-full sm:w-auto"
          >
            <Plus className="size-4" data-icon="inline-start" />
            Add Scenario
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={removeScenario}
            disabled={scenarios.length <= MIN_SCENARIOS}
            className="w-full sm:w-auto"
          >
            <Minus className="size-4" data-icon="inline-start" />
            Remove
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPdf}
            className="w-full sm:w-auto"
          >
            <FileDown className="size-4" data-icon="inline-start" />
            Export PDF
          </Button>
        </div>
        <Button
          variant={isMeetingMode ? "secondary" : "default"}
          size="sm"
          onClick={() => setIsMeetingMode((prev) => !prev)}
          className="w-full sm:w-auto"
        >
          {isMeetingMode ? (
            <SlidersHorizontal className="size-4" data-icon="inline-start" />
          ) : (
            <MonitorUp className="size-4" data-icon="inline-start" />
          )}
          {isMeetingMode ? "Back to Assumptions" : "Open Meeting Mode"}
        </Button>
      </div>

      {isMeetingMode ? (
        <ScenarioMeetingSummary
          scenarios={scenarios}
          lastRecalculatedAt={meetingSummaryCalculatedAt}
          onRecalculate={handleMeetingRecalculate}
          onEditAssumptions={() => setIsMeetingMode(false)}
        />
      ) : null}

      {!isMeetingMode ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {scenarios.map((scenario) => (
            <ScenarioCard
              key={scenario.id}
              scenario={scenario}
              onNameChange={handleNameChange}
              onCoverageChange={handleCoverageChange}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
