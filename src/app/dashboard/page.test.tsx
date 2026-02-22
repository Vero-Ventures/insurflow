import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import DashboardPage from "@/app/dashboard/page";

describe("DashboardPage", () => {
  it("shows primary client journey actions", () => {
    render(<DashboardPage />);

    const continueIntakeLink = screen.getByRole("link", {
      name: /continue intake/i,
    });
    const estimateSnapshotLink = screen.getByRole("link", {
      name: /view estimate snapshot/i,
    });
    const advisorHandoffLink = screen.getByRole("link", {
      name: /advisor handoff/i,
    });

    expect(continueIntakeLink.getAttribute("href")).toBe("/demo/intake");
    expect(estimateSnapshotLink.getAttribute("href")).toBe("/demo/estimate");
    expect(advisorHandoffLink.getAttribute("href")).toBe("/demo/handoff");
  });
});
