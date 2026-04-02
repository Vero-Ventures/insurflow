import { getDb } from "@/server/db";
import { client, asset, debt, policy } from "@/server/db/schemas";
import { and, eq, isNull, sql } from "drizzle-orm";
import {
  calculateInsuranceNeedsRounded,
  DEFAULT_ESTATE_BUFFER,
  type InsuranceNeedsInput,
} from "@/lib/financial/insurance-needs";
import { resolveExistingCoverage } from "@/lib/policy-utils";
import { decimalToNumber } from "@/lib/financial/decimal-to-number";
import type { InsuranceNeedsSnapshot } from "@/server/db/schemas/life-events-schema";

/**
 * Compute a fresh insurance needs snapshot from current client DB state.
 *
 * Fetches the client's financial profile (assets, debts, policies) and runs
 * the insurance needs calculation engine, returning only the snapshot fields
 * needed for life event before/after comparisons.
 *
 * Used by the life-events API to record before/after snapshots.
 */
export async function computeCurrentSnapshot(
  clientId: string,
  userId: string,
): Promise<InsuranceNeedsSnapshot | null> {
  const db = getDb();

  const clientData = await db.query.client.findFirst({
    where: and(
      eq(client.id, clientId),
      eq(client.userId, userId),
      isNull(client.deletedAt),
    ),
  });

  if (!clientData) return null;

  const [assetTotals, debtTotals, policyTotals] = await Promise.all([
    db
      .select({
        totalAssets: sql<string>`COALESCE(SUM(${asset.currentValue}), 0)`,
        liquidAssets: sql<string>`COALESCE(SUM(CASE WHEN ${asset.isLiquid} THEN ${asset.currentValue} ELSE 0 END), 0)`,
      })
      .from(asset)
      .where(and(eq(asset.clientId, clientId), isNull(asset.deletedAt)))
      .then((rows) => rows[0]),
    db
      .select({
        totalDebts: sql<string>`COALESCE(SUM(${debt.currentBalance}), 0)`,
      })
      .from(debt)
      .where(and(eq(debt.clientId, clientId), isNull(debt.deletedAt)))
      .then((rows) => rows[0]),
    db
      .select({
        totalActivePolicyCoverage: sql<string>`COALESCE(SUM(CASE WHEN ${policy.status} = 'active' THEN ${policy.faceAmount} ELSE 0 END), 0)`,
        totalPolicyCount: sql<number>`COUNT(*)`,
      })
      .from(policy)
      .where(and(eq(policy.clientId, clientId), isNull(policy.deletedAt)))
      .then((rows) => rows[0]),
  ]);

  const totalAssets = decimalToNumber(assetTotals?.totalAssets);
  const liquidAssets = decimalToNumber(assetTotals?.liquidAssets);
  const totalDebts = decimalToNumber(debtTotals?.totalDebts);
  const policyCount = Number(policyTotals?.totalPolicyCount ?? 0);
  const totalActivePolicyCoverage = decimalToNumber(
    policyTotals?.totalActivePolicyCoverage,
  );

  const { existingCoverage } = resolveExistingCoverage({
    totalPolicyCount: policyCount,
    activePolicyCoverage: totalActivePolicyCoverage,
    legacyCoverage: decimalToNumber(clientData.existingLifeInsuranceCoverage),
  });

  const input: InsuranceNeedsInput = {
    clientIncome: decimalToNumber(clientData.clientIncome),
    spouseIncome: decimalToNumber(clientData.spouseIncome),
    includeSpouseIncome: clientData.hasSpouse ?? false,
    incomeReplacementPercent: decimalToNumber(
      clientData.incomeReplacementPercent,
    ),
    replacementDurationYears: clientData.replacementDurationYears ?? 10,
    existingLifeInsuranceCoverage: existingCoverage,
    totalDebts,
    liquidAssets,
    totalAssets,
    estateBuffer: DEFAULT_ESTATE_BUFFER,
  };

  const result = calculateInsuranceNeedsRounded(input);

  return {
    incomeReplacementNeeds: result.incomeReplacementNeeds,
    debtPayoffNeeds: result.debtPayoffNeeds,
    estateBufferNeeds: result.estateBufferNeeds,
    grossNeeds: result.grossNeeds,
    existingCoverage: result.existingCoverage,
    liquidAssets: result.liquidAssets,
    totalInsuranceNeeds: result.totalInsuranceNeeds,
  };
}
