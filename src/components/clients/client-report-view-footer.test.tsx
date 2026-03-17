import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

function ReportFooterCopy() {
  return (
    <p>
      This report is generated for informational purposes only and should not be
      considered financial advice. Please consult with a licensed insurance
      professional for personalized recommendations.
    </p>
  );
}

describe("Client report footer copy", () => {
  it("avoids advisor-specific recommendation language", () => {
    render(<ReportFooterCopy />);

    expect(screen.queryByText(/financial advisor/i)).toBeNull();
    expect(screen.getByText(/licensed insurance professional/i)).toBeTruthy();
  });
});
