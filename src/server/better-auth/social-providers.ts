import type { BetterAuthOptions } from "better-auth";

export type OAuthEnv = {
  BETTER_AUTH_GITHUB_CLIENT_ID?: string;
  BETTER_AUTH_GITHUB_CLIENT_SECRET?: string;
  BETTER_AUTH_GOOGLE_CLIENT_ID?: string;
  BETTER_AUTH_GOOGLE_CLIENT_SECRET?: string;
};

type GoogleProfileLike = {
  name?: string | null;
  given_name?: string | null;
  family_name?: string | null;
  email?: string | null;
  email_verified?: boolean;
};

function buildGoogleDisplayName(profile: GoogleProfileLike): string {
  const fullName = profile.name?.trim();
  if (fullName) {
    return fullName;
  }

  const givenName = profile.given_name?.trim() ?? "";
  const familyName = profile.family_name?.trim() ?? "";
  const combinedName = `${givenName} ${familyName}`.trim();

  if (combinedName) {
    return combinedName;
  }

  const emailLocalPart = profile.email?.split("@")[0]?.trim();
  if (emailLocalPart) {
    return emailLocalPart;
  }

  return "User";
}

export function buildSocialProviders(
  env: OAuthEnv,
): BetterAuthOptions["socialProviders"] {
  const socialProviders: NonNullable<BetterAuthOptions["socialProviders"]> = {};

  if (
    env.BETTER_AUTH_GITHUB_CLIENT_ID &&
    env.BETTER_AUTH_GITHUB_CLIENT_SECRET
  ) {
    socialProviders.github = {
      clientId: env.BETTER_AUTH_GITHUB_CLIENT_ID,
      clientSecret: env.BETTER_AUTH_GITHUB_CLIENT_SECRET,
    };
  }

  if (
    env.BETTER_AUTH_GOOGLE_CLIENT_ID &&
    env.BETTER_AUTH_GOOGLE_CLIENT_SECRET
  ) {
    socialProviders.google = {
      clientId: env.BETTER_AUTH_GOOGLE_CLIENT_ID,
      clientSecret: env.BETTER_AUTH_GOOGLE_CLIENT_SECRET,
      mapProfileToUser: async (profile: GoogleProfileLike) => ({
        name: buildGoogleDisplayName(profile),
        emailVerified: Boolean(profile.email_verified),
      }),
    };
  }

  return Object.keys(socialProviders).length > 0 ? socialProviders : undefined;
}

export function getDefaultSocialProviderIds(env: OAuthEnv): Array<string> {
  const ids: string[] = [];

  if (env.BETTER_AUTH_GITHUB_CLIENT_ID && env.BETTER_AUTH_GITHUB_CLIENT_SECRET) {
    ids.push("github");
  }

  if (env.BETTER_AUTH_GOOGLE_CLIENT_ID && env.BETTER_AUTH_GOOGLE_CLIENT_SECRET) {
    ids.push("google");
  }

  return ids;
}
