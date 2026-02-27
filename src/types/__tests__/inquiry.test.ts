import { describe, it, expect } from "vitest";
import {
  INQUIRY_STATUS_LABELS,
  INQUIRY_STATUS_COLORS,
  type InquiryStatus,
  type HouseholdStatus,
  type Inquiry,
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
        const inquiry: Inquiry = {
          id: "1",
          status: "pending",
          firstName: "John",
          lastName: "Doe",
          email: "john@example.com",
          phone: null,
          referralSource: null,
          householdStatus: status,
          annualHouseholdIncome: "100000",
          totalDebts: "50000",
          currentCoverage: "250000",
          primaryGoal: "Protect my family",
          estimatedCoverageNeed: null,
          estimatedPremium: null,
          scenarioId: null,
          claimedByUserId: null,
          claimedAt: null,
          convertedToClientId: null,
          convertedAt: null,
          consumerIpAddress: null,
          consumerUserAgent: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          deletedAt: null,
        };

        expect(inquiry.householdStatus).toBe(status);
      });
    });

    it("allows null household status", () => {
      const inquiry: Inquiry = {
        id: "1",
        status: "pending",
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        phone: null,
        referralSource: null,
        householdStatus: null,
        annualHouseholdIncome: "100000",
        totalDebts: "50000",
        currentCoverage: "250000",
        primaryGoal: "Protect my family",
        estimatedCoverageNeed: null,
        estimatedPremium: null,
        scenarioId: null,
        claimedByUserId: null,
        claimedAt: null,
        convertedToClientId: null,
        convertedAt: null,
        consumerIpAddress: null,
        consumerUserAgent: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
      };

      expect(inquiry.householdStatus).toBeNull();
    });
  });

  describe("Inquiry Flat Structure", () => {
    it("creates valid inquiry with flat structure", () => {
      const inquiry: Inquiry = {
        id: "1",
        status: "pending",
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        phone: "555-123-4567",
        referralSource: "Google",
        householdStatus: "married",
        annualHouseholdIncome: "150000",
        totalDebts: "200000",
        currentCoverage: "100000",
        primaryGoal: "Estate planning",
        estimatedCoverageNeed: "500000",
        estimatedPremium: "5000",
        scenarioId: "young-family",
        claimedByUserId: null,
        claimedAt: null,
        convertedToClientId: null,
        convertedAt: null,
        consumerIpAddress: null,
        consumerUserAgent: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
      };

      expect(inquiry.householdStatus).toBe("married");
      expect(inquiry.annualHouseholdIncome).toBe("150000");
      expect(inquiry.totalDebts).toBe("200000");
      expect(inquiry.currentCoverage).toBe("100000");
      expect(inquiry.primaryGoal).toBe("Estate planning");
      expect(inquiry.estimatedCoverageNeed).toBe("500000");
      expect(inquiry.estimatedPremium).toBe("5000");
      expect(inquiry.scenarioId).toBe("young-family");
    });

    it("allows optional fields to be null", () => {
      const inquiry: Inquiry = {
        id: "1",
        status: "pending",
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        phone: null,
        referralSource: null,
        householdStatus: null,
        annualHouseholdIncome: null,
        totalDebts: null,
        currentCoverage: null,
        primaryGoal: null,
        estimatedCoverageNeed: null,
        estimatedPremium: null,
        scenarioId: null,
        claimedByUserId: null,
        claimedAt: null,
        convertedToClientId: null,
        convertedAt: null,
        consumerIpAddress: null,
        consumerUserAgent: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
      };

      expect(inquiry.householdStatus).toBeNull();
      expect(inquiry.annualHouseholdIncome).toBeNull();
      expect(inquiry.totalDebts).toBeNull();
      expect(inquiry.currentCoverage).toBeNull();
      expect(inquiry.primaryGoal).toBeNull();
      expect(inquiry.estimatedCoverageNeed).toBeNull();
      expect(inquiry.estimatedPremium).toBeNull();
      expect(inquiry.scenarioId).toBeNull();
    });
  });
});
