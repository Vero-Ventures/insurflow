import { getDb } from "@/server/db";
import { asset, beneficiary } from "@/server/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { withApiHandler } from "@/lib/api/route-helpers";
import type { AssetGapAnalysis, GapAnalysisSummary } from "@/types/beneficiary";

/**
 * GET /api/clients/[id]/gap-analysis
 * Calculate gap analysis comparing desired vs actual beneficiary allocations
 */
export const GET = withApiHandler(
  {
    endpoint: "/api/clients/[id]/gap-analysis",
    method: "GET",
    requireClient: true,
  },
  async (_request, { logger, clientId }) => {
    const db = getDb();

    // Fetch all non-deleted assets for this client
    const assets = await db.query.asset.findMany({
      where: and(eq(asset.clientId, clientId!), isNull(asset.deletedAt)),
    });

    // Fetch all non-deleted beneficiaries for this client
    const beneficiaries = await db.query.beneficiary.findMany({
      where: and(
        eq(beneficiary.clientId, clientId!),
        isNull(beneficiary.deletedAt),
      ),
    });

    // Fetch all allocations for the client's beneficiaries
    const beneficiaryIds = beneficiaries.map((b) => b.id);

    // Get all allocations for these beneficiaries
    const allAllocations =
      beneficiaryIds.length > 0
        ? await db.query.assetAllocation.findMany({
            where: (assetAllocation, { inArray }) =>
              inArray(assetAllocation.beneficiaryId, beneficiaryIds),
          })
        : [];

    // Build a map of beneficiaryId -> beneficiary for quick lookup
    const beneficiaryMap = new Map(beneficiaries.map((b) => [b.id, b]));

    // Analyze each asset
    const assetAnalysis: AssetGapAnalysis[] = assets.map((assetRecord) => {
      // Get allocations for this specific asset
      const assetAllocations = allAllocations.filter(
        (a) => a.assetId === assetRecord.id,
      );

      // Calculate totals
      const totalDesiredPercent = assetAllocations.reduce((sum, a) => {
        const percent = parseFloat(a.desiredPercent || "0");
        return sum + (isNaN(percent) ? 0 : percent);
      }, 0);

      const totalActualPercent = assetAllocations.reduce((sum, a) => {
        const percent = parseFloat(a.actualPercent || "0");
        return sum + (isNaN(percent) ? 0 : percent);
      }, 0);

      // Build allocation details with gap info
      const allocations = assetAllocations.map((a) => {
        const beneficiaryRecord = beneficiaryMap.get(a.beneficiaryId);
        const desiredPercent = parseFloat(a.desiredPercent || "0");
        const actualPercent = parseFloat(a.actualPercent || "0");

        return {
          beneficiaryId: a.beneficiaryId,
          beneficiaryName: beneficiaryRecord
            ? `${beneficiaryRecord.firstName} ${beneficiaryRecord.lastName}`
            : "Unknown",
          relationship: beneficiaryRecord?.relationship || "other",
          desiredPercent: isNaN(desiredPercent) ? 0 : desiredPercent,
          actualPercent: isNaN(actualPercent) ? 0 : actualPercent,
          gapPercent:
            (isNaN(desiredPercent) ? 0 : desiredPercent) -
            (isNaN(actualPercent) ? 0 : actualPercent),
        };
      });

      // Determine if there's a gap (desired != actual)
      const hasGap = allocations.some((a) => Math.abs(a.gapPercent) > 0.01);
      const gapPercent = totalDesiredPercent - totalActualPercent;

      return {
        assetId: assetRecord.id,
        assetName: assetRecord.name,
        assetType: assetRecord.type,
        assetValue: parseFloat(assetRecord.currentValue || "0"),
        totalDesiredPercent,
        totalActualPercent,
        hasGap,
        gapPercent,
        allocations,
      };
    });

    // Calculate summary statistics
    const assetsWithGaps = assetAnalysis.filter((a) => a.hasGap).length;
    const unallocatedAssets = assetAnalysis.filter(
      (a) => a.allocations.length === 0,
    ).length;
    const overAllocatedAssets = assetAnalysis.filter(
      (a) => a.totalDesiredPercent > 100 || a.totalActualPercent > 100,
    ).length;

    const summary: GapAnalysisSummary = {
      totalAssets: assets.length,
      assetsWithGaps,
      assetsWithoutGaps: assets.length - assetsWithGaps - unallocatedAssets,
      unallocatedAssets,
      overAllocatedAssets,
      assetAnalysis,
    };

    await logger.info("Gap analysis calculated successfully", {
      totalAssets: summary.totalAssets,
      assetsWithGaps: summary.assetsWithGaps,
    });

    return { data: summary };
  },
);
