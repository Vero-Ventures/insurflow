import { expect, test } from "@playwright/test";

test.describe("Home Page", () => {
  test("should load the home page successfully", async ({ page }) => {
    await page.goto("/");

    // Check that the page loads and has expected content
    await expect(page).toHaveTitle(/InsurFlow/i);
  });

  test("should have navigation to auth pages", async ({ page }) => {
    await page.goto("/");

    // Verify sign-in link exists in the header navigation and is visible
    const signInLink = page
      .getByRole("banner")
      .getByRole("link", { name: /sign in/i });
    await expect(signInLink).toBeVisible();
    await expect(signInLink).toHaveAttribute("href", /auth\/sign-in/);
  });

  test("should prioritize demo CTA and show 3-step flow", async ({ page }) => {
    await page.goto("/");

    const heroSection = page.locator("main section").first();
    const primaryDemoCta = heroSection.getByRole("link", {
      name: /start demo/i,
    });
    await expect(primaryDemoCta).toBeVisible();
    await expect(primaryDemoCta).toHaveAttribute("href", "/demo");

    await expect(
      page.getByRole("heading", { name: /how the demo works/i }),
    ).toBeVisible();
    await expect(page.getByText(/1\) intake/i)).toBeVisible();
    await expect(page.getByText(/2\) estimate/i)).toBeVisible();
    await expect(page.getByText(/3\) advisor handoff/i)).toBeVisible();
  });
});
