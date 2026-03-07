import { describe, expect, it, vi } from "vitest";

describe("getCarrierProvider", () => {
  it("returns mock provider by default", async () => {
    vi.resetModules();
    vi.doMock("@/env", () => ({
      env: {
        CARRIER_PROVIDER: "mock",
      },
    }));

    const mod = await import("@/server/providers/get-carrier-provider");

    expect(mod.getCarrierProvider().providerId).toBe("mock");
  });

  it("falls back to mock for unsupported values", async () => {
    vi.resetModules();
    vi.doMock("@/env", () => ({
      env: {
        CARRIER_PROVIDER: "unsupported",
      },
    }));

    const mod = await import("@/server/providers/get-carrier-provider");

    expect(mod.getCarrierProvider().providerId).toBe("mock");
  });
});
