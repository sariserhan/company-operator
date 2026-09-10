import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
test("Better Auth sign-in, setup, settings, missing-data run, responsive navigation and sign-out", async ({
  page,
}) => {
  const passwordPath = process.env.QA_PASSWORD_FILE;
  test.skip(
    !passwordPath,
    "Requires an explicitly configured local QA account and QA_PASSWORD_FILE.",
  );
  const password = readFileSync(passwordPath!, "utf8").trim(),
    email = process.env.QA_OPERATOR_EMAIL ?? "qa-operator@example.test";
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page).toHaveTitle("Company Operator");
  await page
    .getByRole("button", { name: "First time? Create operator account" })
    .click();
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  // Repeated local test runs use the existing account.
  const outcome = await Promise.race([
    page
      .getByRole("heading", { name: "Set up VisitorPing" })
      .waitFor()
      .then(() => "setup"),
    page
      .getByRole("heading", { name: "Business overview" })
      .waitFor()
      .then(() => "overview"),
    page
      .locator('[data-slot="alert"]')
      .waitFor()
      .then(() => "existing"),
  ]);
  if (outcome === "existing") {
    await page.getByRole("button", { name: "Back to sign in" }).click();
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
  }
  await expect(
    page.getByRole("heading", { name: /Set up VisitorPing|Business overview/ }),
  ).toBeVisible();
  if (await page.getByLabel("Company website").isVisible()) {
    await page.getByLabel("Company website").fill("https://example.test");
    await page.getByRole("button", { name: "Create workspace" }).click();
  }
  await expect(
    page.getByRole("heading", { name: "Business overview" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  await page.getByLabel("MRR target (USD)").fill("5000");
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(page.getByRole("status")).toContainText("Settings saved");
  await page.getByRole("link", { name: "Integrations", exact: true }).click();
  await page.getByRole("button", { name: "Check configuration" }).click();
  await expect(
    page.getByText("STRIPE_READ_ONLY_KEY", { exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Overview", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Business overview" }),
  ).toBeVisible();
  await page.screenshot({
    path: "/tmp/company-operator-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Run analysis", exact: true }).click();
  await expect(page).toHaveURL(/\/runs\//);
  await expect(page.locator('[data-slot="alert"]')).toContainText(
    "Critical Stripe MRR unavailable",
    { timeout: 30_000 },
  );
  await expect(
    page.getByRole("heading", { name: "Event history" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Observations", exact: true }).click();
  await expect(page.getByText("No observations recorded yet.")).toBeVisible();
  await page.getByRole("link", { name: "Overview", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Business overview" }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "/tmp/company-operator-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Welcome back" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("signed-out routes show authentication without exposing business data", async ({
  page,
}) => {
  await page.goto("/runs");
  await expect(
    page.getByRole("heading", { name: "Welcome back" }),
  ).toBeVisible();
  await expect(page.getByRole("navigation")).toHaveCount(0);
});
