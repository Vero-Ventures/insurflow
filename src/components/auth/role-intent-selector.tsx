"use client";

import Link from "next/link";
import { useEffect } from "react";

import { cn } from "@/lib/utils";
import type { AccountType } from "@/lib/role-experience";

type RoleIntentSelectorProps = {
  selectedRole: AccountType | null;
};

export function RoleIntentSelector({ selectedRole }: RoleIntentSelectorProps) {
  useEffect(() => {
    if (!selectedRole) {
      document.cookie =
        "insurflow_role_intent=; Path=/; Max-Age=0; SameSite=Lax";
      return;
    }

    document.cookie = `insurflow_role_intent=${selectedRole}; Path=/; Max-Age=2592000; SameSite=Lax`;
  }, [selectedRole]);

  return (
    <div className="mb-5 space-y-2">
      <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        Choose account type
      </p>
      <div className="grid grid-cols-2 gap-2">
        <Link
          href="/auth/sign-up?role=client"
          className={cn(
            "inline-flex h-10 items-center justify-center rounded-md border px-3 text-sm font-medium transition-colors",
            selectedRole === "client"
              ? "border-primary bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:text-foreground",
          )}
        >
          Client
        </Link>
        <Link
          href="/auth/sign-up?role=advisor"
          className={cn(
            "inline-flex h-10 items-center justify-center rounded-md border px-3 text-sm font-medium transition-colors",
            selectedRole === "advisor"
              ? "border-primary bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:text-foreground",
          )}
        >
          Advisor
        </Link>
      </div>
      <p className="text-muted-foreground text-xs">
        You can still confirm this during onboarding before setup is complete.
      </p>
    </div>
  );
}
