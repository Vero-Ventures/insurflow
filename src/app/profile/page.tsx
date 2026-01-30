"use client";

import { SignedIn, SignedOut } from "@daveyplate/better-auth-ui";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export default function ProfilePage() {
  const { data: session } = authClient.useSession();
  const user = session?.user;

  return (
    <>
      <SignedOut>
        <div className="bg-muted/30 flex min-h-[calc(100vh-3.5rem)] items-center justify-center p-4">
          <Card className="w-full max-w-sm text-center" size="sm">
            <CardHeader>
              <CardTitle>Authentication Required</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-3 text-sm">
                Please sign in to view your profile.
              </p>
              <Link
                href="/auth/sign-in"
                className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium"
              >
                Sign In
              </Link>
            </CardContent>
          </Card>
        </div>
      </SignedOut>

      <SignedIn>
        <div className="bg-muted/30 min-h-[calc(100vh-3.5rem)]">
          <div className="container mx-auto max-w-2xl px-4 py-6">
            <div className="mb-6">
              <h1 className="text-xl font-semibold tracking-tight">Profile</h1>
              <p className="text-muted-foreground text-sm">
                View and manage your profile information
              </p>
            </div>

            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
                  <Avatar className="h-20 w-20">
                    <AvatarImage
                      src={user?.image ?? undefined}
                      alt={user?.name ?? "Profile"}
                    />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xl font-medium">
                      {getInitials(user?.name)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 text-center sm:text-left">
                    <h2 className="text-lg font-semibold">
                      {user?.name ?? "User"}
                    </h2>
                    <p className="text-muted-foreground text-sm">
                      {user?.email ?? "No email"}
                    </p>
                  </div>
                </div>

                <div className="mt-6 border-t pt-6">
                  <h3 className="mb-4 text-sm font-medium">Account Details</h3>
                  <dl className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Email</dt>
                      <dd>{user?.email ?? "—"}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Name</dt>
                      <dd>{user?.name ?? "—"}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Email Verified</dt>
                      <dd>{user?.emailVerified ? "Yes" : "No"}</dd>
                    </div>
                  </dl>
                </div>

                <div className="mt-6 flex flex-col gap-2 border-t pt-6 sm:flex-row">
                  <Button variant="outline" asChild>
                    <Link href="/settings">Edit Profile</Link>
                  </Button>
                  <Button
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => authClient.signOut()}
                  >
                    Sign Out
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </SignedIn>
    </>
  );
}
