import { describe, it, expect } from "vitest";
import {
  buildCompliancePacket,
  type PacketBuilderInput,
} from "./packet-builder";
import { PACKET_VERSION } from "./packet-types";
import {
  INSURANCE_NEEDS_METHODOLOGY,
  INCOME_REPLACEMENT_METHODOLOGY,
} from "@/lib/transparency/methodology-data";

// =============================================================================
// Test fixtures
// =============================================================================

function createTestInput(
  overrides?: Partial<PacketBuilderInput>,
): PacketBuilderInput {
  return {
    client: {
      firstName: "Alex",
      lastName: "Thompson",
      stateCode: "CA",
      stateName: "California",
      dateOfBirth: "1982-06-15",
      age: 43,
      hasSpouse: true,
      smoker: false,
      healthRating: "preferred",
    },
    insuranceNeeds: {
      incomeReplacementNeeds: 700000,
      debtPayoffNeeds: 250000,
      estateBufferNeeds: 15000,
      grossNeeds: 965000,
      existingCoverage: 100000,
      liquidAssets: 50000,
      totalInsuranceNeeds: 815000,
      totalInsuranceNeedsBand: { low: 733500, target: 815000, high: 896500 },
      inputsUsed: {
        clientIncome: 100000,
        spouseIncome: 0,
        includeSpouseIncome: false,
        incomeReplacementPercent: 70,
        replacementDurationYears: 10,
        estateBufferType: "fixed",
        estateBufferValue: 15000,
      },
    },
    settlingRequirements: null,
    confidence: {
      score: 75,
      label: "Medium",
      reasons: ["Spouse income is missing"],
    },
    trace: {
      version: "1.0.0",
      sections: [],
    },
    inputsUsed: {
      clientIncome: 100000,
      spouseIncome: 0,
      includeSpouseIncome: false,
      incomeReplacementPercent: 70,
      replacementDurationYears: 10,
      existingCoverage: 100000,
      totalDebts: 250000,
      liquidAssets: 50000,
      totalAssets: 500000,
      estateBufferType: "fixed",
      estateBufferValue: 15000,
    },
    methodologies: [INSURANCE_NEEDS_METHODOLOGY],
    applicationContext: "d2c-consumer",
    ...overrides,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe("buildCompliancePacket", () => {
  describe("metadata", () => {
    it("includes packet version", () => {
      const packet = buildCompliancePacket(createTestInput());
      expect(packet.metadata.packetVersion).toBe(PACKET_VERSION);
    });

    it("includes generated timestamp", () => {
      const packet = buildCompliancePacket(createTestInput());
      expect(packet.metadata.generatedAt).toBeTruthy();
      expect(() => new Date(packet.metadata.generatedAt)).not.toThrow();
    });

    it("includes application context", () => {
      const packet = buildCompliancePacket(createTestInput());
      expect(packet.metadata.applicationContext).toBe("d2c-consumer");
    });

    it("includes engine versions", () => {
      const packet = buildCompliancePacket(createTestInput());
      expect(packet.metadata.engineVersions.insuranceNeeds).toBe("1.0.0");
      expect(packet.metadata.engineVersions.settlingRequirements).toBe("1.0.0");
    });
  });

  describe("consumer context", () => {
    it("includes client name", () => {
      const packet = buildCompliancePacket(createTestInput());
      expect(packet.consumerContext.clientName).toBe("Alex Thompson");
    });

    it("includes state info", () => {
      const packet = buildCompliancePacket(createTestInput());
      expect(packet.consumerContext.stateCode).toBe("CA");
      expect(packet.consumerContext.stateName).toBe("California");
    });

    it("includes demographic data", () => {
      const packet = buildCompliancePacket(createTestInput());
      expect(packet.consumerContext.age).toBe(43);
      expect(packet.consumerContext.hasSpouse).toBe(true);
      expect(packet.consumerContext.smoker).toBe(false);
    });
  });

  describe("estimate summary", () => {
    it("includes insurance needs result", () => {
      const packet = buildCompliancePacket(createTestInput());
      expect(packet.estimateSummary.insuranceNeeds.totalInsuranceNeeds).toBe(
        815000,
      );
    });

    it("includes confidence scoring", () => {
      const packet = buildCompliancePacket(createTestInput());
      expect(packet.estimateSummary.confidence.score).toBe(75);
      expect(packet.estimateSummary.confidence.label).toBe("Medium");
    });

    it("includes settling requirements when provided", () => {
      const settling = {
        probateFees: 5000,
        federalEstateTax: 0,
        stateEstateTax: 0,
        finalIncomeTax: 3000,
        professionalFees: {
          legalFees: 5000,
          accountingFees: 3500,
          executorFees: 10000,
          total: 18500,
        },
        funeralExpenses: 12000,
        totalSettlingRequirements: 38500,
        notes: ["Test note"],
        inputsUsed: {
          estateValue: 500000,
          state: "CA" as const,
          stateName: "California",
          finalYearIncome: 100000,
          assetCount: 0,
        },
      };
      const packet = buildCompliancePacket(
        createTestInput({ settlingRequirements: settling }),
      );
      expect(packet.estimateSummary.settlingRequirements).toBeDefined();
      expect(
        packet.estimateSummary.settlingRequirements?.totalSettlingRequirements,
      ).toBe(38500);
    });

    it("handles null settling requirements", () => {
      const packet = buildCompliancePacket(createTestInput());
      expect(packet.estimateSummary.settlingRequirements).toBeNull();
    });
  });

  describe("assumptions", () => {
    it("includes income replacement assumptions", () => {
      const packet = buildCompliancePacket(createTestInput());
      const incomeAssumptions = packet.assumptions.filter(
        (a) => a.category === "Income Replacement",
      );
      expect(incomeAssumptions.length).toBeGreaterThanOrEqual(3);
    });

    it("marks user-provided values correctly", () => {
      const packet = buildCompliancePacket(createTestInput());
      const incomeAssumption = packet.assumptions.find((a) =>
        a.description.includes("Client annual income"),
      );
      expect(incomeAssumption?.source).toBe("user-provided");
    });

    it("marks default values correctly", () => {
      const packet = buildCompliancePacket(createTestInput());
      const bufferAssumption = packet.assumptions.find(
        (a) => a.category === "Estate Buffer",
      );
      expect(bufferAssumption?.source).toBe("default");
    });

    it("includes spouse income when enabled", () => {
      const packet = buildCompliancePacket(
        createTestInput({
          inputsUsed: {
            ...createTestInput().inputsUsed,
            includeSpouseIncome: true,
            spouseIncome: 50000,
          },
        }),
      );
      const spouseAssumption = packet.assumptions.find((a) =>
        a.description.includes("Spouse income"),
      );
      expect(spouseAssumption).toBeDefined();
    });

    it("excludes spouse income when disabled", () => {
      const packet = buildCompliancePacket(createTestInput());
      const spouseAssumption = packet.assumptions.find((a) =>
        a.description.includes("Spouse income"),
      );
      expect(spouseAssumption).toBeUndefined();
    });
  });

  describe("methodology notes", () => {
    it("includes methodology for each provided module", () => {
      const packet = buildCompliancePacket(
        createTestInput({
          methodologies: [
            INSURANCE_NEEDS_METHODOLOGY,
            INCOME_REPLACEMENT_METHODOLOGY,
          ],
        }),
      );
      expect(packet.methodologyNotes).toHaveLength(2);
    });

    it("preserves step structure", () => {
      const packet = buildCompliancePacket(createTestInput());
      const note = packet.methodologyNotes[0];
      expect(note).toBeDefined();
      expect(note!.steps.length).toBeGreaterThan(0);
      expect(note!.steps[0]!.step).toBe(1);
    });

    it("preserves source citations", () => {
      const packet = buildCompliancePacket(createTestInput());
      const note = packet.methodologyNotes[0];
      expect(note!.sources.length).toBeGreaterThan(0);
    });
  });

  describe("method notes", () => {
    it("collects notes from all methodologies", () => {
      const packet = buildCompliancePacket(createTestInput());
      expect(packet.methodNotes.length).toBeGreaterThan(0);
    });

    it("includes methodology title and summary", () => {
      const packet = buildCompliancePacket(createTestInput());
      expect(packet.methodNotes[0]).toContain(
        INSURANCE_NEEDS_METHODOLOGY.title,
      );
    });
  });

  describe("trace", () => {
    it("passes through calculation trace", () => {
      const trace = {
        version: "1.0.0",
        sections: [
          {
            key: "test_section",
            label: "Test",
            result: 100,
            items: [],
          },
        ],
      };
      const packet = buildCompliancePacket(createTestInput({ trace }));
      expect(packet.trace.sections).toHaveLength(1);
      expect(packet.trace.sections[0]!.key).toBe("test_section");
    });
  });

  describe("full packet structure", () => {
    it("has all required top-level fields", () => {
      const packet = buildCompliancePacket(createTestInput());
      expect(packet.metadata).toBeDefined();
      expect(packet.consumerContext).toBeDefined();
      expect(packet.estimateSummary).toBeDefined();
      expect(packet.trace).toBeDefined();
      expect(packet.assumptions).toBeDefined();
      expect(packet.methodologyNotes).toBeDefined();
      expect(packet.methodNotes).toBeDefined();
    });

    it("content matches estimate trace and assumptions", () => {
      const input = createTestInput();
      const packet = buildCompliancePacket(input);

      // Verify the packet's estimate matches the input
      expect(packet.estimateSummary.insuranceNeeds).toEqual(
        input.insuranceNeeds,
      );
      expect(packet.trace).toEqual(input.trace);
    });
  });
});
