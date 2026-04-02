import { describe, expect, it } from "vitest";

import {
  buildSocialProviders,
  getDefaultSocialProviderIds,
  type OAuthEnv,
} from "@/server/better-auth/social-providers";
import {
  getEmailAndPasswordOptions,
  getUserOptions,
} from "@/server/better-auth/config";

describe("better-auth social provider configuration", () => {
  it("configures password reset options for email/password auth", () => {
    const options = getEmailAndPasswordOptions();

    expect(options.enabled).toBe(true);
    expect(options.resetPasswordTokenExpiresIn).toBe(60 * 60);
    expect(options.revokeSessionsOnPasswordReset).toBe(true);
    expect(options.sendResetPassword).toBeTypeOf("function");
  });

  it("enables delete-user endpoint in auth config", () => {
    const options = getUserOptions();

    expect(options?.deleteUser?.enabled).toBe(true);
  });

  it("returns undefined when no social env vars are set", () => {
    const env: OAuthEnv = {
      BETTER_AUTH_GITHUB_CLIENT_ID: undefined,
      BETTER_AUTH_GITHUB_CLIENT_SECRET: undefined,
      BETTER_AUTH_GOOGLE_CLIENT_ID: undefined,
      BETTER_AUTH_GOOGLE_CLIENT_SECRET: undefined,
    };

    expect(buildSocialProviders(env)).toBeUndefined();
  });

  it("includes both github and google when both are configured", () => {
    const env: OAuthEnv = {
      BETTER_AUTH_GITHUB_CLIENT_ID: "github-id",
      BETTER_AUTH_GITHUB_CLIENT_SECRET: "github-secret",
      BETTER_AUTH_GOOGLE_CLIENT_ID: "google-id",
      BETTER_AUTH_GOOGLE_CLIENT_SECRET: "google-secret",
    };

    const providers = buildSocialProviders(env);

    expect(providers).toBeDefined();
    expect(providers?.github).toMatchObject({
      clientId: "github-id",
      clientSecret: "github-secret",
    });
    expect(providers?.google).toMatchObject({
      clientId: "google-id",
      clientSecret: "google-secret",
    });
  });

  it("applies a fallback google display name when profile name is missing", async () => {
    const env: OAuthEnv = {
      BETTER_AUTH_GITHUB_CLIENT_ID: undefined,
      BETTER_AUTH_GITHUB_CLIENT_SECRET: undefined,
      BETTER_AUTH_GOOGLE_CLIENT_ID: "google-id",
      BETTER_AUTH_GOOGLE_CLIENT_SECRET: "google-secret",
    };

    const providers = buildSocialProviders(env);
    const googleProvider = providers?.google as
      | { mapProfileToUser?: (profile: unknown) => Promise<unknown> | unknown }
      | undefined;

    const mapped = await googleProvider?.mapProfileToUser?.({
      name: "",
      given_name: "Taylor",
      family_name: "Morgan",
      email: "taylor@example.com",
      email_verified: true,
    } as never);

    expect(mapped).toMatchObject({
      name: "Taylor Morgan",
      emailVerified: true,
    });
  });

  it("returns enabled social ids for configured providers", () => {
    const env: OAuthEnv = {
      BETTER_AUTH_GITHUB_CLIENT_ID: undefined,
      BETTER_AUTH_GITHUB_CLIENT_SECRET: undefined,
      BETTER_AUTH_GOOGLE_CLIENT_ID: "google-id",
      BETTER_AUTH_GOOGLE_CLIENT_SECRET: "google-secret",
    };

    expect(getDefaultSocialProviderIds(env)).toEqual(["google"]);
  });
});
