import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { DocumentProps } from "@react-pdf/renderer";
import type { ReactElement } from "react";

export interface PdfReportSectionItem {
  label: string;
  value: string;
}

export interface PdfReportData {
  title: string;
  generatedAt: string;
  clientName: string;
  profile: PdfReportSectionItem[];
  financialInputs: PdfReportSectionItem[];
  summary: PdfReportSectionItem[];
  recommendation: string;
}

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontSize: 11,
    color: "#111827",
    fontFamily: "Helvetica",
  },
  header: {
    marginBottom: 18,
    borderBottom: "1 solid #d1d5db",
    paddingBottom: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 10,
    color: "#4b5563",
  },
  section: {
    marginBottom: 14,
    border: "1 solid #e5e7eb",
    borderRadius: 4,
    padding: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 8,
    color: "#1f2937",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottom: "1 solid #f3f4f6",
    paddingVertical: 4,
    gap: 12,
  },
  rowLabel: {
    color: "#6b7280",
  },
  rowValue: {
    fontWeight: 600,
    textAlign: "right",
    flexShrink: 0,
  },
  recommendation: {
    border: "1 solid #bfdbfe",
    backgroundColor: "#eff6ff",
    borderRadius: 4,
    padding: 10,
  },
  recommendationTitle: {
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 6,
    color: "#1e3a8a",
  },
  recommendationText: {
    fontSize: 11,
    lineHeight: 1.45,
    color: "#1f2937",
  },
});

function DataSection({
  title,
  items,
}: {
  title: string;
  items: PdfReportSectionItem[];
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {items.map((item) => (
        <View key={`${title}-${item.label}`} style={styles.row}>
          <Text style={styles.rowLabel}>{item.label}</Text>
          <Text style={styles.rowValue}>{item.value}</Text>
        </View>
      ))}
    </View>
  );
}

export function createClientReportPdfDocument(
  data: PdfReportData,
): ReactElement<DocumentProps> {
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>{data.title}</Text>
          <Text style={styles.subtitle}>Client: {data.clientName}</Text>
          <Text style={styles.subtitle}>Generated: {data.generatedAt}</Text>
        </View>

        <DataSection title="Client Profile" items={data.profile} />
        <DataSection title="Financial Inputs" items={data.financialInputs} />
        <DataSection title="Coverage Summary" items={data.summary} />

        <View style={styles.recommendation}>
          <Text style={styles.recommendationTitle}>Recommendation Summary</Text>
          <Text style={styles.recommendationText}>{data.recommendation}</Text>
        </View>
      </Page>
    </Document>
  );
}
