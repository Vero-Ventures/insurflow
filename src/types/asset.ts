export interface Asset {
  id: string;
  clientId: string;
  name: string;
  type: string;
  currentValue: string;
  isLiquid: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  [key: string]: unknown; // Support generic index signature for CrudItem
}
