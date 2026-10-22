import { expect, test } from "@playwright/test";

test("landing page renders", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Writerdost/i);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("login page renders", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByPlaceholder("you@company.com")).toBeVisible();
  await expect(page.getByPlaceholder("••••••••")).toBeVisible();
});
