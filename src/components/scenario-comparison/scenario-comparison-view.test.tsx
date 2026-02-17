import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ScenarioComparisonView } from "./scenario-comparison-view";
import { ScenarioCard, type Scenario } from "./scenario-card";

describe("ScenarioComparisonView", () => {
  it("enforces scenario count boundaries between 2 and 3", () => {
    render(<ScenarioComparisonView />);

    expect(screen.getAllByText(/Scenario [A-C]/)).toHaveLength(2);

    const addButton = screen.getByRole("button", { name: "Add Scenario" });
    const removeButton = screen.getByRole("button", { name: "Remove" });

    fireEvent.click(addButton);
    expect(screen.getAllByText(/Scenario [A-C]/)).toHaveLength(3);
    expect(addButton.getAttribute("disabled")).not.toBeNull();

    fireEvent.click(removeButton);
    expect(screen.getAllByText(/Scenario [A-C]/)).toHaveLength(2);
    expect(removeButton.getAttribute("disabled")).not.toBeNull();
  });
});

describe("ScenarioCard", () => {
  const scenario: Scenario = {
    id: "scenario-a",
    name: "Scenario A",
    coverage: {
      life: 500_000,
      disability: 5_000,
      criticalIllness: 100_000,
    },
    results: {},
  };

  it("shows annualized disability in coverage summary to match totals", () => {
    render(
      <ScenarioCard
        scenario={scenario}
        onNameChange={vi.fn()}
        onCoverageChange={vi.fn()}
      />,
    );

    expect(screen.getByText("Disability (Annual)")).toBeDefined();
    expect(screen.getByText("$60,000")).toBeDefined();
    expect(screen.getByText("$660,000")).toBeDefined();
  });
});
