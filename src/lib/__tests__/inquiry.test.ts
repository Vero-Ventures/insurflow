import { describe, it, expect } from "vitest";
import { createInquirySchema } from "@/lib/validation/shared-schemas";

describe("Create Inquiry Schema Validation", () => {
  it("validates a complete valid inquiry", () => {
    const validInquiry = {
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      phone: "555-123-4567",
      referralSource: "Google",
      householdStatus: "married",
      annualHouseholdIncome: "100000",
      totalDebts: "50000",
      currentCoverage: "250000",
      primaryGoal: "Protect my family's future",
      estimatedCoverageNeed: "500000",
      estimatedPremium: "5000",
      scenarioId: "young-family",
    };

    const result = createInquirySchema.safeParse(validInquiry);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.firstName).toBe("John");
      expect(result.data.lastName).toBe("Doe");
      expect(result.data.email).toBe("john@example.com");
    }
  });

  it("validates minimal inquiry with required fields only", () => {
    const minimalInquiry = {
      firstName: "Jane",
      lastName: "Smith",
      email: "jane@example.com",
    };

    const result = createInquirySchema.safeParse(minimalInquiry);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.firstName).toBe("Jane");
      expect(result.data.email).toBe("jane@example.com");
      expect(result.data.phone).toBeUndefined();
    }
  });

  it("rejects invalid email", () => {
    const invalidEmail = {
      firstName: "John",
      lastName: "Doe",
      email: "not-an-email",
    };

    const result = createInquirySchema.safeParse(invalidEmail);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toContain("email");
    }
  });

  it("rejects empty first name", () => {
    const emptyFirstName = {
      firstName: "",
      lastName: "Doe",
      email: "john@example.com",
    };

    const result = createInquirySchema.safeParse(emptyFirstName);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toContain("firstName");
    }
  });

  it("rejects missing last name", () => {
    const missingLastName = {
      firstName: "John",
      email: "john@example.com",
    };

    const result = createInquirySchema.safeParse(missingLastName);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toContain("lastName");
    }
  });

  it("rejects invalid household status", () => {
    const invalidHouseholdStatus = {
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      householdStatus: "invalid_status",
    };

    const result = createInquirySchema.safeParse(invalidHouseholdStatus);
    expect(result.success).toBe(false);
  });

  it("validates all household status options", () => {
    const statuses = ["single", "married", "partnered", "single_parent"];

    statuses.forEach((status) => {
      const inquiry = {
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        householdStatus: status,
      };

      const result = createInquirySchema.safeParse(inquiry);
      expect(result.success).toBe(true);
    });
  });

  it("rejects phone number too long", () => {
    const longPhone = {
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      phone: "a".repeat(21),
    };

    const result = createInquirySchema.safeParse(longPhone);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toContain("phone");
    }
  });

  it("rejects primary goal too long", () => {
    const longGoal = {
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      primaryGoal: "a".repeat(2001),
    };

    const result = createInquirySchema.safeParse(longGoal);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toContain("primaryGoal");
    }
  });

  it("accepts numeric strings for financial fields", () => {
    const numericFields = {
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      annualHouseholdIncome: "100000",
      totalDebts: "50000.50",
      currentCoverage: "250000",
      estimatedCoverageNeed: "500000",
      estimatedPremium: "5000.25",
    };

    const result = createInquirySchema.safeParse(numericFields);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.annualHouseholdIncome).toBe("100000");
      expect(result.data.totalDebts).toBe("50000.50");
    }
  });
});
