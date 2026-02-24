"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Settings, Sun, Moon, Menu, X, LayoutDashboard } from "lucide-react";
import { SignedIn, SignedOut } from "@daveyplate/better-auth-ui";
import { useTheme } from "next-themes";

import { cn } from "@/lib/utils";
import { AUTHENTICATED_HOME_ROUTE } from "@/lib/app-routes";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { authClient } from "@/server/better-auth/client";

const navItems = [
  {
    title: "Dashboard",
    href: AUTHENTICATED_HOME_ROUTE,
    icon: LayoutDashboard,
  },
];

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

export function AppNavigationMenu() {
  const pathname = usePathname();
  const { data: session } = authClient.useSession();
  const user = session?.user;
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Close mobile menu on route change
  React.useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  return (
    <header className="border-border/40 bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-0 z-50 w-full border-b backdrop-blur-sm">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        {/* Logo / Brand */}
        <div className="flex items-center gap-8">
          <Link href="/" className="group flex items-center gap-2.5">
            <Image
              src="/insurflow-logo-no-bg.png"
              alt="InsurFlow"
              width={32}
              height={32}
              className="h-8 w-8 transition-transform duration-200 group-hover:scale-105"
              quality={90}
              priority
            />
            <span className="text-foreground font-display text-lg font-normal tracking-tight">
              InsurFlow
            </span>
          </Link>

          {/* Navigation Links - Desktop */}
          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.title}
                  href={item.href}
                  className={cn(
                    "group relative flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <item.icon
                    className={cn(
                      "h-4 w-4 transition-colors",
                      isActive
                        ? "text-primary"
                        : "text-muted-foreground group-hover:text-foreground",
                    )}
                  />
                  {item.title}
                  {isActive && (
                    <span className="bg-primary absolute right-3 bottom-0 left-3 h-0.5 rounded-full" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right side - Theme toggle & Auth */}
        <div className="flex items-center gap-2">
          {/* Theme toggle */}
          {mounted && resolvedTheme && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() =>
                setTheme(resolvedTheme === "dark" ? "light" : "dark")
              }
              className="text-muted-foreground hover:text-foreground h-9 w-9"
              aria-label={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`}
            >
              {resolvedTheme === "dark" ? (
                <Sun className="h-[18px] w-[18px]" />
              ) : (
                <Moon className="h-[18px] w-[18px]" />
              )}
            </Button>
          )}

          <SignedIn>
            {/* Settings */}
            <Link
              href="/settings"
              className={cn(
                "text-muted-foreground hover:bg-muted hover:text-foreground hidden rounded-lg p-2 transition-colors sm:block",
                pathname === "/settings" && "bg-muted text-foreground",
              )}
              aria-label="Settings"
            >
              <Settings className="h-[18px] w-[18px]" />
            </Link>

            {/* Profile Avatar */}
            <Link href="/profile" aria-label="Profile" className="ml-1">
              <Avatar className="hover:ring-primary/20 h-8 w-8 cursor-pointer ring-2 ring-transparent transition-all">
                <AvatarImage
                  src={user?.image ?? undefined}
                  alt={user?.name ?? "Profile"}
                />
                <AvatarFallback className="from-primary to-emerald bg-gradient-to-br text-xs font-medium text-white">
                  {getInitials(user?.name)}
                </AvatarFallback>
              </Avatar>
            </Link>

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="icon"
              className="ml-1 h-9 w-9 md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </SignedIn>

          <SignedOut>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="hidden sm:flex"
            >
              <Link href="/auth/sign-in">Sign in</Link>
            </Button>
            <Button
              asChild
              size="sm"
              className="from-primary hover:from-primary/90 bg-gradient-to-r to-[oklch(0.45_0.10_230)] hover:to-[oklch(0.45_0.10_230)]/90"
            >
              <Link href="/auth/sign-up">Get Started</Link>
            </Button>
          </SignedOut>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {mobileMenuOpen && (
        <div className="border-border/40 bg-background border-t md:hidden">
          <nav className="container mx-auto flex flex-col gap-1 px-4 py-3">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.title}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.title}
                </Link>
              );
            })}
            <Link
              href="/settings"
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                pathname === "/settings"
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Settings className="h-4 w-4" />
              Settings
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
