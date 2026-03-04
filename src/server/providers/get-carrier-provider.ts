import { env } from "@/env";
import type { CarrierProvider } from "@/lib/providers/carrier-provider";
import { mockTermLifeProvider } from "@/lib/providers/mock-term-life-provider";

export function getCarrierProvider(): CarrierProvider {
  if (env.CARRIER_PROVIDER === "mock") {
    return mockTermLifeProvider;
  }

  return mockTermLifeProvider;
}
