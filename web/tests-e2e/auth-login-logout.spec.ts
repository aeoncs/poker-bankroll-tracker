import { test, expect } from "@playwright/test";

function uniqueEmail() {
  return `e2e_${Date.now()}_${Math.floor(Math.random() * 1e6)}@example.com`;
}

test("login -> dashboard -> logout -> login", async ({ page, request }) => {
  const email = uniqueEmail();
  const password = "Password123!";

  // Create a user via API
  const reg = await request.post("http://localhost:4000/api/auth/register", {
    data: { email, password },
  });
  expect(reg.ok()).toBeTruthy();

  // Logout via API
  const out = await request.post("http://localhost:4000/api/auth/logout");
  expect(out.ok()).toBeTruthy();

  // Go to login UI
  await page.goto("/login");
  await expect(page).toHaveURL(/\/login/);

  // Fill login form (use stable selectors)
  await page.getByRole("textbox", { name: /^Email$/ }).fill(email);
  await page.getByPlaceholder(/your password/i).fill(password);

  const [loginRes] = await Promise.all([
    page.waitForResponse((res) => res.url().includes("/api/auth/login") && res.request().method() === "POST"),
    page.getByRole("button", { name: /^sign in$/i }).click(),
  ]);
  expect(loginRes.ok()).toBeTruthy();

  // Should land on dashboard
  await page.waitForURL(/\/dashboard/, { timeout: 20000 });
  await expect(page.getByText(email, { exact: false })).toBeVisible();

  // Logout (button in AppNav or page)
  const logoutBtn = page.getByRole("button", { name: /logout/i }).first();
  await expect(logoutBtn).toBeVisible();

  const [logoutRes] = await Promise.all([
    page.waitForResponse((res) => res.url().includes("/api/auth/logout") && res.request().method() === "POST"),
    logoutBtn.click(),
  ]);
  expect(logoutRes.ok()).toBeTruthy();

  // Should return to login
  await page.waitForURL(/\/login/, { timeout: 20000 });
  await expect(page.getByRole("button", { name: /^sign in$/i })).toBeVisible();
});