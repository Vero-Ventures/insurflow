export interface Debt {
  id: string;
  clientId: string;
  name: string;
  type: string;
  currentBalance: string | number;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown; // Support generic index signature for CrudItem
}
