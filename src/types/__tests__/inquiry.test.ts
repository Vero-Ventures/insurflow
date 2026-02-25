import { describe, it, expect } from "vitest";
import {
  INQUIRY_STATUS_LABELS,
  INQUIRY_STATUS_COLORS,
  type InquiryStatus,
  type HouseholdStatus,
  type IntakeData,
  type EstimateSnapshot,
} from "@/types/inquiry";

describe("Inquiry Types", () => {
  describe("InquiryStatus", () => {
    it("has valid status values", () => {
      const validStatuses: InquiryStatus[] = [
        "pending",
        "completed",
        "viewed",
        "claimed",
        "converted",
        "archived",
      ];

      validStatuses.forEach((status) => {
        expect(INQUIRY_STATUS_LABELS).toHaveProperty(status);
        expect(INQUIRY_STATUS_COLORS).toHaveProperty(status);
      });
    });

    it("has labels for all statuses", () => {
      expect(INQUIRY_STATUS_LABELS.pending).toBe("Pending");
      expect(INQUIRY_STATUS_LABELS.completed).toBe("Completed");
      expect(INQUIRY_STATUS_LABELS.viewed).toBe("Viewed");
      expect(INQUIRY_STATUS_LABELS.claimed).toBe("Claimed");
      expect(INQUIRY_STATUS_LABELS.converted).toBe("Converted");
      expect(INQUIRY_STATUS_LABELS.archived).toBe("Archived");
    });

    it("has colors for all statuses", () => {
      expect(INQUIRY_STATUS_COLORS.pending).toContain("gray");
      expect(INQUIRY_STATUS_COLORS.completed).toContain("green");
      expect(INQUIRY_STATUS_COLORS.viewed).toContain("blue");
      expect(INQUIRY_STATUS_COLORS.claimed).toContain("purple");
      expect(INQUIRY_STATUS_COLORS.converted).toContain("emerald");
      expect(INQUIRY_STATUS_COLORS.archived).toContain("gray");
    });
  });

  describe("HouseholdStatus", () => {
    it("has valid household status values", () => {
      const validStatuses: HouseholdStatus[] = [
        "single",
        "married",
        "partnered",
        "single_parent",
      ];

      validStatuses.forEach((status) => {
        const intakeData: IntakeData = {
          householdStatus: status,
          annualHouseholdIncome: "100000",
          totalDebts: "50000",
          currentCoverage: "250000",
          primaryGoal: "Protect my family",
        };

        expect(intakeData.householdStatus).toBe(status);
      });
    });

    it("allows null household status", () => {
      const intakeData: IntakeData = {
        householdStatus: null,
        annualHouseholdIncome: "100000",
        totalDebts: "50000",
        currentCoverage: "250000",
        primaryGoal: "Protect my family",
      };

      expect(intakeData.householdStatus).toBeNull();
    });
  });

  describe("IntakeData", () => {
    it("creates valid intake data object", () => {
      const intakeData: IntakeData = {
        householdStatus: "married",
        annualHouseholdIncome: "150000",
        totalDebts: "200000",
        currentCoverage: "100000",
        primaryGoal: "Estate planning",
      };

      expect(intakeData.householdStatus).toBe("married");
      expect(intakeData.annualHouseholdIncome).toBe("150000");
      expect(intakeData.totalDebts).toBe("200000");
      expect(intakeData.currentCoverage).toBe("100000");
      expect(intakeData.primaryGoal).toBe("Estate planning");
    });

    it("allows optional fields to be null", () => {
      const intakeData: IntakeData = {
        householdStatus: null,
        annualHouseholdIncome: null,
        totalDebts: null,
        currentCoverage: null,
        primaryGoal: null,
      };

      expect(intakeData.householdStatus).toBeNull();
      expect(intakeData.annualHouseholdIncome).toBeNull();
      expect(intakeData.totalDebts).toBeNull();
      expect(intakeData.currentCoverage).toBeNull();
      expect(intakeData.primaryGoal).toBeNull();
    });
  });

  describe("EstimateSnapshot", () => {
    it("creates valid estimate snapshot", () => {
      const snapshot: EstimateSnapshot = {
        estimatedCoverageNeed: "500000",
        estimatedPremium: "5000",
        scenarioId: "young-family",
      };

      expect(snapshot.estimatedCoverageNeed).toBe("500000");
      expect(snapshot.estimatedPremium).toBe("5000");
      expect(snapshot.scenarioId).toBe("young-family");
    });

    it("allows optional fields to be null", () => {
      const snapshot: EstimateSnapshot = {
        estimatedCoverageNeed: null,
        estimatedPremium: null,
        scenarioId: null,
      };

      expect(snapshot.estimatedCoverageNeed).toBeNull();
      expect(snapshot.estimatedPremium).toBeNull();
      expect(snapshot.scenarioId).toBeNull();
    });
  });
});
