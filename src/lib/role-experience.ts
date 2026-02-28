import {
  ADVISOR_WORKSPACE_ROUTE,
  CLIENT_INTAKE_START_ROUTE,
  USER_PROFILE_ROUTE,
  USER_SETTINGS_ROUTE,
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
  icon: "clipboard" | "chart" | "handoff" | "users";
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

  const hintedRole = normalizeAccountType(roleIntent);
  if (hintedRole) return hintedRole;

  return undefined;
}

export function getDashboardExperience(
  accountType: AccountType,
): DashboardExperience {
  if (accountType === "advisor") {
    return {
      eyebrow: "Advisor Workspace",
      heading: "Open your advisor workspace",
      description:
        "Open your client workspace, run real estimates, and generate reports clients can take away from each meeting.",
      cards: [
        {
          title: "Open Client Workspace",
          description:
            "Jump into your clients list and continue active planning cases.",
          href: ADVISOR_WORKSPACE_ROUTE,
          ctaLabel: "Open Clients",
          icon: "users",
        },
        {
          title: "Start Client Intake",
          description:
            "Create a new client record and capture the intake details used for production calculations.",
          href: CLIENT_INTAKE_START_ROUTE,
          ctaLabel: "Start Intake",
          icon: "clipboard",
        },
        {
          title: "Estimate and Share Report",
          description:
            "Open client analyses, review insurance recommendations, and download a shareable report.",
          href: ADVISOR_WORKSPACE_ROUTE,
          ctaLabel: "Open Reports",
          icon: "handoff",
        },
      ],
    };
  }

  return {
    eyebrow: "Your Planning Dashboard",
    heading: "Manage your production account",
    description:
      "Keep your profile and preferences current so advisors can deliver accurate recommendations and follow-ups.",
    cards: [
      {
        title: "Review Profile",
        description:
          "Verify your account details and contact information before your next planning conversation.",
        href: USER_PROFILE_ROUTE,
        ctaLabel: "Open Profile",
        icon: "clipboard",
      },
      {
        title: "Update Settings",
        description:
          "Adjust account preferences, security controls, and communication settings.",
        href: USER_SETTINGS_ROUTE,
        ctaLabel: "Open Settings",
        icon: "chart",
      },
      {
        title: "Security and Privacy",
        description:
          "Review account protection settings and keep your access secure.",
        href: `${USER_SETTINGS_ROUTE}#security`,
        ctaLabel: "Review Security",
        icon: "handoff",
      },
    ],
  };
}

export function getAccountTypeConfirmation(
  accountType: string | null | undefined,
): AccountTypeConfirmation | null {
  const normalizedAccountType = normalizeAccountType(accountType);

  if (normalizedAccountType === "advisor") {
    return {
      title: "Advisor account selected",
      description:
        "You will see advisor workflow cards and client workspace access after onboarding.",
      tone: "advisor",
    };
  }

  if (normalizedAccountType === "client") {
    return {
      title: "Client account selected",
      description:
        "You will see a client-focused dashboard with intake, estimate, and handoff guidance.",
      tone: "client",
    };
  }

  return null;
}
