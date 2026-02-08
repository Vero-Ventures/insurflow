"use client";

import { SignedIn, SignedOut } from "@daveyplate/better-auth-ui";
import Link from "next/link";
import {
  User,
  Mail,
  CheckCircle2,
  XCircle,
  Settings,
  LogOut,
  ArrowLeft,
  Shield,
  Calendar,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { authClient } from "@/server/better-auth/client";

function getInitials(name: string | undefined | null): string {
  if (!name) return "U";
  const parts = name.trim().split(" ");
  if (parts.length === 1) {
    return parts[0]?.charAt(0).toUpperCase() ?? "U";
  }
  return (
    (parts[0]?.charAt(0) ?? "") + (parts[parts.length - 1]?.charAt(0) ?? "")
  ).toUpperCase();
}

// Signed out state
function SignedOutView() {
  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center p-4">
      <Card className="border-border/60 w-full max-w-sm text-center">
        <CardContent className="pt-6">
          <div className="bg-primary/10 mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
            <User className="text-primary h-6 w-6" />
          </div>
          <h2 className="font-display text-xl font-medium">Sign in Required</h2>
          <p className="text-muted-foreground mt-2 mb-4 text-sm">
            Please sign in to view your profile.
          </p>
          <Button asChild>
            <Link href="/auth/sign-in">Sign In</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// Profile info row component
function ProfileRow({
  icon: Icon,
  label,
  value,
  valueComponent,
}: {
  icon: React.ElementType;
  label: string;
  value?: string | null;
  valueComponent?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3">
        <div className="bg-muted flex h-8 w-8 items-center justify-center rounded-lg">
          <Icon className="text-muted-foreground h-4 w-4" />
        </div>
        <span className="text-muted-foreground text-sm">{label}</span>
      </div>
      {valueComponent || (
        <span className="text-sm font-medium">{value ?? "—"}</span>
      )}
    </div>
  );
}

export default function ProfilePage() {
  const { data: session, isPending } = authClient.useSession();
  const user = session?.user;

  return (
    <>
      <SignedOut>
        <SignedOutView />
      </SignedOut>

      <SignedIn>
        <div className="min-h-[calc(100vh-3.5rem)]">
          <div className="container mx-auto max-w-2xl px-4 py-8">
            {/* Back button */}
            <div className="mb-6">
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="text-muted-foreground hover:text-foreground -ml-2"
              >
                <Link href="/clients">
                  <ArrowLeft className="mr-1 h-4 w-4" />
                  Back
                </Link>
              </Button>
            </div>

            {/* Profile Header Card */}
            <Card className="border-border/60 mb-6 overflow-hidden py-0">
              {/* Gradient header */}
              <div className="bg-[oklch(0.35_0.08_250)] px-6 py-8 dark:bg-[oklch(0.25_0.06_250)]">
                <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
                  {isPending ? (
                    <div className="bg-muted/30 h-20 w-20 animate-pulse rounded-full" />
                  ) : (
                    <Avatar className="h-20 w-20 ring-4 ring-white/20">
                      <AvatarImage
                        src={user?.image ?? undefined}
                        alt={user?.name ?? "Profile"}
                      />
                      <AvatarFallback className="bg-white/10 text-xl font-medium text-white">
                        {getInitials(user?.name)}
                      </AvatarFallback>
                    </Avatar>
                  )}

                  <div className="flex-1 text-center sm:text-left">
                    {isPending ? (
                      <>
                        <div className="bg-muted/30 mx-auto mb-2 h-7 w-40 animate-pulse rounded sm:mx-0" />
                        <div className="bg-muted/30 mx-auto h-5 w-56 animate-pulse rounded sm:mx-0" />
                      </>
                    ) : (
                      <>
                        <h1 className="font-display text-2xl font-medium text-white">
                          {user?.name ?? "User"}
                        </h1>
                        <p className="mt-1 text-sm text-white/70">
                          {user?.email ?? "No email"}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Profile details */}
              <CardContent className="divide-y px-6 py-0">
                <ProfileRow icon={User} label="Full Name" value={user?.name} />
                <ProfileRow
                  icon={Mail}
                  label="Email Address"
                  value={user?.email}
                />
                <ProfileRow
                  icon={Shield}
                  label="Email Verified"
                  valueComponent={
                    <div className="flex items-center gap-1.5">
                      {user?.emailVerified ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                            Verified
                          </span>
                        </>
                      ) : (
                        <>
                          <XCircle className="text-muted-foreground h-4 w-4" />
                          <span className="text-muted-foreground text-sm font-medium">
                            Not verified
                          </span>
                        </>
                      )}
                    </div>
                  }
                />
                <ProfileRow
                  icon={Calendar}
                  label="Member Since"
                  value={
                    user?.createdAt
                      ? new Date(user.createdAt).toLocaleDateString("en-US", {
                          month: "long",
                          year: "numeric",
                        })
                      : undefined
                  }
                />
              </CardContent>
            </Card>

            {/* Action buttons */}
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild className="flex-1">
                <Link href="/settings">
                  <Settings className="mr-2 h-4 w-4" />
                  Edit Profile & Settings
                </Link>
              </Button>
              <Button
                variant="outline"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => authClient.signOut()}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </SignedIn>
    </>
  );
}
