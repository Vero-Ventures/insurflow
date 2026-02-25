/**
 * @fileoverview Type definitions for share links.
 */

export type ShareLinkStatus = "active" | "viewed" | "interested" | "expired";

export type HouseholdStatus =
  | "single"
  | "married"
  | "partnered"
  | "single_parent";

export interface ShareLinkIntakeData {
  householdStatus: HouseholdStatus | null;
  annualHouseholdIncome: string | null;
  totalDebts: string | null;
  currentCoverage: string | null;
  primaryGoal: string | null;
}

export interface ShareLinkEstimateData {
  estimatedCoverageNeed: string | null;
  estimatedGap: string | null;
  scenarioId: string | null;
  incomeReplacementPercent: number | null;
  replacementDurationYears: number | null;
  liquidAssets: number | null;
}

export interface ShareLink {
  id: string;
  token: string;
  status: ShareLinkStatus;
  expiresAt: string;
  viewedAt: string | null;
  interestedAt: string | null;
  claimedByUserId: string | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  intakeData: {
    householdStatus: HouseholdStatus | null;
    annualHouseholdIncome: string | null;
    totalDebts: string | null;
    currentCoverage: string | null;
    primaryGoal: string | null;
  } | null;
  estimateData: ShareLinkEstimateData | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateShareLinkInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  intakeData: ShareLinkIntakeData;
  estimateData: ShareLinkEstimateData;
  referrerEmail?: string;
}

export interface ShareLinkWithClaimer extends ShareLink {
  claimedByUserName?: string;
}

export const SHARE_LINK_STATUS_LABELS: Record<ShareLinkStatus, string> = {
  active: "Active",
  viewed: "Viewed",
  interested: "Interested",
  expired: "Expired",
};

export const SHARE_LINK_STATUS_COLORS: Record<ShareLinkStatus, string> = {
  active: "bg-green-100 text-green-800",
  viewed: "bg-blue-100 text-blue-800",
  interested: "bg-purple-100 text-purple-800",
  expired: "bg-gray-100 text-gray-500",
};
