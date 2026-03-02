/**
 * React-PDF document component for compliance packet PDF generation.
 *
 * Renders a CompliancePacket into a structured PDF document suitable
 * for review, support, and retention workflows.
 */

import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { CompliancePacket } from "@/lib/compliance/packet-types";

// =============================================================================
// Styles
// =============================================================================

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#1a1a1a",
  },
  header: {
    marginBottom: 24,
    borderBottom: "2px solid #10b981",
    paddingBottom: 16,
  },
  title: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    color: "#064e3b",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: "#6b7280",
  },
  metadataRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    fontSize: 8,
    color: "#9ca3af",
  },
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: "#064e3b",
    marginBottom: 8,
    borderBottom: "1px solid #d1d5db",
    paddingBottom: 4,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
    borderBottom: "0.5px solid #f3f4f6",
  },
  rowLabel: {
    fontSize: 9,
    color: "#4b5563",
    flex: 1,
  },
  rowValue: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    textAlign: "right",
  },
  highlightRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: "#ecfdf5",
    borderRadius: 4,
    marginTop: 4,
  },
  highlightLabel: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#064e3b",
  },
  highlightValue: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#064e3b",
  },
  badge: {
    fontSize: 7,
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    color: "#6b7280",
  },
  assumptionItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 3,
    borderBottom: "0.5px solid #f3f4f6",
  },
  assumptionLeft: {
    flex: 1,
  },
  assumptionCategory: {
    fontSize: 7,
    color: "#9ca3af",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  assumptionDesc: {
    fontSize: 9,
    color: "#4b5563",
  },
  assumptionValue: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    textAlign: "right",
    marginLeft: 12,
  },
  methodologyBlock: {
    marginBottom: 12,
    padding: 8,
    backgroundColor: "#f9fafb",
    borderRadius: 4,
  },
  methodologyTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
  },
  methodologySummary: {
    fontSize: 9,
    color: "#6b7280",
    marginBottom: 6,
  },
  stepItem: {
    marginBottom: 4,
  },
  stepTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#374151",
  },
  stepDesc: {
    fontSize: 8,
    color: "#6b7280",
    marginLeft: 12,
  },
  formula: {
    fontSize: 8,
    fontFamily: "Courier",
    color: "#4b5563",
    marginLeft: 12,
    marginTop: 2,
    backgroundColor: "#f3f4f6",
    padding: 4,
    borderRadius: 2,
  },
  sourceItem: {
    fontSize: 8,
    color: "#6b7280",
    marginBottom: 2,
  },
  confidenceSection: {
    padding: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  confidenceLabel: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
  },
  confidenceReason: {
    fontSize: 8,
    color: "#6b7280",
    marginLeft: 8,
    marginTop: 2,
  },
  traceSection: {
    marginBottom: 8,
    padding: 6,
    backgroundColor: "#f9fafb",
    borderRadius: 4,
  },
  traceSectionLabel: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
  },
  traceItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 1,
  },
  traceItemLabel: {
    fontSize: 8,
    color: "#6b7280",
  },
  traceItemValue: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
  },
  disclaimer: {
    marginTop: 24,
    padding: 12,
    backgroundColor: "#fffbeb",
    borderRadius: 4,
    borderLeft: "3px solid #f59e0b",
  },
  disclaimerTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#92400e",
    marginBottom: 4,
  },
  disclaimerText: {
    fontSize: 8,
    color: "#78716c",
    lineHeight: 1.4,
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: "#d1d5db",
    borderTop: "0.5px solid #e5e7eb",
    paddingTop: 8,
  },
});

// =============================================================================
// Helper
// =============================================================================

function fmtCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function confidenceBgColor(label: string): string {
  switch (label) {
    case "High":
      return "#ecfdf5";
    case "Medium":
      return "#fffbeb";
    case "Low":
      return "#fef2f2";
    default:
      return "#f9fafb";
  }
}

function confidenceTextColor(label: string): string {
  switch (label) {
    case "High":
      return "#065f46";
    case "Medium":
      return "#92400e";
    case "Low":
      return "#991b1b";
    default:
      return "#374151";
  }
}

// =============================================================================
// Document component
// =============================================================================

interface CompliancePacketDocumentProps {
  packet: CompliancePacket;
}

export function CompliancePacketDocument({
  packet,
}: CompliancePacketDocumentProps) {
  const {
    metadata,
    consumerContext,
    estimateSummary,
    trace,
    assumptions,
    methodologyNotes,
  } = packet;
  const { insuranceNeeds, settlingRequirements, confidence } = estimateSummary;

  return (
    <Document>
      {/* Page 1: Summary + Estimate */}
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Compliance Estimate Packet</Text>
          <Text style={styles.subtitle}>
            Prepared for {consumerContext.clientName} —{" "}
            {consumerContext.stateName}
          </Text>
          <View style={styles.metadataRow}>
            <Text>
              Generated:{" "}
              {new Date(metadata.generatedAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
            <Text>Packet v{metadata.packetVersion}</Text>
            <Text>
              Context:{" "}
              {metadata.applicationContext === "d2c-consumer"
                ? "Consumer Review"
                : "Advisor Review"}
            </Text>
          </View>
        </View>

        {/* Consumer Context */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Consumer Profile</Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Name</Text>
            <Text style={styles.rowValue}>{consumerContext.clientName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>State</Text>
            <Text style={styles.rowValue}>
              {consumerContext.stateName} ({consumerContext.stateCode})
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Age</Text>
            <Text style={styles.rowValue}>{consumerContext.age}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Spouse</Text>
            <Text style={styles.rowValue}>
              {consumerContext.hasSpouse ? "Yes" : "No"}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Smoker</Text>
            <Text style={styles.rowValue}>
              {consumerContext.smoker ? "Yes" : "No"}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Health Rating</Text>
            <Text style={styles.rowValue}>{consumerContext.healthRating}</Text>
          </View>
        </View>

        {/* Insurance Needs Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Insurance Needs Estimate</Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Income Replacement Needs</Text>
            <Text style={styles.rowValue}>
              {fmtCurrency(insuranceNeeds.incomeReplacementNeeds)}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Debt Payoff Needs</Text>
            <Text style={styles.rowValue}>
              {fmtCurrency(insuranceNeeds.debtPayoffNeeds)}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Estate Buffer</Text>
            <Text style={styles.rowValue}>
              {fmtCurrency(insuranceNeeds.estateBufferNeeds)}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Gross Needs</Text>
            <Text style={styles.rowValue}>
              {fmtCurrency(insuranceNeeds.grossNeeds)}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Less: Existing Coverage</Text>
            <Text style={styles.rowValue}>
              ({fmtCurrency(insuranceNeeds.existingCoverage)})
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Less: Liquid Assets</Text>
            <Text style={styles.rowValue}>
              ({fmtCurrency(insuranceNeeds.liquidAssets)})
            </Text>
          </View>
          <View style={styles.highlightRow}>
            <Text style={styles.highlightLabel}>Recommended Coverage</Text>
            <Text style={styles.highlightValue}>
              {fmtCurrency(insuranceNeeds.totalInsuranceNeeds)}
            </Text>
          </View>
          {insuranceNeeds.totalInsuranceNeedsBand && (
            <View style={{ ...styles.row, marginTop: 4 }}>
              <Text style={styles.rowLabel}>Coverage Band</Text>
              <Text style={styles.rowValue}>
                {fmtCurrency(insuranceNeeds.totalInsuranceNeedsBand.low)} –{" "}
                {fmtCurrency(insuranceNeeds.totalInsuranceNeedsBand.high)}
              </Text>
            </View>
          )}
        </View>

        {/* Settling Requirements (if available) */}
        {settlingRequirements && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Estate Settling Costs</Text>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Probate Fees</Text>
              <Text style={styles.rowValue}>
                {fmtCurrency(settlingRequirements.probateFees)}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Federal Estate Tax</Text>
              <Text style={styles.rowValue}>
                {fmtCurrency(settlingRequirements.federalEstateTax)}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>State Estate Tax</Text>
              <Text style={styles.rowValue}>
                {fmtCurrency(settlingRequirements.stateEstateTax)}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Final Income Tax</Text>
              <Text style={styles.rowValue}>
                {fmtCurrency(settlingRequirements.finalIncomeTax)}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Professional Fees</Text>
              <Text style={styles.rowValue}>
                {fmtCurrency(
                  settlingRequirements.professionalFees.totalProfessionalFees,
                )}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Funeral Expenses</Text>
              <Text style={styles.rowValue}>
                {fmtCurrency(settlingRequirements.funeralExpenses)}
              </Text>
            </View>
            <View style={styles.highlightRow}>
              <Text style={styles.highlightLabel}>Total Settling Costs</Text>
              <Text style={styles.highlightValue}>
                {fmtCurrency(settlingRequirements.totalSettlingRequirements)}
              </Text>
            </View>
          </View>
        )}

        {/* Confidence */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Estimate Confidence</Text>
          <View
            style={{
              ...styles.confidenceSection,
              backgroundColor: confidenceBgColor(confidence.label),
            }}
          >
            <Text
              style={{
                ...styles.confidenceLabel,
                color: confidenceTextColor(confidence.label),
              }}
            >
              {confidence.label} Confidence — Score: {confidence.score}/100
            </Text>
            {confidence.reasons.map((reason, i) => (
              <Text key={i} style={styles.confidenceReason}>
                • {reason}
              </Text>
            ))}
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>InsurFlow Compliance Packet</Text>
          <Text>{consumerContext.clientName}</Text>
          <Text>
            {new Date(metadata.generatedAt).toLocaleDateString("en-US")}
          </Text>
        </View>
      </Page>

      {/* Page 2: Assumptions + Trace */}
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Assumptions & Calculation Trace</Text>
          <Text style={styles.subtitle}>
            {consumerContext.clientName} — Detail Appendix
          </Text>
        </View>

        {/* Assumptions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Assumptions Used</Text>
          {assumptions.map((a, i) => (
            <View key={i} style={styles.assumptionItem}>
              <View style={styles.assumptionLeft}>
                <Text style={styles.assumptionCategory}>{a.category}</Text>
                <Text style={styles.assumptionDesc}>{a.description}</Text>
              </View>
              <Text style={styles.assumptionValue}>{a.value}</Text>
              <Text style={{ ...styles.badge, marginLeft: 6 }}>{a.source}</Text>
            </View>
          ))}
        </View>

        {/* Calculation Trace */}
        {trace.sections.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Calculation Trace</Text>
            {trace.sections.map((section) => (
              <View key={section.key} style={styles.traceSection}>
                <Text style={styles.traceSectionLabel}>
                  {section.label}
                  {section.result != null
                    ? ` = ${fmtCurrency(section.result)}`
                    : ""}
                </Text>
                {section.items.map((item) => (
                  <View key={item.key} style={styles.traceItem}>
                    <Text style={styles.traceItemLabel}>
                      {item.label} ({item.kind})
                    </Text>
                    <Text style={styles.traceItemValue}>
                      {item.value != null
                        ? typeof item.value === "number"
                          ? item.unit === "currency"
                            ? fmtCurrency(item.value)
                            : item.unit === "percent"
                              ? `${item.value}%`
                              : String(item.value)
                          : String(item.value)
                        : "—"}
                    </Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}

        <View style={styles.footer} fixed>
          <Text>InsurFlow Compliance Packet — Assumptions</Text>
          <Text>{consumerContext.clientName}</Text>
          <Text>
            {new Date(metadata.generatedAt).toLocaleDateString("en-US")}
          </Text>
        </View>
      </Page>

      {/* Page 3: Methodology */}
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Methodology & Sources</Text>
          <Text style={styles.subtitle}>
            {consumerContext.clientName} — Methodology Appendix
          </Text>
        </View>

        {methodologyNotes.map((note) => (
          <View key={note.moduleId} style={styles.methodologyBlock}>
            <Text style={styles.methodologyTitle}>{note.title}</Text>
            <Text style={styles.methodologySummary}>{note.summary}</Text>

            {/* Steps */}
            {note.steps.map((step) => (
              <View key={step.step} style={styles.stepItem}>
                <Text style={styles.stepTitle}>
                  Step {step.step}: {step.title}
                </Text>
                <Text style={styles.stepDesc}>{step.description}</Text>
                {step.formula && (
                  <Text style={styles.formula}>{step.formula}</Text>
                )}
              </View>
            ))}

            {/* Assumptions */}
            {note.assumptions.length > 0 && (
              <View style={{ marginTop: 6 }}>
                <Text style={{ ...styles.stepTitle, marginBottom: 2 }}>
                  Assumptions:
                </Text>
                {note.assumptions.map((assumption, i) => (
                  <Text key={i} style={styles.stepDesc}>
                    • {assumption}
                  </Text>
                ))}
              </View>
            )}

            {/* Sources */}
            {note.sources.length > 0 && (
              <View style={{ marginTop: 6 }}>
                <Text style={{ ...styles.stepTitle, marginBottom: 2 }}>
                  Sources:
                </Text>
                {note.sources.map((src, i) => (
                  <Text key={i} style={styles.sourceItem}>
                    [{src.label}] {src.title} (Effective: {src.effectiveDate}) —{" "}
                    {src.url}
                  </Text>
                ))}
              </View>
            )}
          </View>
        ))}

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerTitle}>Important Disclaimer</Text>
          <Text style={styles.disclaimerText}>
            This compliance packet is generated for informational and review
            purposes only. The estimates provided are non-binding and based on
            the inputs and assumptions documented herein. Actual insurance needs
            may vary based on individual circumstances, market conditions, and
            carrier underwriting. This document does not constitute financial
            advice, an offer to sell, or a solicitation to purchase any
            insurance product. Please consult with a licensed insurance
            professional for personalized guidance.
          </Text>
        </View>

        <View style={styles.footer} fixed>
          <Text>InsurFlow Compliance Packet — Methodology</Text>
          <Text>{consumerContext.clientName}</Text>
          <Text>
            {new Date(metadata.generatedAt).toLocaleDateString("en-US")}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
