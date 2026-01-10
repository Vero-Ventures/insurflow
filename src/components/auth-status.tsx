"use client";

import { SignedIn, SignedOut, UserButton } from "@daveyplate/better-auth-ui";
import Link from "next/link";

export function AuthStatus() {
  return (
    <div className="flex flex-col items-center gap-4">
      <SignedIn>
        <UserButton />
      </SignedIn>

      <SignedOut>
        <Link
          href="/auth/sign-in"
          className="rounded-lg bg-white px-8 py-3 font-semibold text-slate-900 transition hover:bg-slate-100"
        >
          Sign in
        </Link>
      </SignedOut>
    </div>
  );
}
