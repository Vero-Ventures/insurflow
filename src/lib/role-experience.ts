import {
  APPLY_ESTIMATE_ROUTE,
  APPLY_INTAKE_ROUTE,
  APPLY_REVIEW_ROUTE,
  ADVISOR_WORKSPACE_ROUTE,
  CLIENT_INTAKE_START_ROUTE,
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

  if (roleIntent === "client") return "client";

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
    eyebrow: "My Application",
    heading: "Track and continue your application",
    description:
      "Resume your intake, review your estimate preview, and submit your application when you are ready.",
    cards: [
      {
        title: "Continue Application",
        description:
          "Pick up where you left off and review the latest application details.",
        href: APPLY_REVIEW_ROUTE,
        ctaLabel: "Open Review",
        icon: "clipboard",
      },
      {
        title: "Update Estimate",
        description:
          "Adjust your intake details and refresh your estimate preview.",
        href: APPLY_ESTIMATE_ROUTE,
        ctaLabel: "View Estimate",
        icon: "chart",
      },
      {
        title: "Start New Intake",
        description:
          "Start over with a new intake if your household details changed.",
        href: APPLY_INTAKE_ROUTE,
        ctaLabel: "Start Intake",
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
        "You will see an application-focused dashboard with intake, estimate preview, and submission guidance.",
      tone: "client",
    };
  }

  return null;
}
