import { test, expect } from "@playwright/test";

test.describe("Insurance Needs Calculation", () => {
  // Generate a unique test client for each test run
  const testClient = {
    firstName: `TestClient${Date.now()}`,
    lastName: "Insurance",
    dateOfBirth: "1985-05-15",
    province: "ON",
  };

  let clientId: string;

  test.beforeEach(async ({ page }) => {
    // Navigate to clients page
    await page.goto("/clients");
    await page.waitForLoadState("networkidle");

    // Create a test client
    await page.click("button:has-text('Create Client')");
    await page.fill('input[name="firstName"]', testClient.firstName);
    await page.fill('input[name="lastName"]', testClient.lastName);
    await page.fill('input[name="dateOfBirth"]', testClient.dateOfBirth);
    await page.selectOption('select[name="province"]', testClient.province);
    await page.click("button[type='submit']");

    // Wait for creation and get client ID
    await page.waitForURL(/\/clients\/.+/);
    const url = page.url();
    clientId = url.split("/").pop() || "";

    // Add financial inputs
    await page.click("text=Financial Inputs");
    await page.click("button:has-text('Edit Financial Inputs')");
    await page.fill('input[name="clientIncome"]', "100000");
    await page.fill('input[name="incomeReplacementPercent"]', "70");
    await page.fill('input[name="replacementDurationYears"]', "10");
    await page.fill('input[name="existingLifeInsuranceCoverage"]', "100000");
    await page.click("button:has-text('Save Changes')");

    // Wait for save
    await page.waitForSelector("text=Financial inputs updated", {
      timeout: 5000,
    });
  });

  test.afterEach(async ({ page }) => {
    // Clean up: delete the test client
    if (clientId) {
      await page.goto(`/clients/${clientId}`);
      await page.click("button[aria-label='Delete client']");
      await page.click("button:has-text('Delete'):not(:has(button))");
      await page.waitForURL("/clients");
    }
  });

  test("should auto-calculate insurance needs on tab load", async ({
    page,
  }) => {
    // Navigate to Insurance Needs tab
    await page.click("text=Insurance Needs");

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
    await page.click("text=Insurance Needs");

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
    await page.click("text=Insurance Needs");

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
    await page.click("text=Insurance Needs");
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
    await page.click("text=Insurance Needs");
    await page.waitForSelector("text=Needs Composition", { timeout: 10000 });

    // Verify chart is rendered (look for SVG or chart container)
    const chartContainer = page.locator(".recharts-wrapper, svg").first();
    await expect(chartContainer).toBeVisible();

    // Verify chart legend items
    await expect(page.locator("text=Income Replacement")).toBeVisible();
    await expect(page.locator("text=Debt Payoff")).toBeVisible();
  });

  test("should handle zero income scenario gracefully", async ({ page }) => {
    // Set income to 0
    await page.click("text=Financial Inputs");
    await page.click("button:has-text('Edit Financial Inputs')");
    await page.fill('input[name="clientIncome"]', "0");
    await page.click("button:has-text('Save Changes')");

    // Wait for save
    await page.waitForSelector("text=Financial inputs updated", {
      timeout: 5000,
    });

    // Go to insurance tab
    await page.click("text=Insurance Needs");

    // Should show fallback message for no needs
    await expect(
      page.locator("text=No insurance needs to display"),
    ).toBeVisible();
  });

  test("should display error state on API failure", async ({ page }) => {
    // Mock API failure by blocking the endpoint
    await page.route("**/api/clients/*/calculate", async (route) => {
      await route.abort();
    });

    await page.click("text=Insurance Needs");

    // Should show error message
    await expect(page.locator("text=Failed to calculate").first()).toBeVisible({
      timeout: 10000,
    });

    // Should have retry button
    await expect(page.locator("button:has-text('Try Again')")).toBeVisible();
  });

  test("should update chart when financial data changes", async ({ page }) => {
    await page.click("text=Insurance Needs");
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

    // Wait for save and go back to insurance tab
    await page.waitForTimeout(1000);
    await page.click("text=Insurance Needs");

    // Wait for recalculation
    await page.waitForTimeout(2000);

    // Chart should be updated (different from original)
    const updatedChart = await page.locator(".recharts-wrapper").screenshot();
    expect(originalChart.equals(updatedChart)).toBeFalsy();
  });

  test("should be responsive on different viewports", async ({ page }) => {
    // Test desktop
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.click("text=Insurance Needs");
    await page.waitForSelector("text=Insurance Needs Analysis", {
      timeout: 10000,
    });

    // Both card and chart should be visible side by side on desktop
    await expect(page.locator("text=Income Replacement")).toBeVisible();
    await expect(page.locator("text=Needs Composition")).toBeVisible();

    // Test tablet
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload();
    await page.click("text=Insurance Needs");
    await page.waitForSelector("text=Insurance Needs Analysis", {
      timeout: 10000,
    });

    // Components should still be visible
    await expect(page.locator("text=Income Replacement")).toBeVisible();
    await expect(page.locator("text=Needs Composition")).toBeVisible();
  });

  test("should display correct timestamp", async ({ page }) => {
    await page.click("text=Insurance Needs");
    await page.waitForSelector("text=Insurance Needs Analysis", {
      timeout: 10000,
    });

    // Check for calculated timestamp
    const timestampText = page.locator("text=Calculated:").first();
    await expect(timestampText).toBeVisible();
  });

  test("should show input parameters used in calculation", async ({ page }) => {
    await page.click("text=Insurance Needs");
    await page.waitForSelector("text=Insurance Needs Analysis", {
      timeout: 10000,
    });

    // Verify calculation summary section shows inputs
    await page.click("text=Calculation Summary");

    // Should show income and replacement details
    await expect(page.locator("text=Client Income:")).toBeVisible();
  });
});
