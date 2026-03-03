"use client";

import Link from "next/link";
import { useEffect } from "react";

import { cn } from "@/lib/utils";
import type { AccountType } from "@/lib/role-experience";

const ROLE_INTENT_COOKIE_NAME = "insurflow_role_intent";
const ROLE_INTENT_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

type RoleIntentSelectorProps = {
  selectedRole: AccountType | null;
};

export function RoleIntentSelector({ selectedRole }: RoleIntentSelectorProps) {
  useEffect(() => {
    if (!selectedRole) {
      document.cookie = `${ROLE_INTENT_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax`;
      return;
    }

    document.cookie = `${ROLE_INTENT_COOKIE_NAME}=${selectedRole}; Path=/; Max-Age=${ROLE_INTENT_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
  }, [selectedRole]);

  return (
    <div className="mb-5 space-y-2">
      <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        Account type
      </p>
      <Link
        href="/auth/sign-up?role=client"
        className={cn(
          "inline-flex h-10 w-full items-center justify-center rounded-md border px-3 text-sm font-medium transition-colors",
          selectedRole === "client"
            ? "border-primary bg-primary/10 text-primary"
            : "border-border text-muted-foreground hover:text-foreground",
        )}
      >
        Applicant
      </Link>
      <p className="text-muted-foreground text-xs">
        You can confirm your details during onboarding before submission.
      </p>
    </div>
  );
}
