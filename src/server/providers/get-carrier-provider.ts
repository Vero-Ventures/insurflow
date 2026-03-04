import { env } from "@/env";
import type { CarrierProvider } from "@/lib/providers/carrier-provider";
import { mockTermLifeProvider } from "@/lib/providers/mock-term-life-provider";

export function getCarrierProvider(): CarrierProvider {
  switch (env.CARRIER_PROVIDER) {
    case "mock":
      return mockTermLifeProvider;
    default:
      return mockTermLifeProvider;
  }
}
