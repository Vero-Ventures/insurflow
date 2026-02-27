/**
 * @fileoverview Type definitions for intake inquiries.
 * Uses flat structure to match database schema.
 */

export type InquiryStatus =
  | "pending"
  | "completed"
  | "viewed"
  | "claimed"
  | "converted"
  | "archived";

export type HouseholdStatus =
  | "single"
  | "married"
  | "partnered"
  | "single_parent";

export interface Inquiry {
  id: string;
  status: InquiryStatus;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  referralSource: string | null;

  // Intake data fields (flat structure)
  householdStatus: HouseholdStatus | null;
  annualHouseholdIncome: string | null;
  totalDebts: string | null;
  currentCoverage: string | null;
  primaryGoal: string | null;

  // Estimate data fields (flat structure)
  estimatedCoverageNeed: string | null;
  estimatedPremium: string | null;
  scenarioId: string | null;

  // Assignment & conversion
  claimedByUserId: string | null;
  claimedAt: string | null;
  convertedToClientId: string | null;
  convertedAt: string | null;

  // Metadata
  consumerIpAddress: string | null;
  consumerUserAgent: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface InquiryWithAdvisor extends Inquiry {
  claimedByUserName?: string;
}

export interface CreateInquiryInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  referralSource?: string;
  householdStatus?: HouseholdStatus;
  annualHouseholdIncome?: string;
  totalDebts?: string;
  currentCoverage?: string;
  primaryGoal?: string;
  estimatedCoverageNeed?: string;
  estimatedPremium?: string;
  scenarioId?: string;
}

export interface UpdateInquiryStatusInput {
  status: InquiryStatus;
}

export interface InquiryListParams {
  page?: number;
  limit?: number;
  status?: InquiryStatus;
}

export interface PaginatedInquiries {
  inquiries: InquiryWithAdvisor[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export const INQUIRY_STATUS_LABELS: Record<InquiryStatus, string> = {
  pending: "Pending",
  completed: "Completed",
  viewed: "Viewed",
  claimed: "Claimed",
  converted: "Converted",
  archived: "Archived",
};

export const INQUIRY_STATUS_COLORS: Record<InquiryStatus, string> = {
  pending: "bg-gray-100 text-gray-800",
  completed: "bg-green-100 text-green-800",
  viewed: "bg-blue-100 text-blue-800",
  claimed: "bg-purple-100 text-purple-800",
  converted: "bg-emerald-100 text-emerald-800",
  archived: "bg-gray-100 text-gray-500",
};
