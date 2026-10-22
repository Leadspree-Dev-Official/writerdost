import { expect, test } from "@playwright/test";

test("landing page renders", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Writerdost/i);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("login page exposes labelled fields", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByLabel("Work Email Address")).toBeVisible();
  await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute(
    "autocomplete",
    "current-password",
  );
});

test("signup page exposes labelled fields and consent", async ({ page }) => {
  await page.goto("/signup");
  await expect(page.getByLabel("Full Name")).toBeVisible();
  await expect(page.getByLabel("Work Email Address")).toBeVisible();
  await expect(page.getByLabel(/I agree to the/)).toBeVisible();
});
