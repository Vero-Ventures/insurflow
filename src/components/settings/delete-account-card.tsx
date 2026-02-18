"use client";

import { useEffect, useState } from "react";
import { DeleteAccountCard as BetterDeleteAccountCard } from "@daveyplate/better-auth-ui";
import type { Account } from "better-auth";

import { authClient } from "@/server/better-auth/client";

type BetterDeleteAccountCardProps = React.ComponentProps<
  typeof BetterDeleteAccountCard
>;

export function shouldRequireDeletePassword(
  accounts: Account[] | null | undefined,
): boolean {
  if (!accounts || accounts.length === 0) {
    return false;
  }

  const hasCredentialAccount = accounts.some(
    (account) => account.providerId === "credential",
  );

  if (!hasCredentialAccount) {
    return false;
  }

  const hasSocialAccount = accounts.some(
    (account) => account.providerId !== "credential",
  );

  return !hasSocialAccount;
}

export function sanitizeDeleteAccounts(
  accounts: Account[] | null | undefined,
): Account[] | null | undefined {
  if (!accounts || shouldRequireDeletePassword(accounts)) {
    return accounts;
  }

  return accounts.filter((account) => account.providerId !== "credential");
}

export function DeleteAccountCard(props: BetterDeleteAccountCardProps) {
  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [isPending, setIsPending] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadAccounts = async () => {
      setIsPending(true);
      try {
        const result = await authClient.listAccounts();

        if (!isMounted) {
          return;
        }

        setAccounts(result.data ?? null);
      } finally {
        if (isMounted) {
          setIsPending(false);
        }
      }
    };

    void loadAccounts();

    return () => {
      isMounted = false;
    };
  }, []);

  const sanitizedAccounts = sanitizeDeleteAccounts(accounts);

  return (
    <BetterDeleteAccountCard
      {...props}
      accounts={sanitizedAccounts ?? null}
      isPending={isPending}
      skipHook
    />
  );
}
