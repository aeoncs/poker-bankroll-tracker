import { test, expect } from "@playwright/test";

function uniqueEmail() {
  return `e2e_${Date.now()}_${Math.floor(Math.random() * 1e6)}@example.com`;
}

test("logged-in onboarded user is redirected away from /login and /register", async ({ page }) => {
  const email = uniqueEmail();
  const password = "Password123!";

  // Register
  await page.goto("/register");
  await page.getByRole("textbox", { name: /^Email$/ }).fill(email);
  await page.getByPlaceholder(/create a password/i).fill(password);

  await Promise.all([
    page.waitForResponse((res) => res.url().includes("/api/auth/register") && res.request().method() === "POST"),
    page.getByRole("button", { name: /create account/i }).click(),
  ]);

  // Setup (complete onboarding)
  await page.waitForURL(/\/setup/, { timeout: 20000 });

  await page.getByLabel(/^Bankroll name$/i).fill("Main");
  await page.getByLabel(/currency \(3 letters\)/i).fill("USD");
  await page.getByLabel(/starting bankroll/i).fill("1000");

  await Promise.all([
    page.waitForResponse((res) => res.url().includes("/api/users/setup") && res.request().method() === "POST"),
    page.getByRole("button", { name: /finish setup/i }).click(),
  ]);

  await page.waitForURL(/\/dashboard/, { timeout: 20000 });

  await page.goto("/login");
  await page.waitForURL(/\/dashboard/, { timeout: 20000 });

  await page.goto("/register");
  await page.waitForURL(/\/dashboard/, { timeout: 20000 });

  // Confirm we really are on dashboard and user appears
  await expect(page.getByText(email, { exact: false })).toBeVisible();
});