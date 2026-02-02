"use client";

import { SignedIn, SignedOut } from "@daveyplate/better-auth-ui";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play } from "lucide-react";

export function AuthStatus() {
  return (
    <div className="flex items-center gap-2">
      <SignedIn>
        <Button asChild>
          <Link href="/clients">
            Go to Clients
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Link>
        </Button>
      </SignedIn>

      <SignedOut>
        <Button asChild>
          <Link href="/auth/sign-up">Get Started</Link>
        </Button>
        <Button
          asChild
          variant="outline"
          className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
        >
          <Link href="/auth/sign-in">Sign in</Link>
        </Button>
        <Button
          asChild
          variant="ghost"
          className="text-white/70 hover:bg-white/10 hover:text-white"
        >
          <Link href="/demo">
            <Play className="mr-1.5 h-4 w-4" />
            Try Demo
          </Link>
        </Button>
      </SignedOut>
    </div>
  );
}
