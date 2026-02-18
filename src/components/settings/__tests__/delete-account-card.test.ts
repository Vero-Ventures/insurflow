import { describe, expect, it } from "vitest";
import type { Account } from "better-auth";

import {
  sanitizeDeleteAccounts,
  shouldRequireDeletePassword,
} from "@/components/settings/delete-account-card";

function makeAccount(providerId: string): Account {
  return {
    id: `${providerId}-id`,
    accountId: `${providerId}-account`,
    providerId,
    userId: "user-1",
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Account;
}

describe("delete-account-card password behavior", () => {
  it("requires password for credential-only accounts", () => {
    const accounts = [makeAccount("credential")];

    expect(shouldRequireDeletePassword(accounts)).toBe(true);
  });

  it("does not require password when a social provider is linked", () => {
    const accounts = [makeAccount("credential"), makeAccount("google")];

    expect(shouldRequireDeletePassword(accounts)).toBe(false);
  });

  it("hides credential account for mixed social + credential users", () => {
    const accounts = [makeAccount("credential"), makeAccount("google")];

    expect(
      sanitizeDeleteAccounts(accounts)?.map((account) => account.providerId),
    ).toEqual(["google"]);
  });
});
