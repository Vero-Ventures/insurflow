/**
 * @fileoverview Carrier provider registry.
 *
 * Manages the set of available carrier providers and resolves a provider
 * by its identifier. The mock provider is only registered in non-production
 * environments for security.
 *
 * To add a new carrier:
 * 1. Implement the CarrierProvider interface
 * 2. Register it in `buildRegistry()` below
 * 3. Add the corresponding signing secret to env vars
 */

import type { CarrierProvider } from "./carrier-provider";
import { createMockCarrierProvider } from "./mock-carrier-provider";

// ============================================================================
// ENV HELPERS
// ============================================================================

/**
 * Mock carrier webhook secret. Required when NODE_ENV !== "production".
 * In production the mock provider is not registered regardless of this value.
 */
const MOCK_WEBHOOK_SECRET =
  process.env.MOCK_CARRIER_WEBHOOK_SECRET ?? "dev-mock-secret";

// ============================================================================
// REGISTRY
// ============================================================================

function buildRegistry(): Map<string, CarrierProvider> {
  const registry = new Map<string, CarrierProvider>();

  // Mock provider: dev/test only
  if (process.env.NODE_ENV !== "production") {
    const mock = createMockCarrierProvider(MOCK_WEBHOOK_SECRET);
    registry.set(mock.providerId, mock);
  }

  // Future real carriers are registered here:
  // if (process.env.CARRIER_A_WEBHOOK_SECRET) {
  //   const carrierA = createCarrierAProvider(process.env.CARRIER_A_WEBHOOK_SECRET);
  //   registry.set(carrierA.providerId, carrierA);
  // }

  return registry;
}

/** Lazily initialized provider registry */
let _registry: Map<string, CarrierProvider> | null = null;

function getRegistry(): Map<string, CarrierProvider> {
  _registry ??= buildRegistry();
  return _registry;
}

/**
 * Resolve a carrier provider by its identifier.
 *
 * @param providerId - The provider identifier from the webhook URL or payload
 * @returns The matching CarrierProvider, or undefined if not found/not enabled
 */
export function getCarrierProvider(
  providerId: string,
): CarrierProvider | undefined {
  return getRegistry().get(providerId);
}

/**
 * List all registered provider IDs (useful for logging/diagnostics).
 */
export function listProviderIds(): string[] {
  return Array.from(getRegistry().keys());
}

/**
 * Reset the registry (for testing only).
 * @internal
 */
export function _resetRegistryForTesting(): void {
  _registry = null;
}
