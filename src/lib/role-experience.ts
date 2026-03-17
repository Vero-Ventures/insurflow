import {
  APPLY_ESTIMATE_ROUTE,
  APPLY_INTAKE_ROUTE,
  APPLY_REVIEW_ROUTE,
} from "@/lib/app-routes";

export type AccountType = "client" | "advisor";

type AccountTypeConfirmation = {
  title: string;
  description: string;
  tone: "client" | "advisor";
};

type DashboardCard = {
  title: string;
  description: string;
  href: string;
  ctaLabel: string;
  icon: "clipboard" | "chart" | "handoff";
};

type DashboardExperience = {
  eyebrow: string;
  heading: string;
  description: string;
  cards: [DashboardCard, DashboardCard, DashboardCard];
};

export function normalizeAccountType(
  value: string | null | undefined,
): AccountType | null {
  if (value === "advisor") return "advisor";
  if (value === "client") return "client";
  return null;
}

export function resolveOnboardingAccountType({
  profileAccountType,
  roleIntent,
}: {
  profileAccountType: string | null | undefined;
  roleIntent: string | null | undefined;
}): AccountType | undefined {
  const persistedRole = normalizeAccountType(profileAccountType);
  if (persistedRole) return persistedRole;

  const intentAccountType = normalizeAccountType(roleIntent);
  if (intentAccountType === "client") return "client";

  return undefined;
}

export function getDashboardExperience(
  accountType: AccountType,
): DashboardExperience {
  return {
    eyebrow: accountType === "advisor" ? "My Application" : "My Application",
    heading:
      accountType === "advisor"
        ? "Continue the consumer application journey"
        : "Keep going with your application",
    description:
      accountType === "advisor"
        ? "InsurFlow is now focused on Canadian term life shoppers. Continue with the estimate, compare provider fit, and submit when ready."
        : "Pick up where you left off, review your estimate, compare provider fit, and submit when you are ready.",
    cards: [
      {
        title: "Continue your application",
        description: "Return to your latest draft and keep moving forward.",
        href: APPLY_REVIEW_ROUTE,
        ctaLabel: "Open review",
        icon: "clipboard",
      },
      {
        title: "Update your estimate",
        description: "Change your details and refresh your estimate preview.",
        href: APPLY_ESTIMATE_ROUTE,
        ctaLabel: "View estimate",
        icon: "chart",
      },
      {
        title: "Start a new application",
        description: "Start over if your household details have changed.",
        href: APPLY_INTAKE_ROUTE,
        ctaLabel: "Start intake",
        icon: "handoff",
      },
    ],
  };
}

export function getAccountTypeConfirmation(
  accountType: string | null | undefined,
): AccountTypeConfirmation | null {
  const normalizedAccountType = normalizeAccountType(accountType);

  if (
    normalizedAccountType === "advisor" ||
    normalizedAccountType === "client"
  ) {
    return {
      title: "Consumer account selected",
      description:
        "You will see an application dashboard with intake, estimate, provider-matching, and submission guidance.",
      tone: "client",
    };
  }

  return null;
}
