/**
 * Shared test client data for seeding and testing
 * Used by:
 * - API seed route: /api/clients/seed
 * - CLI seed script: scripts/seed-clients.ts
 */

type TestClientData = {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  sex: "M" | "F";
  state: "ON" | "BC" | "AB" | "QC" | "NS" | "MB" | "SK" | "NB" | "PE" | "NL";
  smoker: boolean;
  healthRating:
    | "preferred"
    | "preferred_plus"
    | "standard"
    | "standard_plus"
    | "substandard";
  hasSpouse: boolean;
  spouseAge?: number;
  clientIncome: string;
  spouseIncome?: string;
  status: "draft" | "active" | "archived";
};

export const testClientsData: TestClientData[] = [
  {
    firstName: "John",
    lastName: "Pork",
    dateOfBirth: "1980-05-15",
    sex: "M",
    state: "ON",
    smoker: false,
    healthRating: "preferred",
    hasSpouse: true,
    spouseAge: 45,
    clientIncome: "85000.00",
    status: "active",
  },
  {
    firstName: "Sarah",
    lastName: "Pork",
    dateOfBirth: "1985-08-22",
    sex: "F",
    state: "BC",
    smoker: false,
    healthRating: "preferred_plus",
    hasSpouse: false,
    clientIncome: "95000.00",
    status: "active",
  },
  {
    firstName: "Michael",
    lastName: "Pork",
    dateOfBirth: "1975-03-10",
    sex: "M",
    state: "AB",
    smoker: true,
    healthRating: "standard",
    hasSpouse: true,
    spouseAge: 48,
    clientIncome: "120000.00",
    spouseIncome: "75000.00",
    status: "active",
  },
  {
    firstName: "Emily",
    lastName: "Rodriguez",
    dateOfBirth: "1992-11-05",
    sex: "F",
    state: "QC",
    smoker: false,
    healthRating: "standard_plus",
    hasSpouse: false,
    clientIncome: "68000.00",
    status: "draft",
  },
  {
    firstName: "David",
    lastName: "Thompson",
    dateOfBirth: "1970-07-18",
    sex: "M",
    state: "NS",
    smoker: false,
    healthRating: "standard",
    hasSpouse: true,
    spouseAge: 52,
    clientIncome: "110000.00",
    spouseIncome: "65000.00",
    status: "active",
  },
  {
    firstName: "Jennifer",
    lastName: "Pork",
    dateOfBirth: "1988-02-14",
    sex: "F",
    state: "MB",
    smoker: false,
    healthRating: "preferred",
    hasSpouse: false,
    clientIncome: "72000.00",
    status: "active",
  },
  {
    firstName: "Robert",
    lastName: "Martinez",
    dateOfBirth: "1965-09-30",
    sex: "M",
    state: "SK",
    smoker: true,
    healthRating: "substandard",
    hasSpouse: true,
    spouseAge: 58,
    clientIncome: "98000.00",
    spouseIncome: "45000.00",
    status: "active",
  },
  {
    firstName: "Lisa",
    lastName: "Wilson",
    dateOfBirth: "1995-12-03",
    sex: "F",
    state: "NB",
    smoker: false,
    healthRating: "standard_plus",
    hasSpouse: false,
    clientIncome: "55000.00",
    status: "draft",
  },
  {
    firstName: "James",
    lastName: "Pork",
    dateOfBirth: "1982-06-25",
    sex: "M",
    state: "PE",
    smoker: false,
    healthRating: "preferred_plus",
    hasSpouse: true,
    spouseAge: 39,
    clientIncome: "105000.00",
    spouseIncome: "82000.00",
    status: "active",
  },
  {
    firstName: "Amanda",
    lastName: "Taylor",
    dateOfBirth: "1990-04-17",
    sex: "F",
    state: "NL",
    smoker: false,
    healthRating: "standard",
    hasSpouse: false,
    clientIncome: "63000.00",
    status: "active",
  },
];
