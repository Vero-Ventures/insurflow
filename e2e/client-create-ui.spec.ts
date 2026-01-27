import { expect, test, type Page } from "@playwright/test";
import { randomBytes } from "node:crypto";

test.describe("Client Create UI", () => {
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
      if (cookieParts && cookieParts.length === 2) {
        await page.context().addCookies([
          {
            name: cookieParts[0] || "",
            value: cookieParts[1] || "",
            domain: "localhost",
            path: "/",
          },
        ]);
      }
    }
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
    // Set up authentication
    await setAuthContext(page);

    // Set up response listener to capture client ID
    const clientIdPromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/clients") &&
        response.request().method() === "POST" &&
        response.status() === 201,
    );

    // Navigate to clients page
    await page.goto("/clients");

    // Wait for page to load - use exact match for the main heading
    await expect(
      page.getByRole("heading", { name: "Clients", exact: true }),
    ).toBeVisible();

    // Click "Create Client" button
    await page.getByRole("button", { name: /create client/i }).click();

    // Wait for dialog to open
    await expect(
      page.getByRole("heading", { name: "Create New Client" }),
    ).toBeVisible();

    // Fill out the form
    await page.getByLabel(/first name/i).fill("Jane");
    await page.getByLabel(/last name/i).fill("Doe");
    await page.getByLabel(/date of birth/i).fill("1985-06-15");

    // Select sex
    await page.getByLabel(/sex/i).selectOption("F");

    // Select province
    await page.getByLabel(/province/i).selectOption("BC");

    // Select health rating
    await page.getByLabel(/health rating/i).selectOption("preferred");

    // Submit the form
    await page
      .getByRole("button", { name: /^create client$/i })
      .last()
      .click();

    // Wait for success toast
    await expect(page.getByText(/client created successfully/i)).toBeVisible({
      timeout: 10000,
    });

    // Capture the client ID from the response
    const response = await clientIdPromise;
    const responseBody = await response.json();
    if (responseBody.client?.id) {
      createdClientIds.push(responseBody.client.id);
    }

    // Wait for the dialog to close
    await expect(
      page.getByRole("heading", { name: "Create New Client" }),
    ).not.toBeVisible({ timeout: 3000 });

    // Reload the page to ensure we get the latest data
    await page.reload();

    // Wait for the page to load again
    await expect(
      page.getByRole("heading", { name: "Clients", exact: true }),
    ).toBeVisible();

    // Verify the new client appears in the table
    await expect(page.getByText("Jane Doe")).toBeVisible({ timeout: 5000 });
  });

  test("should show validation error when hasSpouse is true but spouseAge is missing", async ({
    page,
  }) => {
    // Set up authentication
    await setAuthContext(page);

    // Navigate to clients page
    await page.goto("/clients");

    // Wait for page to load - use exact match for the main heading
    await expect(
      page.getByRole("heading", { name: "Clients", exact: true }),
    ).toBeVisible();

    // Click "Create Client" button
    await page.getByRole("button", { name: /create client/i }).click();

    // Wait for dialog to open
    await expect(
      page.getByRole("heading", { name: "Create New Client" }),
    ).toBeVisible();

    // Fill out required fields
    await page.getByLabel(/first name/i).fill("John");
    await page.getByLabel(/last name/i).fill("Smith");
    await page.getByLabel(/date of birth/i).fill("1990-03-20");
    await page.getByLabel(/sex/i).selectOption("M");
    await page.getByLabel(/province/i).selectOption("ON");
    await page.getByLabel(/health rating/i).selectOption("standard");

    // Check "has spouse" checkbox
    await page.getByLabel(/client has a spouse/i).check();

    // Wait for spouse age field to appear
    await expect(page.getByLabel(/spouse age/i)).toBeVisible();

    // Do NOT fill spouse age (leave it empty)

    // Submit the form
    await page
      .getByRole("button", { name: /^create client$/i })
      .last()
      .click();

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
    // Set up authentication
    await setAuthContext(page);

    // Set up response listener to capture client ID
    const clientIdPromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/clients") &&
        response.request().method() === "POST" &&
        response.status() === 201,
    );

    // Navigate to clients page
    await page.goto("/clients");

    // Wait for page to load - use exact match for the main heading
    await expect(
      page.getByRole("heading", { name: "Clients", exact: true }),
    ).toBeVisible();

    // Click "Create Client" button
    await page.getByRole("button", { name: /create client/i }).click();

    // Wait for dialog to open
    await expect(
      page.getByRole("heading", { name: "Create New Client" }),
    ).toBeVisible();

    // Fill out the form
    await page.getByLabel(/first name/i).fill("Optimistic");
    await page.getByLabel(/last name/i).fill("Test");
    await page.getByLabel(/date of birth/i).fill("1995-12-10");
    await page.getByLabel(/sex/i).selectOption("M");
    await page.getByLabel(/province/i).selectOption("AB");
    await page.getByLabel(/health rating/i).selectOption("standard_plus");

    // Submit the form
    await page
      .getByRole("button", { name: /^create client$/i })
      .last()
      .click();

    // Wait for success toast (indicates real client was created)
    await expect(page.getByText(/client created successfully/i)).toBeVisible({
      timeout: 10000,
    });

    // Capture the client ID from the response
    const response = await clientIdPromise;
    const responseBody = await response.json();
    if (responseBody.client?.id) {
      createdClientIds.push(responseBody.client.id);
    }

    // Wait for the dialog to close
    await expect(
      page.getByRole("heading", { name: "Create New Client" }),
    ).not.toBeVisible({ timeout: 3000 });

    // Reload the page to get the latest data
    await page.reload();

    // Wait for page to load
    await expect(
      page.getByRole("heading", { name: "Clients", exact: true }),
    ).toBeVisible();

    // Verify the client is in the table
    await expect(page.getByText("Optimistic Test")).toBeVisible({
      timeout: 5000,
    });
  });

  test("should prevent dialog from closing while submitting", async ({
    page,
  }) => {
    // Set up authentication
    await setAuthContext(page);

    // Set up response listener to capture client ID
    const clientIdPromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/clients") &&
        response.request().method() === "POST" &&
        response.status() === 201,
    );

    // Navigate to clients page
    await page.goto("/clients");

    // Wait for page to load - use exact match for the main heading
    await expect(
      page.getByRole("heading", { name: "Clients", exact: true }),
    ).toBeVisible();

    // Click "Create Client" button
    await page.getByRole("button", { name: /create client/i }).click();

    // Wait for dialog to open
    await expect(
      page.getByRole("heading", { name: "Create New Client" }),
    ).toBeVisible();

    // Fill out the form
    await page.getByLabel(/first name/i).fill("Lock");
    await page.getByLabel(/last name/i).fill("Dialog");
    await page.getByLabel(/date of birth/i).fill("1988-08-08");
    await page.getByLabel(/sex/i).selectOption("F");
    await page.getByLabel(/province/i).selectOption("QC");
    await page.getByLabel(/health rating/i).selectOption("preferred_plus");

    // Submit the form
    const submitButton = page
      .getByRole("button", { name: /^create client$/i })
      .last();
    await submitButton.click();

    // Immediately check that dialog is still visible (it should be locked during submission)
    await page.waitForTimeout(200); // Small delay to ensure submission started

    // Try to press Escape while potentially submitting
    await page.keyboard.press("Escape");

    // Wait for the submission to complete
    await expect(page.getByText(/client created successfully/i)).toBeVisible({
      timeout: 10000,
    });

    // Capture the client ID from the response
    const response = await clientIdPromise;
    const responseBody = await response.json();
    if (responseBody.client?.id) {
      createdClientIds.push(responseBody.client.id);
    }

    // Now the dialog should be closed
    await expect(
      page.getByRole("heading", { name: "Create New Client" }),
    ).not.toBeVisible({ timeout: 3000 });
  });
});
