import { expect, test } from "@playwright/test";

test.describe("Authentication Pages", () => {
  test("sign-in page should load", async ({ page }) => {
    await page.goto("/auth/sign-in");

    // Check that the sign-in form is present (Better Auth UI uses div, not heading)
    await expect(page.getByText("Sign In").first()).toBeVisible();
    await expect(page.getByRole("textbox", { name: /email/i })).toBeVisible();
  });

  test("sign-up page should load", async ({ page }) => {
    await page.goto("/auth/sign-up");

    // Check that the sign-up form is present
    await expect(page.getByText("Sign Up").first()).toBeVisible();
    await expect(page.getByRole("textbox", { name: /email/i })).toBeVisible();
  });

  test("should navigate from sign-in to sign-up", async ({ page }) => {
    await page.goto("/auth/sign-in");

    // Find and click the sign-up link
    const signUpLink = page.getByRole("link", { name: /sign up/i });
    await signUpLink.click();

    // Should navigate to sign-up page
    await expect(page).toHaveURL(/\/auth\/sign-up/);
  });

  test("forgot password page should load", async ({ page }) => {
    await page.goto("/auth/forgot-password");

    // Check that the forgot password form is present
    await expect(page.getByText("Forgot Password").first()).toBeVisible();
    await expect(page.getByRole("textbox", { name: /email/i })).toBeVisible();
  });
});
