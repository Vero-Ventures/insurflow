export type ClientStatus = "draft" | "active" | "archived";

export type Client = {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  province: string;
  updatedAt: string;
  status: ClientStatus;
  // Optional fields for future expansion
  sex?: "M" | "F";
  smoker?: boolean;
  healthRating?: string;
  hasSpouse?: boolean;
  spouseAge?: number;
  clientIncome?: string;
  spouseIncome?: string;
};
