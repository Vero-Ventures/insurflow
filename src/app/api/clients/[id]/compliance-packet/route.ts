import { getDb } from "@/server/db";
import { asset, client, debt, policy } from "@/server/db/schemas";
import { and, eq, isNull, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api/route-helpers";
import {
  calculateInsuranceNeedsRoundedWithTrace,
  DEFAULT_ESTATE_BUFFER,
  type InsuranceNeedsInput,
} from "@/lib/financial/insurance-needs";
import {
  computeEstimateConfidence,
  type EstimateCompleteness,
  type EstimateAssumptionsUsed,
} from "@/lib/financial/confidence-scoring";
import {
  calculateUSSettlingRequirementsRounded,
  isValidUSState,
  US_STATE_NAMES,
  type USState,
} from "@/lib/financial/settling-requirements-us";
import { resolveExistingCoverage } from "@/lib/policy-utils";
import {
  INSURANCE_NEEDS_METHODOLOGY,
  INCOME_REPLACEMENT_METHODOLOGY,
} from "@/lib/transparency/methodology-data";
import {
  buildCompliancePacket,
  type PacketBuilderInput,
} from "@/lib/compliance/packet-builder";
import { CompliancePacketDocument } from "@/components/compliance/compliance-packet-document";
import { pdf } from "@react-pdf/renderer";
import { createElement } from "react";
import { calculateAge } from "@/lib/client-utils";

/** Keep this route on Node runtime for PDF generation */
export const runtime = "nodejs";

/**
 * Safely convert decimal string to number
 */
function decimalToNumber(value: string | null | undefined): number {
  if (!value) return 0;
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Check if a client value was explicitly provided (non-null, non-zero)
 */
function hasClientValue(value: string | null | undefined): boolean {
  if (!value) return false;
  const num = parseFloat(value);
  return Number.isFinite(num) && num > 0;
}

/**
 * Create a safe filename from a name string
 */
function safeFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * GET /api/clients/[id]/compliance-packet
 *
 * Generates a compliance-ready PDF packet containing:
 * - Estimate summary + assumptions + methodology notes
 * - Consumer/application context + calculation metadata
 * - Calculation trace ("show your work")
 * - Source citations and disclaimers
 */
export const GET = withApiHandler(
  {
    endpoint: "/api/clients/[id]/compliance-packet",
    method: "GET",
    requireClient: true,
  },
  async (_request, { logger, clientId, session }) => {
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
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Fetch financial data in parallel
    const [assetsData, debtsData, policiesData] = await Promise.all([
      db
        .select({
          totalAssets:
            sql<string>`coalesce(sum(${asset.currentValue}), '0')`.as(
              "totalAssets",
            ),
          liquidAssets:
            sql<string>`coalesce(sum(case when ${asset.isLiquid} = true then ${asset.currentValue} else 0 end), '0')`.as(
              "liquidAssets",
            ),
        })
        .from(asset)
        .where(and(eq(asset.clientId, clientId!), isNull(asset.deletedAt))),
      db
        .select({
          totalDebts: sql<string>`coalesce(sum(${debt.amount}), '0')`.as(
            "totalDebts",
          ),
        })
        .from(debt)
        .where(and(eq(debt.clientId, clientId!), isNull(debt.deletedAt))),
      db
        .select({
          coverageAmount: policy.coverageAmount,
        })
        .from(policy)
        .where(
          and(
            eq(policy.clientId, clientId!),
            isNull(policy.deletedAt),
            eq(policy.status, "active"),
          ),
        ),
    ]);

    const totalAssets = decimalToNumber(assetsData[0]?.totalAssets);
    const liquidAssets = decimalToNumber(assetsData[0]?.liquidAssets);
    const totalDebts = decimalToNumber(debtsData[0]?.totalDebts);

    // Resolve existing coverage (policies first, then fallback to client field)
    const existingLifeInsuranceCoverage = resolveExistingCoverage(
      policiesData.map((p) => ({
        coverageAmount: p.coverageAmount,
      })),
      clientData.existingLifeInsuranceCoverage,
    );

    // Build insurance needs input
    const includeSpouseIncome = clientData.hasSpouse;
    const estateBuffer = DEFAULT_ESTATE_BUFFER;

    const calculationInput: InsuranceNeedsInput = {
      clientIncome: decimalToNumber(clientData.clientIncome),
      spouseIncome: includeSpouseIncome
        ? decimalToNumber(clientData.spouseIncome)
        : 0,
      includeSpouseIncome,
      incomeReplacementPercent: decimalToNumber(
        clientData.incomeReplacementPercent,
      ),
      replacementDurationYears: clientData.replacementDurationYears ?? 10,
      existingLifeInsuranceCoverage,
      totalDebts,
      liquidAssets,
      totalAssets,
      estateBuffer,
    };

    // Run insurance needs calculation with trace
    const { result: insuranceResult, trace } =
      calculateInsuranceNeedsRoundedWithTrace(calculationInput);

    // Compute confidence
    const completeness: EstimateCompleteness = {
      clientIncome: hasClientValue(clientData.clientIncome),
      spouseIncome: hasClientValue(clientData.spouseIncome),
      incomeReplacementPercent: hasClientValue(
        clientData.incomeReplacementPercent,
      ),
      replacementDurationYears: clientData.replacementDurationYears != null,
      existingCoverage:
        policiesData.length > 0 ||
        hasClientValue(clientData.existingLifeInsuranceCoverage),
      debtsData: totalDebts > 0,
      assetsData: totalAssets > 0,
      estateBuffer: true,
    };
    const assumptionsUsed: EstimateAssumptionsUsed = {
      replacementDurationYears: clientData.replacementDurationYears == null,
      estateBuffer: true,
      includeSpouseIncome:
        includeSpouseIncome && !hasClientValue(clientData.spouseIncome),
    };
    const confidence = computeEstimateConfidence({
      completeness,
      assumptionsUsed,
    });

    // Calculate settling requirements if state is valid
    let settlingResult = null;
    const stateCode = clientData.state;
    if (isValidUSState(stateCode)) {
      try {
        settlingResult = calculateUSSettlingRequirementsRounded({
          estateValue: totalAssets,
          state: stateCode as USState,
          annualIncome: decimalToNumber(clientData.clientIncome),
        });
      } catch {
        // Non-blocking — settling is supplementary
        await logger.warn("Settling requirements calculation failed", {
          clientId,
          state: stateCode,
        });
      }
    }

    // Build packet
    const clientAge = calculateAge(clientData.dateOfBirth);
    const stateName = isValidUSState(stateCode)
      ? US_STATE_NAMES[stateCode as USState]
      : stateCode;

    const packetInput: PacketBuilderInput = {
      client: {
        firstName: clientData.firstName,
        lastName: clientData.lastName,
        stateCode,
        stateName,
        dateOfBirth: clientData.dateOfBirth,
        age: clientAge,
        hasSpouse: clientData.hasSpouse,
        smoker: clientData.smoker,
        healthRating: clientData.healthRating,
      },
      insuranceNeeds: insuranceResult,
      settlingRequirements: settlingResult,
      confidence,
      trace,
      inputsUsed: {
        clientIncome: decimalToNumber(clientData.clientIncome),
        spouseIncome: decimalToNumber(clientData.spouseIncome),
        includeSpouseIncome,
        incomeReplacementPercent: decimalToNumber(
          clientData.incomeReplacementPercent,
        ),
        replacementDurationYears: clientData.replacementDurationYears ?? 10,
        existingCoverage: existingLifeInsuranceCoverage,
        totalDebts,
        liquidAssets,
        totalAssets,
        estateBufferType: estateBuffer.type,
        estateBufferValue:
          estateBuffer.type === "fixed"
            ? estateBuffer.amount
            : estateBuffer.percentage,
      },
      methodologies: [
        INSURANCE_NEEDS_METHODOLOGY,
        INCOME_REPLACEMENT_METHODOLOGY,
      ],
      applicationContext: "d2c-consumer",
    };

    const packet = buildCompliancePacket(packetInput);

    // Generate PDF
    const doc = createElement(CompliancePacketDocument, { packet });
    const buffer = await pdf(doc).toBuffer();

    const fullName = `${clientData.firstName} ${clientData.lastName}`;
    const filename = `${safeFilename(fullName)}-compliance-packet.pdf`;

    await logger.info("Compliance packet generated", {
      clientId,
      packetVersion: packet.metadata.packetVersion,
      confidenceScore: confidence.score,
    });

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
        Pragma: "no-cache",
      },
    });
  },
);
