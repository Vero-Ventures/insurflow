import { expect, test, type Page } from "@playwright/test";
import { randomBytes } from "node:crypto";

test.describe("Client Detail Page", () => {
  let authCookie: string;
  let testEmail: string;
  let testPassword: string;
  let testClientId: string;
  const createdClientIds: string[] = [];

  test.beforeAll(async ({ request }) => {
    // Generate unique credentials
    testPassword = `Test${randomBytes(8).toString("base64url")}${Date.now()}!`;
    testEmail = `test-detail-${Date.now()}-${randomBytes(4).toString("hex")}@example.com`;

    try {
      // Sign up
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

      // Sign in
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
        const errorText = await signInResponse.text();
        console.error("Sign in failed:", errorText);
        throw new Error(`Sign in failed: ${errorText}`);
      }

      const cookies = signInResponse.headers()["set-cookie"];
      if (cookies) {
        authCookie = cookies;
      } else {
        throw new Error("No auth cookie received");
      }

      // Create a test client
      const createClientResponse = await request.post(
        "http://localhost:3000/api/clients",
        {
          headers: {
            Cookie: authCookie,
            "Content-Type": "application/json",
          },
          data: {
            firstName: "Test",
            lastName: "Detail",
            dateOfBirth: "1985-06-15",
            sex: "F",
            province: "BC",
            smoker: false,
            healthRating: "preferred",
            hasSpouse: false,
            clientIncome: "75000.00",
            status: "draft",
          },
        },
      );

      if (!createClientResponse.ok()) {
        const errorText = await createClientResponse.text();
        console.error("Failed to create test client:", errorText);
        throw new Error(`Failed to create test client: ${errorText}`);
      }

      const clientData = await createClientResponse.json();
      testClientId = clientData.client.id;
      createdClientIds.push(testClientId);
    } catch (error) {
      console.error("Test setup failed:", error);
      throw error;
    }
  });

  test.afterAll(async ({ request }) => {
    // Clean up: delete the test clients
    for (const id of createdClientIds) {
      try {
        await request.delete(`http://localhost:3000/api/clients/${id}`, {
          headers: {
            Cookie: authCookie,
          },
        });
      } catch {
        // Ignore cleanup errors
      }
    }
  });

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

  async function waitForClientDetailPage(page: Page) {
    // Wait for the page to fully load by checking for the heading
    await expect(
      page.getByRole("heading", { level: 1, name: "Test Detail" }),
    ).toBeVisible({ timeout: 15000 });
  }

  test("should display profile information", async ({ page }) => {
    await setAuthContext(page);
    await page.goto(`/clients/${testClientId}`);

    await waitForClientDetailPage(page);

    // Verify profile section content
    await expect(page.getByText("Personal Information")).toBeVisible();
    await expect(
      page.getByText("Basic demographic and contact details"),
    ).toBeVisible();

    // Verify province is displayed in the profile section
    const profileContent = page.locator('[role="tabpanel"]').first();
    await expect(profileContent.getByText("Province")).toBeVisible();
    await expect(profileContent.getByText("BC")).toBeVisible();
  });

  test("should display client details correctly", async ({ page }) => {
    await setAuthContext(page);
    await page.goto(`/clients/${testClientId}`);

    await waitForClientDetailPage(page);

    // Verify client ID is displayed
    await expect(page.getByText(`Client ID: ${testClientId}`)).toBeVisible();

    // Verify tabs are present
    await expect(page.getByRole("tab", { name: "Profile" })).toBeVisible();
    await expect(
      page.getByRole("tab", { name: "Financial Inputs" }),
    ).toBeVisible();
    await expect(
      page.getByRole("tab", { name: "Insurance Needs" }),
    ).toBeVisible();
    await expect(page.getByRole("tab", { name: "Report" })).toBeVisible();
  });

  test("should allow copying client ID", async ({ page }) => {
    await setAuthContext(page);
    await page.goto(`/clients/${testClientId}`);

    await waitForClientDetailPage(page);

    // Grant clipboard permissions
    await page
      .context()
      .grantPermissions(["clipboard-read", "clipboard-write"]);

    // Find the copy button - it's the small button right after the Client ID text
    // Look for the button that contains either Copy or Check icon (depending on state)
    const clientIdSection = page.locator("text=Client ID:").locator("..");
    const copyButton = clientIdSection.getByRole("button");
    await copyButton.click();

    // Verify success toast
    await expect(page.getByText("Client ID copied to clipboard")).toBeVisible({
      timeout: 5000,
    });
  });

  test("should navigate between tabs", async ({ page }) => {
    await setAuthContext(page);
    await page.goto(`/clients/${testClientId}`);

    await waitForClientDetailPage(page);

    // Navigate to Financial Inputs tab
    await page.getByRole("tab", { name: "Financial Inputs" }).click();
    await expect(
      page.getByText("Income, assets, debts, and financial planning details"),
    ).toBeVisible();

    // Navigate to Insurance Needs tab
    await page.getByRole("tab", { name: "Insurance Needs" }).click();
    await expect(
      page.getByText("Calculate and track insurance coverage requirements"),
    ).toBeVisible();

    // Navigate to Report tab
    await page.getByRole("tab", { name: "Report" }).click();
    await expect(
      page.getByText("Generate and view comprehensive financial reports"),
    ).toBeVisible();

    // Navigate back to Profile tab
    await page.getByRole("tab", { name: "Profile" }).click();
    await expect(page.getByText("Personal Information")).toBeVisible();
  });

  test("should show delete confirmation dialog", async ({ page }) => {
    await setAuthContext(page);
    await page.goto(`/clients/${testClientId}`);

    await waitForClientDetailPage(page);

    // Click delete button - look for the button with Trash2 icon in the header area
    // The delete button is a destructive variant button with size="icon"
    const deleteButton = page.getByRole("button").filter({
      has: page.locator("svg.lucide-trash-2"),
    });
    await deleteButton.click();

    // Verify confirmation dialog appears
    await expect(
      page.getByRole("alertdialog").getByText("Delete Client"),
    ).toBeVisible();
    await expect(
      page.getByText(/are you sure you want to delete Test Detail/i),
    ).toBeVisible();

    // Cancel the deletion
    await page.getByRole("button", { name: "Cancel" }).click();

    // Verify dialog is closed
    await expect(
      page.getByRole("alertdialog").getByText("Delete Client"),
    ).not.toBeVisible();

    // Verify we're still on the page
    await expect(
      page.getByRole("heading", { level: 1, name: "Test Detail" }),
    ).toBeVisible();
  });

  test("should navigate back to clients list", async ({ page }) => {
    await setAuthContext(page);
    await page.goto(`/clients/${testClientId}`);

    await waitForClientDetailPage(page);

    // Click back button
    await page.getByRole("link", { name: /back to clients/i }).click();

    // Wait for navigation to complete
    await page.waitForURL("/clients", { timeout: 10000 });

    // Verify we're on the clients list page
    await expect(
      page.getByRole("heading", { name: "Clients", exact: true }),
    ).toBeVisible({ timeout: 10000 });
  });

  test("should show error for non-existent client", async ({ page }) => {
    await setAuthContext(page);
    const fakeId = "00000000-0000-0000-0000-000000000000";
    await page.goto(`/clients/${fakeId}`);

    // Verify error message
    await expect(page.getByText("Client not found")).toBeVisible({
      timeout: 10000,
    });
    await expect(
      page.getByRole("link", { name: /back to clients/i }),
    ).toBeVisible();
  });

  test("should require authentication", async ({ page }) => {
    // Don't set auth context - go directly to the page without cookies
    await page.goto(`/clients/${testClientId}`);

    // Verify authentication required message
    await expect(page.getByText("Authentication Required")).toBeVisible({
      timeout: 10000,
    });
    await expect(
      page.getByText(/please sign in to view client details/i),
    ).toBeVisible();
  });
});
