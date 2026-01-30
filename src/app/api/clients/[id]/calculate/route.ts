import { getDb } from "@/server/db";
import { asset, client, debt } from "@/server/db/schema";
import { and, eq, isNull, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  withApiHandler,
  parseJsonBody,
  handleValidationError,
} from "@/lib/api/route-helpers";
import {
  calculateInsuranceNeedsRounded,
  DEFAULT_ESTATE_BUFFER,
  type InsuranceNeedsInput,
  type EstateBufferConfig,
} from "@/lib/financial/insurance-needs";

/**
 * Zod schema for estate buffer configuration
 */
const estateBufferConfigSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("fixed"),
    amount: z.number().min(0).max(10000000),
  }),
  z.object({
    type: z.literal("percentage"),
    percentage: z.number().min(0).max(100),
  }),
]);

/**
 * Zod schema for calculation request body
 * All fields are optional - defaults will be used from client record
 */
const calculateRequestSchema = z
  .object({
    /** Override whether to include spouse income (defaults to client.hasSpouse) */
    includeSpouseIncome: z.boolean().optional(),
    /** Override estate buffer config (defaults to fixed $15,000) */
    estateBuffer: estateBufferConfigSchema.optional(),
  })
  .strict()
  .optional();

/**
 * Helper to safely convert decimal string to number
 */
function decimalToNumber(value: string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const num = parseFloat(value);
  return isNaN(num) ? 0 : num;
}

/**
 * POST /api/clients/[id]/calculate - Calculate insurance needs for a client
 *
 * This endpoint fetches all client financial data (income, assets, debts, coverage)
 * and runs the insurance needs calculation engine.
 *
 * Request body (all optional):
 * - includeSpouseIncome: boolean (default: client.hasSpouse)
 * - estateBuffer: { type: "fixed", amount: number } | { type: "percentage", percentage: number }
 *                 (default: { type: "fixed", amount: 15000 })
 *
 * Response:
 * - incomeReplacementNeeds: number
 * - debtPayoffNeeds: number
 * - estateBufferNeeds: number
 * - grossNeeds: number
 * - existingCoverage: number
 * - liquidAssets: number
 * - totalInsuranceNeeds: number (the final recommendation)
 * - inputsUsed: object (parameters used for calculation, for transparency)
 */
export const POST = withApiHandler(
  {
    endpoint: "/api/clients/[id]/calculate",
    method: "POST",
    requireClient: true,
  },
  async (request, { logger, clientId, session }) => {
    // Parse optional request body
    const contentType = request.headers.get("content-type");
    let overrides: z.infer<typeof calculateRequestSchema> = {};

    // Only parse body if content-type indicates JSON and there's a body
    if (contentType?.includes("application/json")) {
      const bodyResult = await parseJsonBody(request, logger);
      if ("error" in bodyResult) return bodyResult.error;

      // Validate request body
      const validationResult = calculateRequestSchema.safeParse(
        bodyResult.body,
      );
      if (!validationResult.success) {
        return handleValidationError(
          logger,
          validationResult.error,
          "Invalid calculation parameters",
        );
      }
      overrides = validationResult.data ?? {};
    }

    const db = getDb();

    // Fetch client data
    const clientData = await db.query.client.findFirst({
      where: and(
        eq(client.id, clientId!),
        eq(client.userId, session.user.id),
        isNull(client.deletedAt),
      ),
    });

    if (!clientData) {
      await logger.info("Client not found for calculation", {
        statusCode: 404,
      });
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Fetch aggregated asset totals (total and liquid)
    const assetTotals = await db
      .select({
        totalAssets: sql<string>`COALESCE(SUM(${asset.currentValue}), 0)`,
        liquidAssets: sql<string>`COALESCE(SUM(CASE WHEN ${asset.isLiquid} THEN ${asset.currentValue} ELSE 0 END), 0)`,
      })
      .from(asset)
      .where(and(eq(asset.clientId, clientId!), isNull(asset.deletedAt)));

    // Fetch aggregated debt total
    const debtTotals = await db
      .select({
        totalDebts: sql<string>`COALESCE(SUM(${debt.currentBalance}), 0)`,
      })
      .from(debt)
      .where(and(eq(debt.clientId, clientId!), isNull(debt.deletedAt)));

    // Extract values
    const totalAssets = decimalToNumber(assetTotals[0]?.totalAssets);
    const liquidAssets = decimalToNumber(assetTotals[0]?.liquidAssets);
    const totalDebts = decimalToNumber(debtTotals[0]?.totalDebts);

    // Determine estate buffer config
    const estateBuffer: EstateBufferConfig =
      overrides?.estateBuffer ?? DEFAULT_ESTATE_BUFFER;

    // Determine whether to include spouse income
    // Default: include if client has spouse
    const includeSpouseIncome =
      overrides?.includeSpouseIncome ?? clientData.hasSpouse ?? false;

    // Build calculation input
    const calculationInput: InsuranceNeedsInput = {
      clientIncome: decimalToNumber(clientData.clientIncome),
      spouseIncome: decimalToNumber(clientData.spouseIncome),
      includeSpouseIncome,
      incomeReplacementPercent: decimalToNumber(
        clientData.incomeReplacementPercent,
      ),
      replacementDurationYears: clientData.replacementDurationYears ?? 10,
      existingLifeInsuranceCoverage: decimalToNumber(
        clientData.existingLifeInsuranceCoverage,
      ),
      totalDebts,
      liquidAssets,
      totalAssets,
      estateBuffer,
    };

    // Run calculation
    const result = calculateInsuranceNeedsRounded(calculationInput);

    await logger.info("Insurance needs calculated successfully", {
      statusCode: 200,
      totalInsuranceNeeds: result.totalInsuranceNeeds,
      grossNeeds: result.grossNeeds,
    });

    return {
      data: {
        ...result,
        clientId,
        clientName: `${clientData.firstName} ${clientData.lastName}`,
        calculatedAt: new Date().toISOString(),
      },
    };
  },
);
