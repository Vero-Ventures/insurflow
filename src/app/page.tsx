"use client";

import { SignedIn, SignedOut, UserButton } from "@daveyplate/better-auth-ui";
import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-900 to-slate-800">
      <div className="container flex flex-col items-center justify-center gap-8 px-4 py-16">
        <div className="flex flex-col items-center gap-4">
          <h1 className="text-5xl font-bold tracking-tight text-white sm:text-6xl">
            InsurFlow
          </h1>
          <p className="max-w-md text-center text-lg text-slate-300">
            AI-powered financial needs analysis for life insurance advisors
          </p>
        </div>

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
      </div>
    </main>
  );
}
