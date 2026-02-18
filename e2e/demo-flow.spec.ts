import { expect, test, type Page } from "@playwright/test";

async function closeTourIfVisible(page: Page) {
  const close = page.getByRole("button", { name: /close tour/i });
  if (await close.isVisible()) {
    await close.click();
  }
}

test.describe("Demo Client Journey", () => {
  test("full client journey carries intake state to estimate and handoff", async ({
    page,
  }) => {
    await page.goto("/demo");
    await closeTourIfVisible(page);

    await expect(
      page.getByRole("heading", { name: /experience the client journey/i }),
    ).toBeVisible();
    await expect(page.getByText(/guided mode/i)).toBeVisible();
    await expect(page.getByText(/client intake/i)).toBeVisible();
    await expect(page.getByText(/ai \+ report showcase/i)).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /advisor handoff/i }),
    ).toBeVisible();

    await page.getByRole("link", { name: /start guided demo/i }).click();
    await expect(page).toHaveURL(/\/demo\/intake$/);
    await closeTourIfVisible(page);

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
    await closeTourIfVisible(page);

    await expect(
      page.getByRole("heading", { name: /your estimated coverage need/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /estimated coverage gap/i }),
    ).toBeVisible();
    await expect(page.getByText(/income replacement %/i)).toBeVisible();
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
      .getByRole("button", { name: /continue to ai and report showcase/i })
      .click();
    await expect(page).toHaveURL(/\/demo\/showcase$/);
    await closeTourIfVisible(page);

    await expect(
      page.getByRole("heading", {
        name: /turn calculations into advisor-ready deliverables/i,
      }),
    ).toBeVisible();
    await expect(page.getByText(/reasons why letter preview/i)).toBeVisible();
    await expect(page.getByText(/client report preview/i)).toBeVisible();

    await page
      .getByRole("button", { name: /continue to advisor handoff/i })
      .click();
    await expect(page).toHaveURL(/\/demo\/handoff$/);
    await closeTourIfVisible(page);

    await expect(
      page.getByRole("heading", {
        name: /review your estimate with an advisor/i,
      }),
    ).toBeVisible();
    await expect(
      page.getByText(/your intake, interactive estimate, ai draft letter/i),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /connect with an advisor/i }),
    ).toBeVisible();
  });
});
