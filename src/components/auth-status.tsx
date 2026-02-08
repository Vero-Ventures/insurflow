"use client";

import { SignedIn, SignedOut } from "@daveyplate/better-auth-ui";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play } from "lucide-react";

export function AuthStatus() {
  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row">
      <SignedIn>
        <Button asChild size="lg" className="text-base">
          <Link href="/clients">
            Go to Dashboard
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </SignedIn>

      <SignedOut>
        <Button
          asChild
          size="lg"
          className="from-primary hover:from-primary/90 bg-gradient-to-r to-[oklch(0.45_0.10_230)] text-base shadow-lg transition-all hover:to-[oklch(0.45_0.10_230)]/90 hover:shadow-xl"
        >
          <Link href="/auth/sign-up">
            Get Early Access
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
        <Button
          asChild
          variant="outline"
          size="lg"
          className="border-border/60 text-base"
        >
          <Link href="/auth/sign-in">Sign In</Link>
        </Button>
        <Button
          asChild
          variant="ghost"
          size="lg"
          className="text-muted-foreground hover:text-foreground text-base"
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
