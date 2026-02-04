import { getDb } from "@/server/db";
import { asset, client, debt } from "@/server/db/schema";
import { and, eq, isNull, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api/route-helpers";
import {
  calculateInsuranceNeedsRounded,
  DEFAULT_ESTATE_BUFFER,
  type InsuranceNeedsInput,
} from "@/lib/financial/insurance-needs";
import {
  generateText,
  buildReasonsWhyPrompt,
  isGeminiConfigured,
  GeminiApiError,
  GEMINI_MODEL,
} from "@/server/ai";

/**
 * Helper to safely convert decimal string to number
 */
function decimalToNumber(value: string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const num = parseFloat(value);
  return isNaN(num) ? 0 : num;
}

/**
 * POST /api/clients/[id]/generate-letter - Generate a "Reasons Why" letter using AI
 *
 * This endpoint fetches client data and insurance needs calculation,
 * then uses Gemini AI to generate a professional compliance letter.
 *
 * Response:
 * - letter: string (the generated letter text)
 * - generatedAt: string (ISO timestamp)
 * - model: string (AI model used)
 *
 * Errors:
 * - 401: Unauthorized
 * - 404: Client not found
 * - 422: Insufficient data for generation (no financial inputs)
 * - 503: AI service unavailable (not configured or API error)
 */
export const POST = withApiHandler(
  {
    endpoint: "/api/clients/[id]/generate-letter",
    method: "POST",
    requireClient: true,
  },
  async (_request, { logger, clientId, session }) => {
    // Check if Gemini is configured
    if (!isGeminiConfigured()) {
      await logger.warn("Gemini API not configured", { statusCode: 503 });
      return NextResponse.json(
        {
          error: "AI service not configured",
          message:
            "The AI letter generation service is not available. Please contact support.",
        },
        { status: 503 },
      );
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
      await logger.info("Client not found for letter generation", {
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

    // Check if we have enough data to generate a meaningful letter
    const hasFinancialData =
      decimalToNumber(clientData.clientIncome) > 0 ||
      totalAssets > 0 ||
      totalDebts > 0;

    if (!hasFinancialData) {
      await logger.warn("Insufficient data for letter generation", {
        statusCode: 422,
      });
      return NextResponse.json(
        {
          error: "Insufficient data",
          message:
            "Please add income information, assets, or debts before generating a recommendation letter.",
        },
        { status: 422 },
      );
    }

    // Build calculation input
    const calculationInput: InsuranceNeedsInput = {
      clientIncome: decimalToNumber(clientData.clientIncome),
      spouseIncome: decimalToNumber(clientData.spouseIncome),
      includeSpouseIncome: clientData.hasSpouse ?? false,
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
      estateBuffer: DEFAULT_ESTATE_BUFFER,
    };

    // Run calculation
    const insuranceResult = calculateInsuranceNeedsRounded(calculationInput);

    // Build prompt
    const prompt = buildReasonsWhyPrompt(
      {
        firstName: clientData.firstName,
        lastName: clientData.lastName,
        state: clientData.state,
        hasSpouse: clientData.hasSpouse ?? false,
        spouseAge: clientData.spouseAge,
        clientIncome: decimalToNumber(clientData.clientIncome),
        spouseIncome: decimalToNumber(clientData.spouseIncome),
        additionalGoals: clientData.additionalGoals,
      },
      {
        totalAssets,
        liquidAssets,
        totalDebts,
        insuranceResult,
      },
    );

    try {
      // Generate letter using Gemini
      const letter = await generateText({
        prompt,
        temperature: 0.7,
        maxOutputTokens: 2048,
      });

      await logger.info("Letter generated successfully", {
        statusCode: 200,
        letterLength: letter.length,
      });

      return {
        data: {
          letter,
          generatedAt: new Date().toISOString(),
          model: GEMINI_MODEL,
          clientId,
          clientName: `${clientData.firstName} ${clientData.lastName}`,
        },
      };
    } catch (error) {
      if (error instanceof GeminiApiError) {
        await logger.error("Gemini API error", error, {
          statusCode: error.statusCode,
          details: error.details,
        });
        return NextResponse.json(
          {
            error: "AI service error",
            message: "Failed to generate letter. Please try again in a moment.",
          },
          { status: 503 },
        );
      }

      // Re-throw unexpected errors to be caught by withApiHandler
      throw error;
    }
  },
);
