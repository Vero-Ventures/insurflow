import { expect, test, type APIRequestContext } from "@playwright/test";
import { randomBytes } from "node:crypto";

/** Base URL from environment or default */
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

/** Origin extracted from BASE_URL for use in Origin headers */
const BASE_ORIGIN = new URL(BASE_URL).origin;

/** Session cookie name used by Better Auth */
const SESSION_COOKIE_NAME = "better-auth.session_token";

/**
 * Extract session cookie from sign-in response headers.
 * Uses headersArray() to handle multiple Set-Cookie headers correctly.
 */
function extractSessionCookie(
  headers: Array<{ name: string; value: string }>,
): string {
  const sessionCookieHeader = headers.find(
    (h) =>
      h.name.toLowerCase() === "set-cookie" &&
      h.value.startsWith(`${SESSION_COOKIE_NAME}=`),
  );

  if (!sessionCookieHeader) {
    throw new Error(
      `Session cookie '${SESSION_COOKIE_NAME}' not found in response`,
    );
  }

  // Extract only "name=value" portion, stripping attributes like Path, HttpOnly, etc.
  const nameValue = sessionCookieHeader.value.split(";")[0];
  if (!nameValue) {
    throw new Error("Invalid session cookie: no value found");
  }

  return nameValue;
}

/** Response shape returned by createTestClient helper */
interface TestClientResult {
  status: number;
  body: { client?: { id: string }; error?: string };
}

test.describe("Client CRUD API", () => {
  let authCookie: string;
  let clientId: string;
  let testPassword: string;
  // Track created clients for cleanup
  const createdClientIds: string[] = [];

  /**
   * Helper function to create a test client.
   * Tracks created clients for cleanup and returns a consistent response shape.
   */
  async function createTestClient(
    request: APIRequestContext,
    data: {
      firstName: string;
      lastName: string;
      dateOfBirth: string;
      sex: "M" | "F";
      state: string;
    },
  ): Promise<TestClientResult> {
    const response = await request.post("/api/clients", {
      headers: {
        Cookie: authCookie,
      },
      data,
    });
    const body = await response.json();
    // Track created client for cleanup
    if (response.ok() && body.client?.id) {
      createdClientIds.push(body.client.id);
    }
    return { status: response.status(), body };
  }

  test.beforeAll(async ({ request }) => {
    // Generate a random password for this test run
    testPassword = `Test${randomBytes(8).toString("base64url")}${Date.now()}!`;

    // Create a test user with unique email (include random string to avoid collisions)
    const email = `test-${Date.now()}-${randomBytes(4).toString("hex")}@example.com`;
    const password = testPassword;

    // Sign up using Better Auth endpoint
    const signUpResponse = await request.post("/api/auth/sign-up/email", {
      headers: {
        "Content-Type": "application/json",
        Origin: BASE_ORIGIN,
      },
      data: {
        email,
        password,
        name: "Test User",
      },
    });

    if (!signUpResponse.ok()) {
      const errorText = await signUpResponse.text();
      throw new Error(
        `Sign up failed: ${signUpResponse.status()} - ${errorText}`,
      );
    }

    // Sign in to get session cookie using Better Auth endpoint
    const signInResponse = await request.post("/api/auth/sign-in/email", {
      headers: {
        "Content-Type": "application/json",
        Origin: BASE_ORIGIN,
      },
      data: {
        email,
        password,
      },
    });

    if (!signInResponse.ok()) {
      const errorText = await signInResponse.text();
      throw new Error(
        `Sign in failed: ${signInResponse.status()} - ${errorText}`,
      );
    }

    // Extract session cookie using headersArray() for reliable multi-cookie handling
    authCookie = extractSessionCookie(signInResponse.headersArray());
  });

  // Cleanup: Delete all created clients after tests complete
  test.afterAll(async ({ request }) => {
    for (const id of createdClientIds) {
      try {
        const response = await request.delete(`/api/clients/${id}`, {
          headers: {
            Cookie: authCookie,
          },
        });
        if (!response.ok()) {
          console.warn(
            `Cleanup: Failed to delete client ${id}: ${response.status()}`,
          );
        }
      } catch (error) {
        // Network errors during cleanup - log but don't fail
        console.warn(`Cleanup: Error deleting client ${id}:`, error);
      }
    }
  });

  // Sequential tests that depend on shared state
  test.describe.serial("Sequential CRUD Operations", () => {
    test("POST /api/clients - should create a new client", async ({
      request,
    }) => {
      const response = await request.post("/api/clients", {
        headers: {
          Cookie: authCookie,
        },
        data: {
          firstName: "John",
          lastName: "Doe",
          dateOfBirth: "1980-01-15",
          sex: "M",
          state: "CA",
          smoker: false,
          healthRating: "standard",
          hasSpouse: true,
          spouseAge: 35,
          clientIncome: "75000.00",
          spouseIncome: "50000.00",
          incomeReplacementPercent: "70",
          replacementDurationYears: 10,
          existingLifeInsuranceCoverage: "100000.00",
          status: "draft",
        },
      });

      expect(response.status()).toBe(201);
      const body = await response.json();
      expect(body.client).toBeDefined();
      expect(body.client.firstName).toBe("John");
      expect(body.client.lastName).toBe("Doe");
      clientId = body.client.id;
      // Track for cleanup in case serial tests fail before DELETE
      createdClientIds.push(clientId);
    });

    test("GET /api/clients - should list all clients for authenticated user", async ({
      request,
    }) => {
      const response = await request.get("/api/clients", {
        headers: {
          Cookie: authCookie,
        },
      });

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.clients).toBeDefined();
      expect(Array.isArray(body.clients)).toBe(true);
      expect(body.clients.length).toBeGreaterThan(0);
      // Verify pagination metadata is present
      expect(body.pagination).toBeDefined();
      expect(body.pagination.page).toBe(1);
      expect(body.pagination.total).toBeGreaterThan(0);
    });

    test("GET /api/clients/[id] - should get a specific client", async ({
      request,
    }) => {
      const response = await request.get(`/api/clients/${clientId}`, {
        headers: {
          Cookie: authCookie,
        },
      });

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.client).toBeDefined();
      expect(body.client.id).toBe(clientId);
      expect(body.client.firstName).toBe("John");
    });

    test("PATCH /api/clients/[id] - should update a client", async ({
      request,
    }) => {
      const response = await request.patch(`/api/clients/${clientId}`, {
        headers: {
          Cookie: authCookie,
        },
        data: {
          firstName: "Jonathan",
          clientIncome: "80000.00",
          status: "active",
        },
      });

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.client).toBeDefined();
      expect(body.client.firstName).toBe("Jonathan");
      expect(body.client.clientIncome).toBe("80000.00");
      expect(body.client.status).toBe("active");
    });

    test("DELETE /api/clients/[id] - should soft delete a client", async ({
      request,
    }) => {
      const response = await request.delete(`/api/clients/${clientId}`, {
        headers: {
          Cookie: authCookie,
        },
      });

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.message).toBe("Client deleted successfully");

      // Verify client is no longer accessible
      const getResponse = await request.get(`/api/clients/${clientId}`, {
        headers: {
          Cookie: authCookie,
        },
      });
      expect(getResponse.status()).toBe(404);
    });
  });

  // Independent tests that can run in parallel
  test("POST /api/clients - should fail without authentication", async ({
    request,
  }) => {
    const response = await request.post("/api/clients", {
      data: {
        firstName: "Jane",
        lastName: "Smith",
        dateOfBirth: "1990-05-20",
        sex: "F",
        state: "NY",
      },
    });

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  test("POST /api/clients - should fail with invalid data", async ({
    request,
  }) => {
    const response = await request.post("/api/clients", {
      headers: {
        Cookie: authCookie,
      },
      data: {
        firstName: "", // Invalid: empty string
        lastName: "Doe",
        dateOfBirth: "invalid-date", // Invalid format
        sex: "M",
        state: "TX",
      },
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Validation failed");
    expect(body.details).toBeDefined();
  });

  test("GET /api/clients - should fail without authentication", async ({
    request,
  }) => {
    const response = await request.get("/api/clients");

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  test("GET /api/clients - should support pagination parameters", async ({
    request,
  }) => {
    const response = await request.get("/api/clients?page=1&limit=5", {
      headers: {
        Cookie: authCookie,
      },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.pagination).toBeDefined();
    expect(body.pagination.page).toBe(1);
    expect(body.pagination.limit).toBe(5);
  });

  test("GET /api/clients/[id] - should return 404 for non-existent client", async ({
    request,
  }) => {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const response = await request.get(`/api/clients/${fakeId}`, {
      headers: {
        Cookie: authCookie,
      },
    });

    expect(response.status()).toBe(404);
    const body = await response.json();
    expect(body.error).toBe("Client not found");
  });

  test("PATCH /api/clients/[id] - should fail with invalid data", async ({
    request,
  }) => {
    // Create a client first
    const { body: createBody } = await createTestClient(request, {
      firstName: "Test",
      lastName: "Validation",
      dateOfBirth: "1985-03-10",
      sex: "F",
      state: "FL",
    });
    const { client } = createBody;

    const response = await request.patch(`/api/clients/${client!.id}`, {
      headers: {
        Cookie: authCookie,
      },
      data: {
        dateOfBirth: "invalid-date",
      },
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Validation failed");
  });

  test("PATCH /api/clients/[id] - should fail without authentication", async ({
    request,
  }) => {
    // Create a client first
    const { body: createBody } = await createTestClient(request, {
      firstName: "Test",
      lastName: "Auth",
      dateOfBirth: "1985-03-10",
      sex: "M",
      state: "WA",
    });
    const { client } = createBody;

    const response = await request.patch(`/api/clients/${client!.id}`, {
      data: {
        firstName: "Hacker",
      },
    });

    expect(response.status()).toBe(401);
  });

  test("DELETE /api/clients/[id] - should fail without authentication", async ({
    request,
  }) => {
    // Create a new client first
    const { body: createBody } = await createTestClient(request, {
      firstName: "Test",
      lastName: "Delete",
      dateOfBirth: "1985-03-10",
      sex: "F",
      state: "FL",
    });
    const { client } = createBody;

    const response = await request.delete(`/api/clients/${client!.id}`);

    expect(response.status()).toBe(401);
  });
});
