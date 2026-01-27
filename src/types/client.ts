export type ClientStatus = "draft" | "active" | "archived";

export type Client = {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  province: string;
  updatedAt: string;
  status: ClientStatus;
};
