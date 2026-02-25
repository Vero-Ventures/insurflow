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
});
