import { z } from "zod";

/**
 * Enum of supported beneficiary relationship types
 */
export const BENEFICIARY_RELATIONSHIPS = [
  "spouse",
  "child",
  "parent",
  "sibling",
  "grandchild",
  "grandparent",
  "trust",
  "charity",
  "estate",
  "business_partner",
  "other",
] as const;

/**
 * Human-readable labels for relationship types
 */
export const BENEFICIARY_RELATIONSHIP_LABELS: Record<
  (typeof BENEFICIARY_RELATIONSHIPS)[number],
  string
> = {
  spouse: "Spouse",
  child: "Child",
  parent: "Parent",
  sibling: "Sibling",
  grandchild: "Grandchild",
  grandparent: "Grandparent",
  trust: "Trust",
  charity: "Charity",
  estate: "Estate",
  business_partner: "Business Partner",
  other: "Other",
};

/**
 * Validation schema for beneficiary relationship enum
 */
export const beneficiaryRelationshipSchema = z.enum(BENEFICIARY_RELATIONSHIPS);

/**
 * Validation schema for percentage values (0-100)
 */
export const percentSchema = z.string().refine(
  (val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num >= 0 && num <= 100;
  },
  { message: "Percentage must be between 0 and 100" },
);

/**
 * Validation schema for creating a beneficiary
 */
export const createBeneficiarySchema = z
  .object({
    firstName: z.string().min(1, "First name is required").max(255),
    lastName: z.string().min(1, "Last name is required").max(255),
    dateOfBirth: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)")
      .nullable()
      .optional(),
    relationship: beneficiaryRelationshipSchema,
    isPrimary: z.boolean().default(true),
    notes: z.string().max(1000).nullable().optional(),
  })
  .strict();

/**
 * Validation schema for updating a beneficiary
 */
export const updateBeneficiarySchema = z
  .object({
    firstName: z.string().min(1).max(255).optional(),
    lastName: z.string().min(1).max(255).optional(),
    dateOfBirth: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format")
      .nullable()
      .optional(),
    relationship: beneficiaryRelationshipSchema.optional(),
    isPrimary: z.boolean().optional(),
    notes: z.string().max(1000).nullable().optional(),
  })
  .strict();

/**
 * Validation schema for creating an asset allocation
 */
export const createAssetAllocationSchema = z
  .object({
    beneficiaryId: z.string().uuid("Invalid beneficiary ID"),
    assetId: z.string().uuid("Invalid asset ID"),
    desiredPercent: percentSchema,
    actualPercent: percentSchema,
    notes: z.string().max(1000).nullable().optional(),
  })
  .strict();

/**
 * Validation schema for updating an asset allocation
 */
export const updateAssetAllocationSchema = z
  .object({
    desiredPercent: percentSchema.optional(),
    actualPercent: percentSchema.optional(),
    notes: z.string().max(1000).nullable().optional(),
  })
  .strict();

/**
 * Validation schema for bulk updating allocations for an asset
 */
export const bulkUpdateAllocationsSchema = z
  .object({
    allocations: z.array(
      z.object({
        beneficiaryId: z.string().uuid("Invalid beneficiary ID"),
        desiredPercent: percentSchema,
        actualPercent: percentSchema,
        notes: z.string().max(1000).nullable().optional(),
      }),
    ),
  })
  .strict();
