import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DraftResumeLink } from "./draft-resume-link";

describe("DraftResumeLink", () => {
  beforeEach(() => {
    vi.restoreAllMocks();

    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
      configurable: true,
    });
  });

  it("copies resume URL from API response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            token: "tok_123",
            expiresAt: "2026-03-05T00:00:00.000Z",
            resumeUrl: "/d2c/resume/tok_123",
          }),
          {
            status: 201,
            headers: { "Content-Type": "application/json" },
          },
        ),
      ),
    );

    render(<DraftResumeLink clientId="client-123" />);

    fireEvent.click(screen.getByRole("button", { name: /copy resume link/i }));

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        `${window.location.origin}/d2c/resume/tok_123`,
      );
    });

    expect(screen.getByRole("button", { name: /link copied!/i })).toBeTruthy();
  });
});
