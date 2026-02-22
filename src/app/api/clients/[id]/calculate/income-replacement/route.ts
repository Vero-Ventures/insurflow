import { getDb } from "@/server/db";
import { asset, client } from "@/server/db/schemas";
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
  calculateIncomeReplacementV2,
  type IncomeReplacementInput,
  type IncomeReplacementInputV2,
  type SurvivorResources,
  type ModeConfig,
} from "@/lib/financial/income-replacement";
import {
  decimalToNumber,
  buildDurationScenario,
} from "@/lib/financial/income-replacement-helpers";

// ============================================================================
// Validation
// ============================================================================

/**
 * Zod schema for income-multiplier mode configuration.
 */
const incomeMultiplierConfigSchema = z.object({
  mode: z.literal("income-multiplier"),
  baseAnnualIncome: z.number().min(0).optional(),
  replacementRatio: z.number().min(0).max(1).optional(),
});

/**
 * Zod schema for expense-based mode configuration.
 */
const expenseBasedConfigSchema = z.object({
  mode: z.literal("expense-based"),
  annualExpenses: z.number().min(0),
  expenseReductionPercent: z.number().min(0).max(1).optional(),
});

/**
 * Union schema for mode configuration.
 */
const modeConfigSchema = z.discriminatedUnion("mode", [
  incomeMultiplierConfigSchema,
  expenseBasedConfigSchema,
]);

/**
 * Zod schema for advanced income replacement calculation request body.
 * All fields optional — defaults sourced from client DB record or constants.
 *
 * Supports two calculation modes:
 * - income-multiplier (default): Uses percentage of gross income
 * - expense-based: Uses actual household expenses with post-death reduction
 */
const advancedIncomeReplacementSchema = z
  .object({
    /**
     * Calculation mode configuration. If omitted, uses income-multiplier mode
     * with values derived from the client record.
     */
    modeConfig: modeConfigSchema.optional(),

    /** Duration scenario type (defaults to "custom") */
    durationScenario: z
      .enum(["childTurns18", "retirement", "lifetime", "custom"])
      .optional(),

    /** Explicit number of years (used when durationScenario = "custom") */
    customDurationYears: z.number().int().min(0).max(80).optional(),

    /** Override: whether to include spouse income in the base income */
    includeSpouseIncome: z.boolean().optional(),

    /** Override: replacement ratio 0–1 (e.g. 0.70 for 70%). Used when modeConfig is not provided. */
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
 * Supports two calculation modes:
 * - income-multiplier (default): Traditional approach using percentage of income
 * - expense-based: Uses actual household expenses, adjusted for post-death reduction
 *
 * Request body (all optional):
 *   modeConfig          – { mode: "income-multiplier" | "expense-based", ... }
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
 * Response: IncomeReplacementResult with calculationMetadata showing mode used
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

    // --- Determine calculation mode and build input -------------------------
    const usesV2Mode = !!overrides?.modeConfig;

    if (usesV2Mode) {
      // V2 mode: explicit mode configuration provided
      let modeConfig: ModeConfig;

      if (overrides!.modeConfig!.mode === "expense-based") {
        modeConfig = {
          mode: "expense-based",
          annualExpenses: overrides!.modeConfig!.annualExpenses,
          expenseReductionPercent:
            overrides!.modeConfig!.expenseReductionPercent,
        };
      } else {
        // income-multiplier mode
        modeConfig = {
          mode: "income-multiplier",
          baseAnnualIncome:
            overrides!.modeConfig!.baseAnnualIncome ?? baseAnnualIncome,
          replacementRatio:
            overrides!.modeConfig!.replacementRatio ?? replacementRatio,
        };
      }

      const inputV2: IncomeReplacementInputV2 = {
        modeConfig,
        inflationRate: overrides?.inflationRate,
        discountRate: overrides?.discountRate,
        duration,
        survivorResources,
      };

      const result = calculateIncomeReplacementV2(inputV2);

      await logger.info(
        "Advanced income replacement calculated successfully (V2)",
        {
          statusCode: 200,
          mode: result.calculationMetadata.mode,
          durationYears: result.durationYears,
          netCoverageNeededPV: result.netCoverageNeededPV,
          presentValueTotal: result.presentValueTotal,
        },
      );

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
    }

    // --- Legacy mode: use original income-multiplier calculation ------------
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
      mode: result.calculationMetadata.mode,
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
