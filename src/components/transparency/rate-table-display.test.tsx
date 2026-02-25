import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RateTableDisplay } from "@/components/transparency/rate-table-display";
import { getStateRateTable } from "@/lib/transparency/rate-tables";

describe("RateTableDisplay", () => {
  it("renders row headers for rate labels", () => {
    render(
      <RateTableDisplay rateTable={getStateRateTable("CA")} defaultOpen />,
    );

    expect(screen.getAllByRole("rowheader").length).toBeGreaterThan(0);
  });
});
