import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import DashboardPage from "@/app/dashboard/page";
import {
  DEMO_HANDOFF_ROUTE,
  DEMO_INTAKE_ROUTE,
  DEMO_SNAPSHOT_ROUTE,
} from "@/lib/app-routes";

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

    expect(continueIntakeLink.getAttribute("href")).toBe(DEMO_INTAKE_ROUTE);
    expect(estimateSnapshotLink.getAttribute("href")).toBe(DEMO_SNAPSHOT_ROUTE);
    expect(advisorHandoffLink.getAttribute("href")).toBe(DEMO_HANDOFF_ROUTE);
  });
});
