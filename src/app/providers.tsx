"use client";

import { AuthUIProvider } from "@daveyplate/better-auth-ui";
import { ThemeProvider } from "next-themes";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { type ReactNode, useCallback } from "react";
import type { SocialProvider } from "better-auth/social-providers";

import { authClient } from "@/server/better-auth/client";

type ProvidersProps = {
  children: ReactNode;
  socialProviderIds: SocialProvider[];
};

export function Providers({ children, socialProviderIds }: ProvidersProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleSessionChange = useCallback(() => {
    // Skip refresh on /onboarding to prevent infinite reload loop.
    // The onSessionChange callback fires on every session observation,
    // and router.refresh() triggers re-observation, causing a loop.
    if (pathname === "/onboarding") {
      return;
    }

    router.refresh();
  }, [pathname, router]);

  return (
    <ThemeProvider attribute="class" defaultTheme="light">
      <AuthUIProvider
        authClient={authClient}
        redirectTo="/onboarding"
        navigate={router.push}
        replace={router.replace}
        onSessionChange={handleSessionChange}
        Link={Link}
        credentials={{
          forgotPassword: true,
        }}
        social={
          socialProviderIds.length > 0
            ? { providers: socialProviderIds }
            : undefined
        }
      >
        {children}
      </AuthUIProvider>
    </ThemeProvider>
  );
}
