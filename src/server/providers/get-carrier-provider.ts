import { env } from "@/env";
import type { CarrierProvider } from "@/lib/providers/carrier-provider";
import { mockTermLifeProvider } from "@/lib/providers/mock-term-life-provider";

const carrierProviders: Record<string, CarrierProvider> = {
  mock: mockTermLifeProvider,
};

export function getCarrierProvider(): CarrierProvider {
  return carrierProviders[env.CARRIER_PROVIDER] ?? mockTermLifeProvider;
}
