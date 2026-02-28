import { describe, expect, it } from "vitest";

import {
  buildClientTabHref,
  resolveClientTab,
  type ClientDetailTab,
} from "@/lib/client-detail-tabs";

describe("client detail tab helpers", () => {
  it("resolves valid tab query values", () => {
    const tabs: ClientDetailTab[] = [
      "profile",
      "financial",
      "insurance",
      "report",
    ];

    tabs.forEach((tab) => {
      expect(resolveClientTab(tab)).toBe(tab);
    });
  });

  it("falls back to profile for invalid tab values", () => {
    expect(resolveClientTab(null)).toBe("profile");
    expect(resolveClientTab("unknown")).toBe("profile");
    expect(resolveClientTab("reporting")).toBe("profile");
  });

  it("builds stable tab hrefs for client detail pages", () => {
    expect(buildClientTabHref("client-123", "insurance")).toBe(
      "/clients/client-123?tab=insurance",
    );
    expect(buildClientTabHref("client-123", "report")).toBe(
      "/clients/client-123?tab=report",
    );
  });
});
