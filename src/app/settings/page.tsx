"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import {
  SignedIn,
  SignedOut,
  AccountSettingsCards,
  SecuritySettingsCards,
  DeleteAccountCard,
} from "@daveyplate/better-auth-ui";
import {
  User,
  Shield,
  Palette,
  AlertTriangle,
  Sun,
  Moon,
  Monitor,
  ArrowLeft,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Settings section component for consistent styling
function SettingsSection({
  id,
  icon: Icon,
  title,
  description,
  children,
  variant = "default",
}: {
  id: string;
  icon: React.ElementType;
  title: string;
  description: string;
  children: React.ReactNode;
  variant?: "default" | "danger";
}) {
  const isDanger = variant === "danger";

  return (
    <section id={id} className="scroll-mt-24">
      {/* Section Header */}
      <div className="mb-4 flex items-start gap-3">
        <div
          className={cn(
            "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg",
            isDanger ? "bg-destructive/10" : "bg-primary/10",
          )}
        >
          <Icon
            className={cn(
              "h-5 w-5",
              isDanger ? "text-destructive" : "text-primary",
            )}
          />
        </div>
        <div>
          <h2
            className={cn(
              "font-[family-name:var(--font-display)] text-lg font-medium",
              isDanger && "text-destructive",
            )}
          >
            {title}
          </h2>
          <p className="text-muted-foreground text-sm">{description}</p>
        </div>
      </div>

      {/* Section Content */}
      <div className="space-y-4">{children}</div>
    </section>
  );
}

// Theme option component
function ThemeOption({
  value,
  label,
  icon: Icon,
  currentTheme,
  onSelect,
}: {
  value: string;
  label: string;
  icon: React.ElementType;
  currentTheme: string | undefined;
  onSelect: (theme: string) => void;
}) {
  const isSelected = currentTheme === value;

  return (
    <button
      onClick={() => onSelect(value)}
      className={cn(
        "group relative flex flex-1 flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all",
        isSelected
          ? "border-primary bg-primary/5 shadow-sm"
          : "border-border hover:border-primary/50 hover:bg-muted/30",
      )}
    >
      <div
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-lg transition-colors",
          isSelected
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary",
        )}
      >
        <Icon className="h-6 w-6" />
      </div>
      <span
        className={cn(
          "text-sm font-medium",
          isSelected ? "text-primary" : "text-foreground",
        )}
      >
        {label}
      </span>
      {isSelected && (
        <div className="bg-primary absolute -top-1 -right-1 h-3 w-3 rounded-full border-2 border-white dark:border-gray-900" />
      )}
    </button>
  );
}

// Appearance settings card
function AppearanceCard() {
  const { theme, setTheme } = useTheme();

  // Use useSyncExternalStore to avoid hydration mismatch
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  if (!mounted) {
    return (
      <Card className="border-border/60">
        <CardContent className="p-6">
          <div className="flex gap-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-muted h-24 flex-1 animate-pulse rounded-xl"
              />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">Theme</CardTitle>
        <p className="text-muted-foreground text-sm">
          Choose how InsurFlow appears on your device
        </p>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="flex gap-3">
          <ThemeOption
            value="light"
            label="Light"
            icon={Sun}
            currentTheme={theme}
            onSelect={setTheme}
          />
          <ThemeOption
            value="dark"
            label="Dark"
            icon={Moon}
            currentTheme={theme}
            onSelect={setTheme}
          />
          <ThemeOption
            value="system"
            label="System"
            icon={Monitor}
            currentTheme={theme}
            onSelect={setTheme}
          />
        </div>
      </CardContent>
    </Card>
  );
}

// Signed out state
function SignedOutView() {
  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center p-4">
      <Card className="border-border/60 w-full max-w-sm text-center">
        <CardHeader>
          <div className="bg-primary/10 mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full">
            <User className="text-primary h-6 w-6" />
          </div>
          <CardTitle className="font-[family-name:var(--font-display)] text-xl font-medium">
            Sign in Required
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4 text-sm">
            Please sign in to access your account settings.
          </p>
          <Button asChild>
            <Link href="/auth/sign-in">Sign In</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// Main settings page
export default function SettingsPage() {
  // Custom classNames for Better Auth UI cards to match our design
  const settingsCardsClassNames = {
    card: {
      base: "border-border/60 shadow-sm",
    },
  };
  const deleteCardClassNames = {
    base: "border-border/60 shadow-sm",
  };

  return (
    <>
      <SignedOut>
        <SignedOutView />
      </SignedOut>

      <SignedIn>
        <div className="min-h-[calc(100vh-3.5rem)]">
          <div className="container mx-auto max-w-3xl px-4 py-8">
            {/* Page Header */}
            <div className="mb-8">
              <div className="mb-4 flex items-center gap-2">
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
              <h1 className="font-[family-name:var(--font-display)] text-2xl font-medium tracking-tight md:text-3xl">
                Settings
              </h1>
              <p className="text-muted-foreground mt-1 text-sm">
                Manage your account, security, and preferences
              </p>
            </div>

            {/* Settings Sections */}
            <div className="space-y-12">
              {/* Profile Section */}
              <SettingsSection
                id="profile"
                icon={User}
                title="Profile"
                description="Your personal information and how others see you"
              >
                <AccountSettingsCards classNames={settingsCardsClassNames} />
              </SettingsSection>

              {/* Security Section */}
              <SettingsSection
                id="security"
                icon={Shield}
                title="Security"
                description="Protect your account with password and session management"
              >
                <SecuritySettingsCards classNames={settingsCardsClassNames} />
              </SettingsSection>

              {/* Appearance Section */}
              <SettingsSection
                id="appearance"
                icon={Palette}
                title="Appearance"
                description="Customize how InsurFlow looks on your device"
              >
                <AppearanceCard />
              </SettingsSection>

              {/* Danger Zone */}
              <SettingsSection
                id="danger"
                icon={AlertTriangle}
                title="Danger Zone"
                description="Irreversible actions that affect your account"
                variant="danger"
              >
                <DeleteAccountCard classNames={deleteCardClassNames} />
              </SettingsSection>

              {/* Billing Section - Commented out until Stripe integration
              <SettingsSection
                id="billing"
                icon={CreditCard}
                title="Billing"
                description="Manage your subscription and payment methods"
              >
                <Card className="border-border/60">
                  <CardContent className="p-6">
                    <p className="text-muted-foreground text-sm">
                      Billing management coming soon.
                    </p>
                  </CardContent>
                </Card>
              </SettingsSection>
              */}
            </div>

            {/* Footer spacing */}
            <div className="h-12" />
          </div>
        </div>
      </SignedIn>
    </>
  );
}
