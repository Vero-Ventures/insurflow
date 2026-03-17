import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  getTargetCoverageFromSortedTotals,
  ScenarioMeetingSummary,
} from "./scenario-meeting-summary";

describe("getTargetCoverageFromSortedTotals", () => {
  it("returns the average of the two middle values for even scenarios", () => {
    expect(getTargetCoverageFromSortedTotals([100_000, 300_000])).toBe(200_000);
  });

  it("uses consumer-friendly meeting language", () => {
    render(
      <ScenarioMeetingSummary
        scenarios={[
          {
            id: "base",
            name: "Base",
            coverage: {
              life: 500000,
              disability: 2500,
              criticalIllness: 0,
            },
            results: {},
          },
          {
            id: "plus",
            name: "Plus",
            coverage: {
              life: 650000,
              disability: 3000,
              criticalIllness: 0,
            },
            results: {},
          },
        ]}
        lastRecalculatedAt={new Date("2026-03-16T12:00:00Z")}
        onRecalculate={vi.fn()}
        onEditAssumptions={vi.fn()}
      />,
    );

    expect(screen.getByText(/conversation view/i)).toBeTruthy();
    expect(screen.queryByText(/advisor conversation view/i)).toBeNull();
    expect(screen.queryByText(/advisor validation/i)).toBeNull();
    expect(
      screen.getAllByText(/some assumptions still need professional review/i)
        .length,
    ).toBeGreaterThan(0);
  });
});
