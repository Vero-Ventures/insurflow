import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CalculationTraceViewer } from "./calculation-trace-viewer";

describe("CalculationTraceViewer", () => {
  it("renders readable sections and formats null/units safely", () => {
    render(
      <CalculationTraceViewer
        trace={{
          version: "1.0.0",
          sections: [
            {
              key: "income_replacement",
              label: "Income replacement",
              result: 125000,
              notes: ["Uses default replacement duration."],
              items: [
                {
                  key: "client_income",
                  label: "Client income",
                  value: 100000,
                  kind: "input",
                  unit: "currency",
                },
                {
                  key: "spouse_income",
                  label: "Spouse income",
                  value: null,
                  kind: "input",
                  unit: "currency",
                },
                {
                  key: "replacement_duration_years",
                  label: "Replacement duration",
                  value: 10,
                  kind: "assumption",
                  unit: "years",
                },
              ],
            },
          ],
        }}
      />,
    );

    expect(screen.getByText("Show your work")).toBeDefined();
    expect(screen.getByText("Income replacement")).toBeDefined();
    expect(screen.getByText("Not provided")).toBeDefined();
    expect(screen.getByText("10 years")).toBeDefined();
    expect(screen.getByText("$125,000.00")).toBeDefined();
    expect(screen.getByText("Assumption")).toBeDefined();
  });

  it("trims ratio values safely without regex backtracking", () => {
    render(
      <CalculationTraceViewer
        trace={{
          version: "1.0.0",
          sections: [
            {
              key: "ratios",
              label: "Ratios",
              items: [
                {
                  key: "ratio_1_2300",
                  label: "Ratio 1.2300",
                  value: 1.23,
                  kind: "intermediate",
                  unit: "ratio",
                },
                {
                  key: "ratio_1_0000",
                  label: "Ratio 1.0000",
                  value: 1,
                  kind: "intermediate",
                  unit: "ratio",
                },
                {
                  key: "ratio_1_2345",
                  label: "Ratio 1.2345",
                  value: 1.2345,
                  kind: "intermediate",
                  unit: "ratio",
                },
                {
                  key: "ratio_1_2001",
                  label: "Ratio 1.2001",
                  value: 1.2001,
                  kind: "intermediate",
                  unit: "ratio",
                },
                {
                  key: "ratio_1_0001",
                  label: "Ratio 1.0001",
                  value: 1.0001,
                  kind: "intermediate",
                  unit: "ratio",
                },
              ],
            },
          ],
        }}
      />,
    );

    expect(screen.getByText("1.23")).toBeDefined();
    expect(screen.getByText("1")).toBeDefined();
    expect(screen.getByText("1.2345")).toBeDefined();
    expect(screen.getByText("1.2001")).toBeDefined();
    expect(screen.getByText("1.0001")).toBeDefined();
  });
});
