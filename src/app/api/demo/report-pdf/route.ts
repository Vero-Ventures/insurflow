import { NextResponse } from "next/server";
import { pdf } from "@react-pdf/renderer";

import {
  demoAssets,
  demoClient,
  demoDebts,
  demoInsuranceResult,
} from "@/lib/demo-data";
import { formatCurrency } from "@/lib/client-utils";
import { decimalToNumber } from "@/lib/financial/decimal-to-number";
import { createClientReportPdfDocument } from "@/server/pdf/client-report-pdf";

export const runtime = "nodejs";

function safeFilename(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function GET() {
  try {
    const client = demoClient;
    const clientName = `${client.firstName} ${client.lastName}`;

    const totals = {
      totalAssets: demoAssets.reduce(
        (sum, item) => sum + Number.parseFloat(item.currentValue),
        0,
      ),
      liquidAssets: demoAssets
        .filter((item) => item.isLiquid)
        .reduce((sum, item) => sum + Number.parseFloat(item.currentValue), 0),
      totalDebts: demoDebts.reduce(
        (sum, item) => sum + Number.parseFloat(item.currentBalance),
        0,
      ),
      insuranceNeed: demoInsuranceResult.totalInsuranceNeeds,
    };

    const doc = createClientReportPdfDocument({
      title: "InsurFlow Demo Financial Needs Report",
      generatedAt: new Date().toISOString(),
      clientName,
      profile: [
        {
          label: "Date of Birth",
          value: client.dateOfBirth,
        },
        {
          label: "State",
          value: client.state,
        },
        {
          label: "Smoker",
          value: client.smoker ? "Yes" : "No",
        },
        {
          label: "Health Rating",
          value: client.healthRating ?? "standard",
        },
      ],
      financialInputs: [
        {
          label: "Client Income",
          value: formatCurrency(decimalToNumber(client.clientIncome)),
        },
        {
          label: "Spouse Income",
          value: formatCurrency(decimalToNumber(client.spouseIncome)),
        },
        {
          label: "Income Replacement",
          value: `${client.incomeReplacementPercent}% for ${client.replacementDurationYears ?? 10} years`,
        },
        {
          label: "Existing Coverage",
          value: formatCurrency(
            decimalToNumber(client.existingLifeInsuranceCoverage),
          ),
        },
      ],
      summary: [
        {
          label: "Total Assets",
          value: formatCurrency(totals.totalAssets),
        },
        {
          label: "Liquid Assets",
          value: formatCurrency(totals.liquidAssets),
        },
        {
          label: "Total Debts",
          value: formatCurrency(totals.totalDebts),
        },
        {
          label: "Recommended Coverage",
          value: formatCurrency(totals.insuranceNeed),
        },
      ],
      recommendation: `Based on this demo profile, recommended life insurance coverage is ${formatCurrency(totals.insuranceNeed)}. This includes income replacement, debt payoff, and settling costs after accounting for liquid assets and existing coverage.`,
    });

    const buffer = await pdf(doc).toBuffer();
    const filename = `${safeFilename(clientName)}-insurflow-demo-report.pdf`;

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=\"${filename}\"`,
        "Cache-Control": "private, no-store",
        Pragma: "no-cache",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to generate demo PDF";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
