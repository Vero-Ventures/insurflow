import { describe, expect, it } from "vitest";

import {
  buildSocialProviders,
  getDefaultSocialProviderIds,
  type OAuthEnv,
} from "@/server/better-auth/social-providers";

describe("better-auth social provider configuration", () => {
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
    const mapped = await providers?.google?.mapProfileToUser?.({
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
