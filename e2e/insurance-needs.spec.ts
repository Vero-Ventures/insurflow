import { test, expect, type Page } from "@playwright/test";
import { randomBytes } from "node:crypto";

test.describe("Insurance Needs Calculation", () => {
  let authCookie: string;
  let testEmail: string;
  let testPassword: string;
  let clientId: string;

  test.beforeAll(async ({ request }) => {
    // Generate unique credentials
    testPassword = `Test${randomBytes(8).toString("base64url")}${Date.now()}!`;
    testEmail = `test-insurance-${Date.now()}-${randomBytes(4).toString("hex")}@example.com`;

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
            name: "Test Insurance User",
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

      // Create a test client with financial inputs
      const createClientResponse = await request.post(
        "http://localhost:3000/api/clients",
        {
          headers: {
            Cookie: authCookie,
            "Content-Type": "application/json",
          },
          data: {
            firstName: "TestClient",
            lastName: "Insurance",
            dateOfBirth: "1985-05-15",
            sex: "M",
            province: "ON",
            smoker: false,
            healthRating: "standard",
            hasSpouse: false,
            clientIncome: "100000.00",
            incomeReplacementPercent: "70",
            replacementDurationYears: "10",
            existingLifeInsuranceCoverage: "100000.00",
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
      clientId = clientData.client.id;
    } catch (error) {
      console.error("Test setup failed:", error);
      throw error;
    }
  });

  test.afterAll(async ({ request }) => {
    // Clean up: delete the test client
    if (clientId && authCookie) {
      try {
        await request.delete(`http://localhost:3000/api/clients/${clientId}`, {
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

  test("should auto-calculate insurance needs on tab load", async ({
    page,
  }) => {
    await setAuthContext(page);
    await page.goto(`/clients/${clientId}`);

    // Navigate to Insurance tab
    await page.getByRole("tab", { name: "Insurance" }).click();

    // Wait for calculation to complete
    await page.waitForSelector("text=Insurance Needs Analysis", {
      timeout: 10000,
    });

    // Verify breakdown components are displayed
    await expect(page.locator("text=Income Replacement")).toBeVisible();
    await expect(page.locator("text=Debt Payoff")).toBeVisible();
    await expect(page.locator("text=Estate Buffer")).toBeVisible();

    // Verify total insurance needs is displayed with emphasis
    await expect(page.locator("text=Total Insurance Needs")).toBeVisible();
    const totalValue = page.locator("text=/\\$[0-9,]+\\.[0-9]{2}/").first();
    await expect(totalValue).toBeVisible();
  });

  test("should display correct calculation breakdown", async ({ page }) => {
    await setAuthContext(page);
    await page.goto(`/clients/${clientId}`);
    await page.getByRole("tab", { name: "Insurance" }).click();

    // Verify calculated values
    // Income replacement should be: $100,000 * 70% * 10 years = $700,000
    await expect(page.locator("text=$700,000.00")).toBeVisible();

    // Total should be visible (gross needs minus deductions)
    const totalNeedsSection = page
      .locator("text=Total Insurance Needs")
      .first();
    await expect(totalNeedsSection).toBeVisible();
  });

  test("should show loading state while calculating", async ({ page }) => {
    await setAuthContext(page);
    await page.goto(`/clients/${clientId}`);
    await page.getByRole("tab", { name: "Insurance" }).click();

    // Check for loading state (skeleton or spinner)
    await expect(
      page.locator(".animate-pulse, [role='status'], text=Loading").first(),
    ).toBeVisible({ timeout: 2000 });

    // Wait for loading to complete
    await page.waitForSelector("text=Insurance Needs Analysis", {
      timeout: 10000,
    });
  });

  test("should recalculate on button click", async ({ page }) => {
    await setAuthContext(page);
    await page.goto(`/clients/${clientId}`);
    await page.getByRole("tab", { name: "Insurance" }).click();
    await page.waitForSelector("text=Insurance Needs Analysis", {
      timeout: 10000,
    });

    // Click recalculate button
    await page.click("button:has-text('Recalculate')");

    // Wait for recalculation
    await page.waitForSelector("text=Insurance needs recalculated", {
      timeout: 10000,
    });

    // Verify values are still displayed
    await expect(page.locator("text=Income Replacement")).toBeVisible();
  });

  test("should display chart with breakdown", async ({ page }) => {
    await setAuthContext(page);
    await page.goto(`/clients/${clientId}`);
    await page.getByRole("tab", { name: "Insurance" }).click();
    await page.waitForSelector("text=Needs Composition", { timeout: 10000 });

    // Verify chart is rendered (look for SVG or chart container)
    const chartContainer = page.locator(".recharts-wrapper, svg").first();
    await expect(chartContainer).toBeVisible();

    // Verify chart legend items
    await expect(page.locator("text=Income Replacement")).toBeVisible();
    await expect(page.locator("text=Debt Payoff")).toBeVisible();
  });

  test("should handle zero income scenario gracefully", async ({ page }) => {
    await setAuthContext(page);
    await page.goto(`/clients/${clientId}`);

    // Set income to 0
    await page.getByRole("tab", { name: "Financial" }).click();
    await page.click("button:has-text('Edit Financial Inputs')");
    await page.fill('input[name="clientIncome"]', "0");
    await page.click("button:has-text('Save Changes')");

    // Wait for save
    await page.waitForSelector("text=Financial inputs updated", {
      timeout: 5000,
    });

    // Go to insurance tab
    await page.getByRole("tab", { name: "Insurance" }).click();

    // Should show fallback message for no needs
    await expect(
      page.locator("text=No insurance needs to display"),
    ).toBeVisible();
  });

  test("should display error state on API failure", async ({ page }) => {
    await setAuthContext(page);

    // Mock API failure by blocking the endpoint
    await page.route("**/api/clients/*/calculate", async (route) => {
      await route.abort();
    });

    await page.goto(`/clients/${clientId}`);
    await page.click("text=Insurance Needs");

    // Should show error message
    await expect(page.locator("text=Failed to calculate").first()).toBeVisible({
      timeout: 10000,
    });

    // Should have retry button
    await expect(page.locator("button:has-text('Try Again')")).toBeVisible();
  });

  test("should update chart when financial data changes", async ({ page }) => {
    await setAuthContext(page);
    await page.goto(`/clients/${clientId}`);
    await page.getByRole("tab", { name: "Insurance" }).click();
    await page.waitForSelector("text=Insurance Needs Analysis", {
      timeout: 10000,
    });

    // Note original value
    const originalChart = await page.locator(".recharts-wrapper").screenshot();

    // Add a debt
    await page.click("text=Profile");
    await page.click("button:has-text('Add Debt')");
    await page.fill('input[name="name"]', "Test Mortgage");
    await page.selectOption('select[name="type"]', "mortgage");
    await page.fill('input[name="currentBalance"]', "250000");
    await page.click("button[type='submit']");

    // Wait for debt to be added and dialog to close
    await page.waitForSelector("text=Debt added successfully", {
      timeout: 5000,
    });

    // Go back to insurance tab
    await page.getByRole("tab", { name: "Insurance" }).click();

    // Wait for recalculation to complete
    await page.waitForSelector("text=Calculated:", { timeout: 10000 });

    // Chart should be updated (different from original)
    const updatedChart = await page.locator(".recharts-wrapper").screenshot();
    expect(originalChart.equals(updatedChart)).toBeFalsy();
  });

  test("should be responsive on different viewports", async ({ page }) => {
    await setAuthContext(page);

    // Test desktop
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`/clients/${clientId}`);
    await page.getByRole("tab", { name: "Insurance" }).click();
    await page.waitForSelector("text=Insurance Needs Analysis", {
      timeout: 10000,
    });

    // Both card and chart should be visible side by side on desktop
    await expect(page.locator("text=Income Replacement")).toBeVisible();
    await expect(page.locator("text=Needs Composition")).toBeVisible();

    // Test tablet
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto(`/clients/${clientId}`);
    await page.getByRole("tab", { name: "Insurance" }).click();
    await page.waitForSelector("text=Insurance Needs Analysis", {
      timeout: 10000,
    });

    // Components should still be visible
    await expect(page.locator("text=Income Replacement")).toBeVisible();
    await expect(page.locator("text=Needs Composition")).toBeVisible();
  });

  test("should display correct timestamp", async ({ page }) => {
    await setAuthContext(page);
    await page.goto(`/clients/${clientId}`);
    await page.getByRole("tab", { name: "Insurance" }).click();
    await page.waitForSelector("text=Insurance Needs Analysis", {
      timeout: 10000,
    });

    // Check for calculated timestamp
    const timestampText = page.locator("text=Calculated:").first();
    await expect(timestampText).toBeVisible();
  });

  test("should show input parameters used in calculation", async ({ page }) => {
    await setAuthContext(page);
    await page.goto(`/clients/${clientId}`);
    await page.getByRole("tab", { name: "Insurance" }).click();
    await page.waitForSelector("text=Insurance Needs Analysis", {
      timeout: 10000,
    });

    // Verify calculation summary section shows inputs
    await page.click("text=Calculation Summary");

    // Should show income and replacement details
    await expect(page.locator("text=Client Income:")).toBeVisible();
  });
});
