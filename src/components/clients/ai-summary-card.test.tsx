import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AISummaryCard } from "./ai-summary-card";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("AISummaryCard", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("polls queued letter jobs after enqueueing them", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jobId: "job-123",
          status: "queued",
          pollUrl: "/api/clients/client-123/letter-jobs/job-123",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jobId: "job-123",
          status: "completed",
          letter: "Async letter body",
          generatedAt: "2026-04-02T18:05:00.000Z",
          errorCode: null,
          errorMessage: null,
        }),
      });

    vi.stubGlobal("fetch", fetchMock);

    render(<AISummaryCard clientId="client-123" />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /generate letter/i }));
      await Promise.resolve();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/clients/client-123/generate-letter",
      expect.objectContaining({ method: "POST" }),
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/clients/client-123/letter-jobs/job-123",
      expect.objectContaining({ credentials: "include" }),
    );
  });
});
