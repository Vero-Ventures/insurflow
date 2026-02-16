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
// SliderRow sub-component
// ---------------------------------------------------------------------------

import { Slider } from "@/components/ui/slider";

interface SliderRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  ariaLabel: string;
  currencyFormat?: "monthly";
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  onChange,
  ariaLabel,
  currencyFormat,
}: SliderRowProps) {
  // Accessible currency formatting
  const formatted =
    currencyFormat === "monthly"
      ? `${formatCurrency(value)}/mo`
      : formatCurrency(value);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium" htmlFor={ariaLabel}>
          {label}
        </label>
        <span className="font-currency text-sm" aria-live="polite">
          {formatted}
        </span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(vals: number[]) =>
          onChange(typeof vals[0] === "number" ? vals[0] : value)
        }
        aria-label={ariaLabel}
        className="w-full"
      />
      <div className="text-muted-foreground flex justify-between text-xs">
        <span>{formatCurrency(min)}</span>
        <span>{formatCurrency(max)}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ScenarioCard({ scenario, onNameChange }: ScenarioCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  // Controlled coverage state
  const [coverage, setCoverage] = useState<ScenarioCoverage>(scenario.coverage);

  function handleEditStart() {
    setIsEditing(true);
    requestAnimationFrame(() => inputRef.current?.select());
  }

  function handleEditEnd() {
    setIsEditing(false);
    const trimmed = inputRef.current?.value.trim();
    if (trimmed && trimmed !== scenario.name) {
      onNameChange(scenario.id, trimmed);
    }
  }

  // Slider change handler
  function handleCoverageChange(field: keyof ScenarioCoverage, value: number) {
    setCoverage((prev) => ({ ...prev, [field]: value }));
  }

  const totalCoverage =
    coverage.life + coverage.disability + coverage.criticalIllness;

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
              value={formatCurrency(coverage.life)}
            />
            <SummaryRow
              label="Disability"
              value={formatCurrency(coverage.disability)}
            />
            <SummaryRow
              label="Critical Illness"
              value={formatCurrency(coverage.criticalIllness)}
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
          <div className="flex flex-col gap-6">
            <SliderRow
              label="Life Insurance"
              value={coverage.life}
              min={0}
              max={2000000}
              step={10000}
              onChange={(v) => handleCoverageChange("life", v)}
              ariaLabel="Life Insurance Coverage"
            />
            <SliderRow
              label="Disability (Monthly)"
              value={coverage.disability}
              min={0}
              max={20000}
              step={500}
              onChange={(v) => handleCoverageChange("disability", v)}
              ariaLabel="Disability Coverage"
              currencyFormat="monthly"
            />
            <SliderRow
              label="Critical Illness"
              value={coverage.criticalIllness}
              min={0}
              max={500000}
              step={5000}
              onChange={(v) => handleCoverageChange("criticalIllness", v)}
              ariaLabel="Critical Illness Coverage"
            />
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
