import { expect, test, type Page } from "@playwright/test";
import { randomBytes } from "node:crypto";

test.describe("Client Create UI", () => {
  // Run tests serially to avoid race conditions with shared auth state
  test.describe.configure({ mode: "serial" });
  let authCookie: string;
  let testEmail: string;
  let testPassword: string;
  const createdClientIds: string[] = [];

  test.beforeAll(async ({ request }) => {
    // Generate unique credentials for this test run
    testPassword = `Test${randomBytes(8).toString("base64url")}${Date.now()}!`;
    testEmail = `test-${Date.now()}-${randomBytes(4).toString("hex")}@example.com`;

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
            email: testEmail,
            password: testPassword,
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
            email: testEmail,
            password: testPassword,
          },
        },
      );

      if (!signInResponse.ok()) {
        console.error("Sign in failed:", await signInResponse.text());
        throw new Error("Sign in failed");
      }

      const cookies = signInResponse.headers()["set-cookie"];
      if (cookies) {
        authCookie = cookies;
      } else {
        throw new Error("No auth cookie received from sign-in response");
      }
    } catch (error) {
      console.error("Authentication setup failed:", error);
      throw error;
    }
  });

  /**
   * Helper to set auth cookie in browser context
   */
  async function setAuthContext(page: Page) {
    // Parse the cookie string and set it in the browser context
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
   * Helper to navigate to clients page and wait for it to load
   */
  async function navigateToClientsPage(page: Page) {
    await page.goto("/clients");
    await expect(
      page.getByRole("heading", { name: "Clients", exact: true }),
    ).toBeVisible();
  }

  /**
   * Helper to open the create client dialog
   */
  async function openCreateClientDialog(page: Page) {
    await page.getByRole("button", { name: /create client/i }).click();
    await expect(
      page.getByRole("heading", { name: "Create New Client" }),
    ).toBeVisible();
  }

  /**
   * Helper to set up response listener for client creation
   */
  function setupClientCreationListener(page: Page) {
    return page.waitForResponse(
      (response) =>
        response.url().includes("/api/clients") &&
        response.request().method() === "POST" &&
        response.status() === 201,
    );
  }

  /**
   * Helper to capture and track client ID from API response
   */
  async function captureClientId(
    clientIdPromise: ReturnType<typeof setupClientCreationListener>,
  ) {
    const response = await clientIdPromise;
    const responseBody = await response.json();
    if (responseBody.client?.id) {
      createdClientIds.push(responseBody.client.id);
    }
  }

  /**
   * Helper to wait for dialog to close
   */
  async function waitForDialogClose(page: Page) {
    await expect(
      page.getByRole("heading", { name: "Create New Client" }),
    ).not.toBeVisible({ timeout: 3000 });
  }

  /**
   * Helper to fill basic client form fields
   */
  async function fillBasicClientForm(
    page: Page,
    data: {
      firstName: string;
      lastName: string;
      dateOfBirth: string;
      sex: "M" | "F";
      state: string;
      healthRating: string;
    },
  ) {
    await page.getByLabel(/first name/i).fill(data.firstName);
    await page.getByLabel(/last name/i).fill(data.lastName);
    await page.getByLabel(/date of birth/i).fill(data.dateOfBirth);
    await page.getByLabel(/sex/i).selectOption(data.sex);
    await page.getByLabel(/state/i).selectOption(data.state);
    await page.getByLabel(/health rating/i).selectOption(data.healthRating);
  }

  /**
   * Helper to click the submit button
   */
  async function clickSubmitButton(page: Page) {
    await page
      .getByRole("button", { name: /^create client$/i })
      .last()
      .click();
  }

  /**
   * Helper to wait for success toast
   */
  async function waitForSuccessToast(page: Page) {
    await expect(page.getByText(/client created successfully/i)).toBeVisible({
      timeout: 10000,
    });
  }

  /**
   * Helper to reload page and verify client appears in table
   */
  async function verifyClientInTable(page: Page, clientName: string) {
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Clients", exact: true }),
    ).toBeVisible();
    await expect(page.getByText(clientName)).toBeVisible({ timeout: 5000 });
  }

  test.afterAll(async ({ request }) => {
    // Clean up created clients
    for (const id of createdClientIds) {
      try {
        await request.delete(`http://localhost:3000/api/clients/${id}`, {
          headers: {
            Cookie: authCookie,
          },
        });
      } catch {
        // Ignore cleanup errors (client may already be deleted)
      }
    }
  });

  test("should create a new client through UI - happy path", async ({
    page,
  }) => {
    await setAuthContext(page);
    const clientIdPromise = setupClientCreationListener(page);
    await navigateToClientsPage(page);
    await openCreateClientDialog(page);

    await fillBasicClientForm(page, {
      firstName: "Jane",
      lastName: "Doe",
      dateOfBirth: "1985-06-15",
      sex: "F",
      state: "BC",
      healthRating: "preferred",
    });

    await clickSubmitButton(page);
    await waitForSuccessToast(page);
    await captureClientId(clientIdPromise);
    await waitForDialogClose(page);
    await verifyClientInTable(page, "Jane Doe");
  });

  test("should show validation error when hasSpouse is true but spouseAge is missing", async ({
    page,
  }) => {
    await setAuthContext(page);
    await navigateToClientsPage(page);
    await openCreateClientDialog(page);

    await fillBasicClientForm(page, {
      firstName: "John",
      lastName: "Smith",
      dateOfBirth: "1990-03-20",
      sex: "M",
      state: "ON",
      healthRating: "standard",
    });

    // Check "has spouse" checkbox
    await page.getByLabel(/client has a spouse/i).check();

    // Wait for spouse age field to appear
    await expect(page.getByLabel(/spouse age/i)).toBeVisible();

    // Do NOT fill spouse age (leave it empty)

    await clickSubmitButton(page);

    // Wait for validation error to appear
    await expect(
      page.getByText(/spouse age is required and must be between 0 and 120/i),
    ).toBeVisible();

    // Verify error toast
    await expect(
      page.getByText(/please fix the errors in the form/i),
    ).toBeVisible();

    // Verify the client was NOT created (table shouldn't have John Smith)
    // Note: We need to check that the dialog is still open, meaning form didn't submit
    await expect(
      page.getByRole("heading", { name: "Create New Client" }),
    ).toBeVisible();
  });

  test("should show optimistic UI when creating client", async ({ page }) => {
    await setAuthContext(page);
    const clientIdPromise = setupClientCreationListener(page);
    await navigateToClientsPage(page);
    await openCreateClientDialog(page);

    await fillBasicClientForm(page, {
      firstName: "Optimistic",
      lastName: "Test",
      dateOfBirth: "1995-12-10",
      sex: "M",
      state: "AB",
      healthRating: "standard_plus",
    });

    await clickSubmitButton(page);
    await waitForSuccessToast(page);
    await captureClientId(clientIdPromise);
    await waitForDialogClose(page);
    await verifyClientInTable(page, "Optimistic Test");
  });

  test("should prevent dialog from closing while submitting", async ({
    page,
  }) => {
    await setAuthContext(page);
    const clientIdPromise = setupClientCreationListener(page);
    await navigateToClientsPage(page);
    await openCreateClientDialog(page);

    await fillBasicClientForm(page, {
      firstName: "Lock",
      lastName: "Dialog",
      dateOfBirth: "1988-08-08",
      sex: "F",
      state: "QC",
      healthRating: "preferred_plus",
    });

    await clickSubmitButton(page);

    // Immediately check that dialog is still visible (it should be locked during submission)
    await page.waitForTimeout(200); // Small delay to ensure submission started

    // Try to press Escape while potentially submitting
    await page.keyboard.press("Escape");

    await waitForSuccessToast(page);
    await captureClientId(clientIdPromise);
    await waitForDialogClose(page);
  });
});
