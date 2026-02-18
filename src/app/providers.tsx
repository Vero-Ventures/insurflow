"use client";

import { AuthUIProvider } from "@daveyplate/better-auth-ui";
import { ThemeProvider } from "next-themes";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import type { SocialProvider } from "better-auth/social-providers";

import { authClient } from "@/server/better-auth/client";

type ProvidersProps = {
  children: ReactNode;
  socialProviderIds: SocialProvider[];
};

export function Providers({ children, socialProviderIds }: ProvidersProps) {
  const router = useRouter();

  return (
    <ThemeProvider attribute="class" defaultTheme="light">
      <AuthUIProvider
        authClient={authClient}
        redirectTo="/onboarding"
        navigate={router.push}
        replace={router.replace}
        onSessionChange={() => {
          router.refresh();
        }}
        Link={Link}
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
