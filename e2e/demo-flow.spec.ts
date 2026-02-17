import { expect, test } from "@playwright/test";

test.describe("Demo Client Journey", () => {
  test("landing page frames the 3-step client journey", async ({ page }) => {
    await page.goto("/demo");

    await expect(
      page.getByRole("heading", { name: /see your life insurance estimate/i }),
    ).toBeVisible();
    await expect(page.getByText(/client intake/i)).toBeVisible();
    await expect(page.getByText(/estimate snapshot/i)).toBeVisible();
    await expect(page.getByText(/advisor handoff/i)).toBeVisible();

    const startJourneyButton = page.getByRole("link", {
      name: /start client journey/i,
    });
    await expect(startJourneyButton).toHaveAttribute("href", "/demo/intake");
  });

  test("intake flow collects inputs and moves to estimate", async ({
    page,
  }) => {
    await page.goto("/demo/intake");

    await expect(
      page.getByRole("heading", { name: /tell us about your household/i }),
    ).toBeVisible();
    await expect(page.getByText(/about 5-7 minutes/i)).toBeVisible();
    await expect(page.getByText(/household status/i)).toBeVisible();

    await page.getByLabel(/annual household income/i).fill("180000");
    await page.getByLabel(/total debts/i).fill("320000");
    await page.getByLabel(/current life insurance coverage/i).fill("250000");
    await page
      .getByLabel(/what matters most for your family/i)
      .fill("Keep mortgage payments manageable and protect our children.");

    await page.getByRole("button", { name: /see estimate/i }).click();
    await expect(page).toHaveURL(/\/demo\/estimate$/);
  });

  test("estimate screen shows recommendation and plain-language sections", async ({
    page,
  }) => {
    await page.goto("/demo/estimate");

    await expect(
      page.getByRole("heading", { name: /your estimated coverage need/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /estimated coverage gap/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /what this means/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /why this matters/i }),
    ).toBeVisible();
    await expect(
      page.getByText(/this is an estimate, not final advice/i),
    ).toBeVisible();
  });

  test("handoff screen ends with clear advisor CTA", async ({ page }) => {
    await page.goto("/demo/handoff");

    await expect(
      page.getByRole("heading", {
        name: /review your estimate with an advisor/i,
      }),
    ).toBeVisible();
    await expect(
      page.getByText(/your prefilled intake is ready for advisor follow-up/i),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /connect with an advisor/i }),
    ).toBeVisible();
  });
});
