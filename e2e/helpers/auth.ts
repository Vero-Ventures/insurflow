import type { Page, APIRequestContext } from "@playwright/test";
import { randomBytes } from "node:crypto";

const BASE_URL = "http://localhost:3000";

/**
 * Test credentials returned from signUpAndSignIn
 */
export interface TestCredentials {
  email: string;
  password: string;
  authCookie: string;
}

/**
 * Helper to set auth cookie in browser context
 *
 * @param page - Playwright Page object
 * @param authCookie - The auth cookie string from sign-in response
 */
export async function setAuthContext(
  page: Page,
  authCookie: string,
): Promise<void> {
  if (authCookie) {
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
}

/**
 * Generate unique test credentials
 *
 * @param prefix - Optional prefix for the email (e.g., "test-detail")
 * @returns Object with unique email and password
 */
export function generateTestCredentials(prefix = "test"): {
  email: string;
  password: string;
} {
  return {
    email: `${prefix}-${Date.now()}-${randomBytes(4).toString("hex")}@example.com`,
    password: `Test${randomBytes(8).toString("base64url")}${Date.now()}!`,
  };
}

/**
 * Sign up and sign in a test user
 *
 * @param request - Playwright APIRequestContext
 * @param options - Options for sign up (email, password, name)
 * @returns Auth cookie string
 * @throws Error if sign up or sign in fails
 */
export async function signUpAndSignIn(
  request: APIRequestContext,
  options: {
    email: string;
    password: string;
    name?: string;
  },
): Promise<string> {
  const { email, password, name = "Test User" } = options;

  // Sign up using Better Auth endpoint
  const signUpResponse = await request.post(
    `${BASE_URL}/api/auth/sign-up/email`,
    {
      headers: {
        "Content-Type": "application/json",
        Origin: BASE_URL,
      },
      data: {
        email,
        password,
        name,
      },
    },
  );

  if (!signUpResponse.ok()) {
    const errorText = await signUpResponse.text();
    throw new Error(`Sign up failed: ${errorText}`);
  }

  // Sign in to get session cookie
  const signInResponse = await request.post(
    `${BASE_URL}/api/auth/sign-in/email`,
    {
      headers: {
        "Content-Type": "application/json",
        Origin: BASE_URL,
      },
      data: {
        email,
        password,
      },
    },
  );

  if (!signInResponse.ok()) {
    const errorText = await signInResponse.text();
    throw new Error(`Sign in failed: ${errorText}`);
  }

  const cookies = signInResponse.headers()["set-cookie"];
  if (!cookies) {
    throw new Error("No auth cookie received from sign-in response");
  }

  return cookies;
}

/**
 * Clean up created clients after tests
 *
 * @param request - Playwright APIRequestContext
 * @param authCookie - Auth cookie for authorization
 * @param clientIds - Array of client IDs to delete
 */
export async function cleanupClients(
  request: APIRequestContext,
  authCookie: string,
  clientIds: string[],
): Promise<void> {
  for (const id of clientIds) {
    try {
      await request.delete(`${BASE_URL}/api/clients/${id}`, {
        headers: {
          Cookie: authCookie,
        },
      });
    } catch {
      // Ignore cleanup errors (client may already be deleted)
    }
  }
}

/**
 * Create a test client via API
 *
 * @param request - Playwright APIRequestContext
 * @param authCookie - Auth cookie for authorization
 * @param data - Client data to create
 * @returns Created client ID
 */
export async function createTestClient(
  request: APIRequestContext,
  authCookie: string,
  data: {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    sex: "M" | "F";
    state: string;
    smoker?: boolean;
    healthRating?: string;
    hasSpouse?: boolean;
    clientIncome?: string;
    incomeReplacementPercent?: string;
    replacementDurationYears?: number;
    existingLifeInsuranceCoverage?: string;
    status?: string;
  },
): Promise<string> {
  const response = await request.post(`${BASE_URL}/api/clients`, {
    headers: {
      Cookie: authCookie,
      "Content-Type": "application/json",
    },
    data: {
      smoker: false,
      healthRating: "preferred",
      hasSpouse: false,
      status: "draft",
      ...data,
    },
  });

  if (!response.ok()) {
    const errorText = await response.text();
    throw new Error(`Failed to create test client: ${errorText}`);
  }

  const clientData = await response.json();
  return clientData.client.id;
}
