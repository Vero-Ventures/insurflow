import type { APIRequestContext, Page } from "@playwright/test";
import { randomBytes } from "node:crypto";

export interface TestAuthContext {
  authCookie: string;
  email: string;
  password: string;
}

/**
 * Creates a new authenticated test user
 */
export async function createAuthenticatedUser(
  request: APIRequestContext,
  namePrefix: string = "Test User",
): Promise<TestAuthContext> {
  const password = `Test${randomBytes(8).toString("base64url")}${Date.now()}!`;
  const email = `test-${Date.now()}-${randomBytes(4).toString("hex")}@example.com`;

  // Sign up
  const signUpResponse = await request.post(
    "http://localhost:3000/api/auth/sign-up/email",
    {
      headers: {
        "Content-Type": "application/json",
        Origin: "http://localhost:3000",
      },
      data: {
        email,
        password,
        name: namePrefix,
      },
    },
  );

  if (!signUpResponse.ok()) {
    const errorText = await signUpResponse.text();
    console.error("Sign up failed:", errorText);
    throw new Error(`Sign up failed: ${errorText}`);
  }

  // Sign in
  const signInResponse = await request.post(
    "http://localhost:3000/api/auth/sign-in/email",
    {
      headers: {
        "Content-Type": "application/json",
        Origin: "http://localhost:3000",
      },
      data: {
        email,
        password,
      },
    },
  );

  if (!signInResponse.ok()) {
    const errorText = await signInResponse.text();
    console.error("Sign in failed:", errorText);
    throw new Error(`Sign in failed: ${errorText}`);
  }

  const cookies = signInResponse.headers()["set-cookie"];
  if (!cookies) {
    throw new Error("No auth cookie received");
  }

  return {
    authCookie: cookies,
    email,
    password,
  };
}

/**
 * Sets authentication context in a Playwright page by adding cookies
 */
export async function setAuthContext(
  page: Page,
  authCookie: string,
): Promise<void> {
  const cookieParts = authCookie.split(";")[0]?.split("=");
  if (cookieParts && cookieParts.length >= 2) {
    await page.context().addCookies([
      {
        name: cookieParts[0]!,
        value: cookieParts.slice(1).join("="),
        domain: "localhost",
        path: "/",
      },
    ]);
  }
}
