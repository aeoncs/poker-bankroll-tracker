import { test, expect } from "@playwright/test";

test("logged-out user is redirected from /dashboard to /login", async ({ page }) => {
  // Go to a protected route
  await page.goto("/dashboard");

  // Should bounce to login
  await page.waitForURL(/\/login/, { timeout: 20000 });
  await expect(page.getByRole("button", { name: /^sign in$/i })).toBeVisible();
});

test("logged-out user is redirected from /sessions to /login", async ({ page }) => {
  await page.goto("/sessions");

  await page.waitForURL(/\/login/, { timeout: 20000 });
  await expect(page.getByRole("button", { name: /^sign in$/i })).toBeVisible();
});

test("logged-out user is redirected from /settings to /login", async ({ page }) => {
  await page.goto("/settings");

  await page.waitForURL(/\/login/, { timeout: 20000 });
  await expect(page.getByRole("button", { name: /^sign in$/i })).toBeVisible();
});