export interface Business {
  id: string;
  clientId: string;
  name: string;
  type: string;
  valuation: string;
  fiscalYearEnd: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  [key: string]: unknown;
}

export interface KeyPerson {
  id: string;
  businessId: string;
  name: string;
  role: string;
  compensation: string;
  ownershipPercentage: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  [key: string]: unknown;
}

export interface CorporateInsuranceNeed {
  id: string;
  businessId: string;
  insuranceType: string;
  coverageAmount: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  [key: string]: unknown;
}
