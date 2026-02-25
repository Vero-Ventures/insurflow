import {
  ADVISOR_WORKSPACE_ROUTE,
  DEMO_HANDOFF_ROUTE,
  DEMO_INTAKE_ROUTE,
  DEMO_SNAPSHOT_ROUTE,
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
        "Open your client workspace, guide live conversations, and keep intake momentum moving.",
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
          title: "Meeting Mode Snapshot",
          description:
            "Use one-screen estimate context for your next advisor-client conversation.",
          href: DEMO_SNAPSHOT_ROUTE,
          ctaLabel: "Open Snapshot",
          icon: "chart",
        },
        {
          title: "Handoff Readiness",
          description:
            "Prepare next actions and send clients a clear post-meeting handoff.",
          href: DEMO_HANDOFF_ROUTE,
          ctaLabel: "Prepare Handoff",
          icon: "handoff",
        },
      ],
    };
  }

  return {
    eyebrow: "Your Planning Dashboard",
    heading: "Pick up your client journey",
    description:
      "Start where you left off. Move from intake to estimate and finish with a clear advisor handoff.",
    cards: [
      {
        title: "Continue Intake",
        description:
          "Capture or update household details in a guided flow before running the estimate.",
        href: DEMO_INTAKE_ROUTE,
        ctaLabel: "Continue Intake",
        icon: "clipboard",
      },
      {
        title: "View Estimate Snapshot",
        description:
          "Review the current estimate and plain-language breakdown of what it means.",
        href: DEMO_SNAPSHOT_ROUTE,
        ctaLabel: "View Estimate Snapshot",
        icon: "chart",
      },
      {
        title: "Advisor Handoff",
        description:
          "Prepare the next conversation with one clear handoff step and recommended action.",
        href: DEMO_HANDOFF_ROUTE,
        ctaLabel: "Advisor Handoff",
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
