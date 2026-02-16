"use client";

import { useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Pencil } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ScenarioCoverage {
  life: number;
  disability: number;
  criticalIllness: number;
}

export interface Scenario {
  id: string;
  name: string;
  coverage: ScenarioCoverage;
  results: Record<string, unknown>;
}

interface ScenarioCardProps {
  scenario: Scenario;
  onNameChange: (id: string, name: string) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ScenarioCard({ scenario, onNameChange }: ScenarioCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleEditStart() {
    setIsEditing(true);
    // Focus after React renders the input
    requestAnimationFrame(() => inputRef.current?.select());
  }

  function handleEditEnd() {
    setIsEditing(false);
    const trimmed = inputRef.current?.value.trim();
    if (trimmed && trimmed !== scenario.name) {
      onNameChange(scenario.id, trimmed);
    }
  }

  const totalCoverage =
    scenario.coverage.life +
    scenario.coverage.disability +
    scenario.coverage.criticalIllness;

  return (
    <Card className="flex h-full flex-col">
      {/* ---- Header with editable name ---------------------------------- */}
      <CardHeader className="border-b pb-4">
        <div className="flex items-center gap-2">
          {isEditing ? (
            <Input
              ref={inputRef}
              defaultValue={scenario.name}
              onBlur={handleEditEnd}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleEditEnd();
                if (e.key === "Escape") setIsEditing(false);
              }}
              className="h-7 text-base font-medium"
              autoFocus
            />
          ) : (
            <CardTitle
              className="flex cursor-pointer items-center gap-1.5"
              onClick={handleEditStart}
            >
              {scenario.name}
              <Pencil className="text-muted-foreground size-3.5 shrink-0" />
            </CardTitle>
          )}
        </div>
      </CardHeader>

      {/* ---- Summary section --------------------------------------------- */}
      <CardContent className="flex flex-1 flex-col gap-5 pt-5">
        <div>
          <h4 className="text-muted-foreground mb-2 text-xs font-semibold tracking-wider uppercase">
            Coverage Summary
          </h4>
          <div className="grid gap-2">
            <SummaryRow
              label="Life Insurance"
              value={formatCurrency(scenario.coverage.life)}
            />
            <SummaryRow
              label="Disability"
              value={formatCurrency(scenario.coverage.disability)}
            />
            <SummaryRow
              label="Critical Illness"
              value={formatCurrency(scenario.coverage.criticalIllness)}
            />
          </div>
        </div>

        {/* Total */}
        <div className="border-t pt-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Total Coverage</span>
            <Badge variant="secondary" className="font-currency text-sm">
              {formatCurrency(totalCoverage)}
            </Badge>
          </div>
        </div>

        {/* ---- Sliders placeholder --------------------------------------- */}
        <div className="mt-auto">
          <h4 className="text-muted-foreground mb-2 text-xs font-semibold tracking-wider uppercase">
            Adjustments
          </h4>
          <div className="bg-muted/40 flex items-center justify-center rounded-lg border border-dashed p-6">
            <span className="text-muted-foreground text-sm">
              Sliders coming soon
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-currency font-medium">{value}</span>
    </div>
  );
}
