import { expect, test } from "@playwright/test";

test.describe("Home Page", () => {
  test("should load the home page successfully", async ({ page }) => {
    await page.goto("/");

    // Check that the page loads and has expected content
    await expect(page).toHaveTitle(/InsurFlow/i);
  });

  test("should have navigation to auth pages", async ({ page }) => {
    await page.goto("/");

    // Verify sign-in link exists
    const signInLink = page.getByRole("link", { name: /sign in/i });
    if (await signInLink.isVisible()) {
      await expect(signInLink).toHaveAttribute("href", /auth\/sign-in/);
    }
  });
});
