import { getDb } from "@/server/db";
import { asset, client } from "@/server/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  withApiHandler,
  parseJsonBody,
  handleValidationError,
} from "@/lib/api/route-helpers";
import {
  calculateUSSettlingRequirementsRounded,
  US_DEFAULT_PROFESSIONAL_FEES,
  US_DEFAULT_FUNERAL_EXPENSES,
  isValidUSState,
  US_STATE_NAMES,
  type USSettlingRequirementsInput,
  type USAssetForSettling,
  type USProfessionalFeesConfig,
  type USState,
} from "@/lib/financial/settling-requirements-us";

/**
 * Zod schema for professional fees configuration
 */
const professionalFeesSchema = z
  .object({
    legal: z
      .discriminatedUnion("type", [
        z.object({
          type: z.literal("fixed"),
          amount: z.number().min(0).max(1000000),
        }),
        z.object({
          type: z.literal("percentage"),
          rate: z.number().min(0).max(100),
        }),
      ])
      .optional(),
    accounting: z
      .discriminatedUnion("type", [
        z.object({
          type: z.literal("fixed"),
          amount: z.number().min(0).max(1000000),
        }),
        z.object({
          type: z.literal("percentage"),
          rate: z.number().min(0).max(100),
        }),
      ])
      .optional(),
    executor: z
      .discriminatedUnion("type", [
        z.object({
          type: z.literal("percentage"),
          rate: z.number().min(0).max(100),
        }),
        z.object({
          type: z.literal("waived"),
        }),
      ])
      .optional(),
  })
  .optional();

/**
 * Zod schema for asset
 */
const assetForSettlingSchema = z.object({
  currentValue: z.number().min(0),
  costBasis: z.number().min(0),
  type: z.string().optional(),
  name: z.string().optional(),
});

/**
 * Zod schema for calculation request body
 * All fields are optional - defaults will be used from client record
 */
const calculateSettlingRequestSchema = z
  .object({
    /** Override state (defaults to client.state) */
    state: z
      .string()
      .refine((val) => isValidUSState(val), {
        message: "Invalid US state code",
      })
      .optional(),
    /** Override estate value (defaults to total assets) */
    estateValue: z.number().min(0).optional(),
    /** Override final year income (defaults to client income) */
    finalYearIncome: z.number().min(0).optional(),
    /** Override assets */
    assets: z.array(assetForSettlingSchema).optional(),
    /** Override professional fees configuration */
    professionalFees: professionalFeesSchema,
    /** Override funeral expenses */
    funeralExpenses: z.number().min(0).max(100000).optional(),
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
 * POST /api/clients/[id]/calculate-settling - Calculate settling requirements for a client
 *
 * This endpoint fetches client financial data and runs the settling requirements
 * calculation engine to determine probate fees, taxes, and professional fees.
 *
 * Request body (all optional):
 * - state: string (US state code, defaults to client.state)
 * - estateValue: number (defaults to total assets)
 * - finalYearIncome: number (defaults to client income)
 * - assets: Array of { currentValue, costBasis } for the estate
 * - professionalFees: Configuration for legal/accounting/executor fees
 * - funeralExpenses: number (defaults to $12,000)
 *
 * Response:
 * - probateFees: number
 * - federalEstateTax: number
 * - stateEstateTax: number
 * - finalIncomeTax: number
 * - professionalFees: { legalFees, accountingFees, executorFees, total }
 * - funeralExpenses: number
 * - totalSettlingRequirements: number (the final total)
 * - notes: string[] (explanatory notes about the calculation)
 * - inputsUsed: object (parameters used for calculation, for transparency)
 */
export const POST = withApiHandler(
  {
    endpoint: "/api/clients/[id]/calculate-settling",
    method: "POST",
    requireClient: true,
  },
  async (request, { logger, clientId, session }) => {
    // Parse optional request body
    const contentType = request.headers.get("content-type");
    let overrides: z.infer<typeof calculateSettlingRequestSchema> = {};

    // Only parse body if content-type indicates JSON and there's a body
    if (contentType?.includes("application/json")) {
      const bodyResult = await parseJsonBody(request, logger);
      if ("error" in bodyResult) return bodyResult.error;

      // Validate request body
      const validationResult = calculateSettlingRequestSchema.safeParse(
        bodyResult.body,
      );
      if (!validationResult.success) {
        return handleValidationError(
          logger,
          validationResult.error,
          "Invalid settling calculation parameters",
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
      await logger.info("Client not found for settling calculation", {
        statusCode: 404,
      });
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Validate state - must be a valid US state
    const state = (overrides?.state ?? clientData.state) as USState;
    if (!isValidUSState(state)) {
      await logger.info("Invalid state for settling calculation", {
        statusCode: 400,
        state,
      });
      return NextResponse.json(
        {
          error: `Invalid state: ${state}. Must be a valid US state code (e.g., CA, NY, TX).`,
        },
        { status: 400 },
      );
    }

    // Fetch assets for estate value calculation
    const clientAssets = await db
      .select({
        id: asset.id,
        name: asset.name,
        type: asset.type,
        currentValue: asset.currentValue,
        isLiquid: asset.isLiquid,
      })
      .from(asset)
      .where(and(eq(asset.clientId, clientId!), isNull(asset.deletedAt)));

    // Calculate total estate value from assets
    const totalAssetsValue = clientAssets.reduce(
      (sum, a) => sum + decimalToNumber(a.currentValue),
      0,
    );

    // Determine estate value
    const estateValue = overrides?.estateValue ?? totalAssetsValue;

    // Determine final year income
    const finalYearIncome =
      overrides?.finalYearIncome ?? decimalToNumber(clientData.clientIncome);

    // Build assets for calculation
    let assetsForCalculation: USAssetForSettling[];

    if (overrides?.assets && overrides.assets.length > 0) {
      assetsForCalculation = overrides.assets;
    } else {
      // Use client assets with 0 cost basis
      // In the US, step-up in basis typically eliminates capital gains anyway
      assetsForCalculation = clientAssets.map((a) => ({
        currentValue: decimalToNumber(a.currentValue),
        costBasis: 0,
        type: a.type ?? undefined,
        name: a.name,
      }));
    }

    // Build professional fees config
    const professionalFeesConfig: Partial<USProfessionalFeesConfig> = {};
    if (overrides?.professionalFees?.legal) {
      professionalFeesConfig.legal = overrides.professionalFees.legal;
    }
    if (overrides?.professionalFees?.accounting) {
      professionalFeesConfig.accounting = overrides.professionalFees.accounting;
    }
    if (overrides?.professionalFees?.executor) {
      professionalFeesConfig.executor = overrides.professionalFees.executor;
    }

    // Build calculation input
    const calculationInput: USSettlingRequirementsInput = {
      state,
      estateValue,
      finalYearIncome,
      assets: assetsForCalculation,
      professionalFees:
        Object.keys(professionalFeesConfig).length > 0
          ? professionalFeesConfig
          : undefined,
      funeralExpenses: overrides?.funeralExpenses,
    };

    // Run calculation
    const result = calculateUSSettlingRequirementsRounded(calculationInput);

    await logger.info("Settling requirements calculated successfully", {
      statusCode: 200,
      totalSettlingRequirements: result.totalSettlingRequirements,
      state,
    });

    return {
      data: {
        ...result,
        clientId,
        clientName: `${clientData.firstName} ${clientData.lastName}`,
        calculatedAt: new Date().toISOString(),
        // Include defaults used for transparency
        defaultsUsed: {
          professionalFees:
            Object.keys(professionalFeesConfig).length === 0
              ? US_DEFAULT_PROFESSIONAL_FEES
              : undefined,
          funeralExpenses:
            overrides?.funeralExpenses === undefined
              ? US_DEFAULT_FUNERAL_EXPENSES
              : undefined,
        },
      },
    };
  },
);

/**
 * GET /api/clients/[id]/calculate-settling - Get settling requirements info
 *
 * Returns information about the settling requirements calculation
 * including supported states and default values.
 */
export const GET = withApiHandler(
  {
    endpoint: "/api/clients/[id]/calculate-settling",
    method: "GET",
    requireClient: true,
  },
  async (_request, { logger, clientId }) => {
    await logger.info("Settling requirements info requested", {
      statusCode: 200,
      clientId,
    });

    // Build state list
    const states = Object.entries(US_STATE_NAMES).map(([code, name]) => ({
      code,
      name,
    }));

    return {
      data: {
        description:
          "Settling Requirements Calculator - Calculates costs associated with settling an estate in the United States",
        supportedStates: states,
        defaults: {
          professionalFees: US_DEFAULT_PROFESSIONAL_FEES,
          funeralExpenses: US_DEFAULT_FUNERAL_EXPENSES,
        },
        components: [
          "State-specific probate fees",
          "Federal estate tax (estates over $13.61M)",
          "State estate/inheritance tax (applicable states)",
          "Final income tax",
          "Professional fees (legal, accounting, executor)",
          "Funeral expenses",
        ],
        notes: [
          "Federal estate tax only applies to estates exceeding $13.61M (2024)",
          "12 states + DC have estate taxes with lower exemptions",
          "6 states have inheritance taxes (paid by beneficiaries)",
          "Assets receive step-up in basis at death, typically eliminating capital gains",
        ],
        usage: {
          method: "POST",
          body: {
            state: "Optional - US state code (defaults to client.state)",
            estateValue:
              "Optional - Total estate value (defaults to sum of assets)",
            finalYearIncome:
              "Optional - Final year income (defaults to client income)",
            assets: "Optional - Array of assets for the estate",
            professionalFees: "Optional - Override fee configuration",
            funeralExpenses:
              "Optional - Funeral expenses (defaults to $12,000)",
          },
        },
      },
    };
  },
);
