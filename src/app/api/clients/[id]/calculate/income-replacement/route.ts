import { getDb } from "@/server/db";
import { asset, client } from "@/server/db/schema";
import { and, eq, isNull, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  withApiHandler,
  parseJsonBody,
  handleValidationError,
} from "@/lib/api/route-helpers";
import { calculateAge } from "@/lib/client-utils";
import {
  calculateAdvancedIncomeReplacement,
  type IncomeReplacementInput,
  type SurvivorResources,
} from "@/lib/financial/income-replacement";
import {
  decimalToNumber,
  buildDurationScenario,
} from "@/lib/financial/income-replacement-helpers";

// ============================================================================
// Validation
// ============================================================================

/**
 * Zod schema for advanced income replacement calculation request body.
 * All fields optional — defaults sourced from client DB record or constants.
 */
const advancedIncomeReplacementSchema = z
  .object({
    /** Duration scenario type (defaults to "custom") */
    durationScenario: z
      .enum(["childTurns18", "retirement", "lifetime", "custom"])
      .optional(),

    /** Explicit number of years (used when durationScenario = "custom") */
    customDurationYears: z.number().int().min(0).max(80).optional(),

    /** Override: whether to include spouse income in the base income */
    includeSpouseIncome: z.boolean().optional(),

    /** Override: replacement ratio 0–1 (e.g. 0.70 for 70%) */
    replacementRatio: z.number().min(0).max(1).optional(),

    /** Override: annual inflation rate */
    inflationRate: z.number().min(0).max(0.5).optional(),

    /** Override: annual discount rate */
    discountRate: z.number().min(0).max(0.5).optional(),

    /** Override: annual government survivor benefit */
    govSurvivorBenefit: z.number().min(0).optional(),

    /** Override: annual investment income */
    investmentIncome: z.number().min(0).optional(),

    /** Override: annual other income (rental, pension, etc.) */
    otherIncome: z.number().min(0).optional(),
  })
  .strict()
  .optional();

// ============================================================================
// Route handler
// ============================================================================

/**
 * POST /api/clients/[id]/calculate/income-replacement
 *
 * Runs the advanced (PV-based, inflation-adjusted) income replacement
 * calculation for a client. Reads stored financial data from the DB,
 * allows optional request-body overrides, and returns the full
 * year-by-year schedule plus PV totals.
 *
 * Request body (all optional):
 *   durationScenario    – "childTurns18" | "retirement" | "lifetime" | "custom"
 *   customDurationYears – explicit years when scenario = "custom"
 *   includeSpouseIncome – merge spouse income into base (default: client.hasSpouse)
 *   replacementRatio    – 0–1 (default: client.incomeReplacementPercent / 100)
 *   inflationRate       – 0–0.5 (default from constants)
 *   discountRate        – 0–0.5 (default from constants)
 *   govSurvivorBenefit  – override stored value
 *   investmentIncome    – override stored value
 *   otherIncome         – override stored value
 *
 * Response: IncomeReplacementResult (see income-replacement.ts)
 */
export const POST = withApiHandler(
  {
    endpoint: "/api/clients/[id]/calculate/income-replacement",
    method: "POST",
    requireClient: true,
  },
  async (request, { logger, clientId, session }) => {
    // --- Parse optional request body ----------------------------------------
    const contentType = request.headers.get("content-type");
    let overrides: z.infer<typeof advancedIncomeReplacementSchema> = {};

    if (contentType?.includes("application/json")) {
      const bodyResult = await parseJsonBody(request, logger);
      if ("error" in bodyResult) return bodyResult.error;

      const validationResult = advancedIncomeReplacementSchema.safeParse(
        bodyResult.body,
      );
      if (!validationResult.success) {
        return handleValidationError(
          logger,
          validationResult.error,
          "Invalid income replacement calculation parameters",
        );
      }
      overrides = validationResult.data ?? {};
    }

    const db = getDb();

    // --- Fetch client data --------------------------------------------------
    const clientData = await db.query.client.findFirst({
      where: and(
        eq(client.id, clientId!),
        eq(client.userId, session.user.id),
        isNull(client.deletedAt),
      ),
    });

    if (!clientData) {
      await logger.info("Client not found for income replacement calculation", {
        statusCode: 404,
      });
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // --- Fetch liquid assets (for survivor resources context) ----------------
    const assetTotals = await db
      .select({
        liquidAssets: sql<string>`COALESCE(SUM(CASE WHEN ${asset.isLiquid} THEN ${asset.currentValue} ELSE 0 END), 0)`,
      })
      .from(asset)
      .where(and(eq(asset.clientId, clientId!), isNull(asset.deletedAt)));

    const liquidAssets = decimalToNumber(assetTotals[0]?.liquidAssets);

    // --- Derive values from client record -----------------------------------
    const clientIncome = decimalToNumber(clientData.clientIncome);
    const spouseIncome = decimalToNumber(clientData.spouseIncome);
    const includeSpouseIncome =
      overrides?.includeSpouseIncome ?? clientData.hasSpouse ?? false;
    const baseAnnualIncome =
      clientIncome + (includeSpouseIncome ? spouseIncome : 0);

    const replacementRatio =
      overrides?.replacementRatio ??
      decimalToNumber(clientData.incomeReplacementPercent) / 100;

    const currentAge = calculateAge(clientData.dateOfBirth);

    const duration = buildDurationScenario(
      overrides?.durationScenario,
      overrides?.customDurationYears,
      currentAge,
      clientData.retirementAge,
      clientData.youngestChildAge,
      clientData.replacementDurationYears ?? 10,
    );

    // --- Build survivor resources -------------------------------------------
    const survivorResources: SurvivorResources = {
      govSurvivorBenefit:
        overrides?.govSurvivorBenefit ??
        decimalToNumber(clientData.govSurvivorBenefit),
      existingInsurance: decimalToNumber(
        clientData.existingLifeInsuranceCoverage,
      ),
      investmentIncome:
        overrides?.investmentIncome ??
        decimalToNumber(clientData.investmentIncome),
      otherIncome:
        overrides?.otherIncome ?? decimalToNumber(clientData.otherIncome),
    };

    // --- Build engine input & calculate -------------------------------------
    const input: IncomeReplacementInput = {
      baseAnnualIncome,
      replacementRatio,
      inflationRate: overrides?.inflationRate,
      discountRate: overrides?.discountRate,
      duration,
      survivorResources,
    };

    const result = calculateAdvancedIncomeReplacement(input);

    await logger.info("Advanced income replacement calculated successfully", {
      statusCode: 200,
      durationYears: result.durationYears,
      netCoverageNeededPV: result.netCoverageNeededPV,
      presentValueTotal: result.presentValueTotal,
    });

    return {
      data: {
        ...result,
        clientId,
        clientName: `${clientData.firstName} ${clientData.lastName}`,
        currentAge,
        liquidAssets,
        calculatedAt: new Date().toISOString(),
      },
    };
  },
);
