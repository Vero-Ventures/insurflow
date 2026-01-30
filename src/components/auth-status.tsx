"use client";

import { SignedIn, SignedOut } from "@daveyplate/better-auth-ui";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function AuthStatus() {
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <SignedIn>
        <Button asChild size="lg">
          <Link href="/clients">
            Go to Clients
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </SignedIn>

      <SignedOut>
        <Button asChild size="lg">
          <Link href="/auth/sign-up">Get Started</Link>
        </Button>
        <Button asChild variant="outline" size="lg" className="bg-white/10">
          <Link href="/auth/sign-in">Sign in</Link>
        </Button>
      </SignedOut>
    </div>
  );
}
