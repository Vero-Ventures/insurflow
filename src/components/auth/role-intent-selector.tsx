"use client";

import Link from "next/link";
import { useEffect } from "react";

const ROLE_INTENT_COOKIE_NAME = "insurflow_role_intent";
const ROLE_INTENT_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

type RoleIntentSelectorProps = {
  selectedRole: "client";
};

export function RoleIntentSelector({ selectedRole }: RoleIntentSelectorProps) {
  useEffect(() => {
    document.cookie = `${ROLE_INTENT_COOKIE_NAME}=${selectedRole}; Path=/; Max-Age=${ROLE_INTENT_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
  }, [selectedRole]);

  return (
    <div className="mb-5 space-y-2">
      <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        Account type
      </p>
      <Link
        href="/auth/sign-up?role=client"
        className="inline-flex h-10 w-full items-center justify-center rounded-md border border-primary bg-primary/10 px-3 text-sm font-medium text-primary transition-colors"
      >
        Applicant
      </Link>
      <p className="text-muted-foreground text-xs">
        You can confirm your details during onboarding before submission.
      </p>
    </div>
  );
}
