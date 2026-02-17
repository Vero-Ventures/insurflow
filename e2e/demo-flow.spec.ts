import { expect, test } from "@playwright/test";

test.describe("Demo Client Journey", () => {
  test("full client journey carries intake state to estimate and handoff", async ({
    page,
  }) => {
    await page.goto("/demo");

    await expect(
      page.getByRole("heading", { name: /see your life insurance estimate/i }),
    ).toBeVisible();
    await expect(page.getByText(/client intake/i)).toBeVisible();
    await expect(page.getByText(/estimate snapshot/i)).toBeVisible();
    await expect(page.getByText(/advisor handoff/i)).toBeVisible();

    await page.getByRole("link", { name: /start client journey/i }).click();
    await expect(page).toHaveURL(/\/demo\/intake$/);

    await expect(
      page.getByRole("heading", { name: /tell us about your household/i }),
    ).toBeVisible();
    await expect(page.getByText(/about 5-7 minutes/i)).toBeVisible();
    await expect(page.getByText(/household status/i)).toBeVisible();

    await page.getByRole("combobox").first().click();
    await page.getByRole("option", { name: /single parent/i }).click();
    await page.getByLabel(/annual household income/i).fill("180000");
    await page.getByLabel(/total debts/i).fill("320000");
    await page.getByLabel(/current life insurance coverage/i).fill("250000");
    await page
      .getByLabel(/what matters most for your family/i)
      .fill("Keep mortgage payments manageable and protect our children.");

    await page.getByRole("button", { name: /see estimate/i }).click();
    await expect(page).toHaveURL(/\/demo\/estimate$/);

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

    await expect(page.getByText("$1,905,000")).toBeVisible();
    await expect(page.getByText("$1,655,000")).toBeVisible();

    await page
      .getByRole("button", { name: /continue to advisor handoff/i })
      .click();
    await expect(page).toHaveURL(/\/demo\/handoff$/);

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
