import { NextResponse } from "next/server";
import { and, eq, isNull, sql } from "drizzle-orm";
import { pdf } from "@react-pdf/renderer";

import { getDb } from "@/server/db";
import { asset, client, debt } from "@/server/db/schemas";
import { withApiHandler } from "@/lib/api/route-helpers";
import {
  calculateInsuranceNeedsRounded,
  DEFAULT_ESTATE_BUFFER,
} from "@/lib/financial/insurance-needs";
import { decimalToNumber } from "@/lib/financial/decimal-to-number";
import { formatCurrency } from "@/lib/client-utils";
import { captureServerAnalyticsEvent } from "@/server/observability/posthog";
import { createClientReportPdfDocument } from "@/server/pdf/client-report-pdf";
import { safeFilename } from "@/server/pdf/utils";

export const runtime = "nodejs";

export const GET = withApiHandler(
  {
    endpoint: "/api/clients/[id]/report-pdf",
    method: "GET",
    requireClient: false,
  },
  async (_request, { clientId, session }) => {
    const db = getDb();

    const foundClient = await db.query.client.findFirst({
      where: and(
        eq(client.id, clientId!),
        eq(client.userId, session.user.id),
        isNull(client.deletedAt),
      ),
    });

    if (!foundClient) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const [assetTotals] = await db
      .select({
        totalAssets: sql<string>`COALESCE(SUM(${asset.currentValue}), 0)`,
        liquidAssets: sql<string>`COALESCE(SUM(CASE WHEN ${asset.isLiquid} THEN ${asset.currentValue} ELSE 0 END), 0)`,
      })
      .from(asset)
      .where(and(eq(asset.clientId, clientId!), isNull(asset.deletedAt)));

    const [debtTotals] = await db
      .select({
        totalDebts: sql<string>`COALESCE(SUM(${debt.currentBalance}), 0)`,
      })
      .from(debt)
      .where(and(eq(debt.clientId, clientId!), isNull(debt.deletedAt)));

    const totalAssets = decimalToNumber(assetTotals?.totalAssets);
    const liquidAssets = decimalToNumber(assetTotals?.liquidAssets);
    const totalDebts = decimalToNumber(debtTotals?.totalDebts);

    const insurance = calculateInsuranceNeedsRounded({
      clientIncome: decimalToNumber(foundClient.clientIncome),
      spouseIncome: decimalToNumber(foundClient.spouseIncome),
      includeSpouseIncome: foundClient.hasSpouse,
      incomeReplacementPercent: decimalToNumber(
        foundClient.incomeReplacementPercent,
      ),
      replacementDurationYears: foundClient.replacementDurationYears ?? 10,
      existingLifeInsuranceCoverage: decimalToNumber(
        foundClient.existingLifeInsuranceCoverage,
      ),
      totalDebts,
      liquidAssets,
      totalAssets,
      estateBuffer: DEFAULT_ESTATE_BUFFER,
    });

    const fullName = `${foundClient.firstName} ${foundClient.lastName}`;

    const doc = createClientReportPdfDocument({
      title: "InsurFlow Financial Needs Report",
      generatedAt: new Date().toISOString(),
      clientName: fullName,
      profile: [
        {
          label: "Date of Birth",
          value: foundClient.dateOfBirth,
        },
        { label: "State", value: foundClient.state },
        { label: "Smoker", value: foundClient.smoker ? "Yes" : "No" },
        {
          label: "Health Rating",
          value: foundClient.healthRating ?? "standard",
        },
      ],
      financialInputs: [
        {
          label: "Client Income",
          value: formatCurrency(decimalToNumber(foundClient.clientIncome)),
        },
        {
          label: "Spouse Income",
          value: formatCurrency(decimalToNumber(foundClient.spouseIncome)),
        },
        {
          label: "Income Replacement",
          value: `${decimalToNumber(foundClient.incomeReplacementPercent)}% for ${foundClient.replacementDurationYears ?? 10} years`,
        },
        {
          label: "Existing Coverage",
          value: formatCurrency(
            decimalToNumber(foundClient.existingLifeInsuranceCoverage),
          ),
        },
      ],
      summary: [
        {
          label: "Total Assets",
          value: formatCurrency(totalAssets),
        },
        {
          label: "Liquid Assets",
          value: formatCurrency(liquidAssets),
        },
        {
          label: "Total Debts",
          value: formatCurrency(totalDebts),
        },
        {
          label: "Recommended Coverage",
          value: formatCurrency(insurance.totalInsuranceNeeds),
        },
      ],
      recommendation: `Based on current inputs, recommended life insurance coverage is ${formatCurrency(insurance.totalInsuranceNeeds)}. This includes income replacement, debt payoff, and settling costs, offset by existing coverage and liquid assets.`,
    });

    const buffer = await pdf(doc).toBuffer();
    const filename = `${safeFilename(fullName)}-insurflow-report.pdf`;

    captureServerAnalyticsEvent({
      distinctId: session.user.id,
      event: "report_pdf_generated",
      properties: {
        feature: "client-report-pdf",
        outcome: "completed",
        route: "/api/clients/[id]/report-pdf",
        source: "api",
      },
    });

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=\"${filename}\"`,
        "Cache-Control": "private, no-store",
      },
    });
  },
);
