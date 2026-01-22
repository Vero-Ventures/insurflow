import { expect, test, type APIRequestContext } from "@playwright/test";

test.describe("Client CRUD API", () => {
  let authCookie: string;
  let clientId: string;
  let testPassword: string;

  // Helper function to create a test client
  async function createTestClient(
    request: APIRequestContext,
    data: {
      firstName: string;
      lastName: string;
      dateOfBirth: string;
      sex: "M" | "F";
      province: string;
    },
  ) {
    return request.post("http://localhost:3000/api/clients", {
      headers: {
        Cookie: authCookie,
      },
      data,
    });
  }

  test.beforeAll(async ({ request }) => {
    // Generate a random password for this test run
    testPassword = `Test${Math.random().toString(36).substring(2)}${Date.now()}!`;

    // Create a test user and authenticate
    const email = `test-${Date.now()}@example.com`;
    const password = testPassword;

    try {
      // Sign up using Better Auth endpoint
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
            name: "Test User",
          },
        },
      );

      if (!signUpResponse.ok()) {
        const errorText = await signUpResponse.text();
        console.error("Sign up failed:", errorText);
        throw new Error(`Sign up failed: ${errorText}`);
      }

      // Sign in to get session cookie using Better Auth endpoint
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
        console.error("Sign in failed:", await signInResponse.text());
      }

      const cookies = signInResponse.headers()["set-cookie"];
      if (cookies) {
        authCookie = cookies;
      }
    } catch (error) {
      console.error("Authentication setup failed:", error);
      throw error;
    }
  });

  // Sequential tests that depend on shared state
  test.describe.serial("Sequential CRUD Operations", () => {
    test("POST /api/clients - should create a new client", async ({
      request,
    }) => {
      const response = await request.post("http://localhost:3000/api/clients", {
        headers: {
          Cookie: authCookie,
        },
        data: {
          firstName: "John",
          lastName: "Doe",
          dateOfBirth: "1980-01-15",
          sex: "M",
          province: "ON",
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
    });

    test("GET /api/clients - should list all clients for authenticated user", async ({
      request,
    }) => {
      const response = await request.get("http://localhost:3000/api/clients", {
        headers: {
          Cookie: authCookie,
        },
      });

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.clients).toBeDefined();
      expect(Array.isArray(body.clients)).toBe(true);
      expect(body.clients.length).toBeGreaterThan(0);
    });

    test("GET /api/clients/[id] - should get a specific client", async ({
      request,
    }) => {
      const response = await request.get(
        `http://localhost:3000/api/clients/${clientId}`,
        {
          headers: {
            Cookie: authCookie,
          },
        },
      );

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.client).toBeDefined();
      expect(body.client.id).toBe(clientId);
      expect(body.client.firstName).toBe("John");
    });

    test("PATCH /api/clients/[id] - should update a client", async ({
      request,
    }) => {
      const response = await request.patch(
        `http://localhost:3000/api/clients/${clientId}`,
        {
          headers: {
            Cookie: authCookie,
          },
          data: {
            firstName: "Jonathan",
            clientIncome: "80000.00",
            status: "active",
          },
        },
      );

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
      const response = await request.delete(
        `http://localhost:3000/api/clients/${clientId}`,
        {
          headers: {
            Cookie: authCookie,
          },
        },
      );

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.message).toBe("Client deleted successfully");

      // Verify client is no longer accessible
      const getResponse = await request.get(
        `http://localhost:3000/api/clients/${clientId}`,
        {
          headers: {
            Cookie: authCookie,
          },
        },
      );
      expect(getResponse.status()).toBe(404);
    });
  });

  // Independent tests that can run in parallel
  test("POST /api/clients - should fail without authentication", async ({
    request,
  }) => {
    const response = await request.post("http://localhost:3000/api/clients", {
      data: {
        firstName: "Jane",
        lastName: "Smith",
        dateOfBirth: "1990-05-20",
        sex: "F",
        province: "BC",
      },
    });

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  test("POST /api/clients - should fail with invalid data", async ({
    request,
  }) => {
    const response = await request.post("http://localhost:3000/api/clients", {
      headers: {
        Cookie: authCookie,
      },
      data: {
        firstName: "", // Invalid: empty string
        lastName: "Doe",
        dateOfBirth: "invalid-date", // Invalid format
        sex: "M",
        province: "ON",
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
    const response = await request.get("http://localhost:3000/api/clients");

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  test("GET /api/clients/[id] - should return 404 for non-existent client", async ({
    request,
  }) => {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const response = await request.get(
      `http://localhost:3000/api/clients/${fakeId}`,
      {
        headers: {
          Cookie: authCookie,
        },
      },
    );

    expect(response.status()).toBe(404);
    const body = await response.json();
    expect(body.error).toBe("Client not found");
  });

  test("PATCH /api/clients/[id] - should fail with invalid data", async ({
    request,
  }) => {
    // Create a client first
    const createResponse = await createTestClient(request, {
      firstName: "Test",
      lastName: "Validation",
      dateOfBirth: "1985-03-10",
      sex: "F",
      province: "AB",
    });
    const { client } = await createResponse.json();

    const response = await request.patch(
      `http://localhost:3000/api/clients/${client.id}`,
      {
        headers: {
          Cookie: authCookie,
        },
        data: {
          dateOfBirth: "invalid-date",
        },
      },
    );

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Validation failed");
  });

  test("PATCH /api/clients/[id] - should fail without authentication", async ({
    request,
  }) => {
    // Create a client first
    const createResponse = await createTestClient(request, {
      firstName: "Test",
      lastName: "Auth",
      dateOfBirth: "1985-03-10",
      sex: "M",
      province: "BC",
    });
    const { client } = await createResponse.json();

    const response = await request.patch(
      `http://localhost:3000/api/clients/${client.id}`,
      {
        data: {
          firstName: "Hacker",
        },
      },
    );

    expect(response.status()).toBe(401);
  });

  test("DELETE /api/clients/[id] - should fail without authentication", async ({
    request,
  }) => {
    // Create a new client first
    const createResponse = await createTestClient(request, {
      firstName: "Test",
      lastName: "Delete",
      dateOfBirth: "1985-03-10",
      sex: "F",
      province: "AB",
    });
    const { client } = await createResponse.json();

    const response = await request.delete(
      `http://localhost:3000/api/clients/${client.id}`,
    );

    expect(response.status()).toBe(401);
  });
});
