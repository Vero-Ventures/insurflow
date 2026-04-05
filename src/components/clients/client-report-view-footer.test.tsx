import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ClientReportFooter } from "@/components/clients/report";

describe("Client report footer copy", () => {
  it("avoids advisor-specific recommendation language", () => {
    render(
      <ClientReportFooter
        clientId="client-1"
        updatedAt="2026-04-04T12:00:00.000Z"
      />,
    );

    expect(screen.queryByText(/financial advisor/i)).toBeNull();
    expect(screen.getByText(/licensed insurance professional/i)).toBeTruthy();
  });
});
