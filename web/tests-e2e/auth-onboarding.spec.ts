import { test, expect } from "@playwright/test";

function uniqueEmail() {
  return `e2e_${Date.now()}_${Math.floor(Math.random() * 1e6)}@example.com`;
}

test("register -> setup -> dashboard", async ({ page, request }) => {
  const email = uniqueEmail();
  const password = "Password123!";

  
  const reg = await request.post("http://localhost:4000/api/auth/register", {
    data: { email, password },
  });
  expect(reg.ok()).toBeTruthy();


  const cookies = await request.storageState();
  await page.context().addCookies(cookies.cookies);

  await page.goto("/setup");
  await expect(page).toHaveURL(/\/setup/);

  await page.getByLabel(/^Bankroll name$/i).fill("Main");
  await page.getByLabel(/currency \(3 letters\)/i).fill("USD");
  await page.getByLabel(/starting bankroll/i).fill("1000");

  const [setupRes] = await Promise.all([
    page.waitForResponse(
      (res) => res.url().includes("/api/users/setup") && res.request().method() === "POST"
    ),
    page.getByRole("button", { name: /finish setup/i }).click(),
  ]);

  expect(setupRes.ok()).toBeTruthy();

  await page.waitForURL(/\/dashboard/, { timeout: 20000 });
  await expect(page.getByText(email, { exact: false })).toBeVisible();
});