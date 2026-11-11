import { test, expect } from "@playwright/test";
test("register, create a project and task, persist completion, and navigate", async ({
  page,
}) => {
  const suffix = crypto.randomUUID().slice(0, 8);
  await page.goto("/");
  await page
    .getByRole("button", { name: "Create an account", exact: true })
    .click();
  await page.getByLabel('Company name').fill(`E2E Company ${suffix}`);
  await page.getByLabel('Company email').fill(`company_${suffix}@taskflow.test`);
  await page.getByRole('button',{name:/Continue to administrator setup/}).click();
  await page.getByLabel('Full name').fill('E2E Owner');
  await page.getByLabel("Username", { exact: true }).fill(`e2e_${suffix}`);
  await page.getByLabel("Email address").fill(`e2e_${suffix}@taskflow.test`);
  await page
    .getByLabel("Password", { exact: true })
    .fill("Browser test passphrase");
  await page.getByLabel("Confirm password").fill("Browser test passphrase");
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Dashboard", exact: true }),
  ).toBeVisible();
  await page.goto("/#projects");
  await page.getByRole("button", { name: "New project" }).click();
  await page.getByLabel("Project name").fill("Launch project");
  await page.getByRole("button", { name: "Save project" }).click();
  await expect(
    page.getByRole("button", { name: "Launch project", exact: true }),
  ).toBeVisible();
  await page.goto("/#tasks");
  await page.getByRole("button", { name: "New task", exact: true }).click();
  await page.getByLabel("Task title").fill("Verify release");
  await page
    .getByRole("button", { name: "Create task", exact: true })
    .last()
    .click();
  await expect(
    page.getByRole("button", { name: /Verify release/ }),
  ).toBeVisible();
  const saved = page.waitForResponse(
    (r) =>
      r.request().method() === "PATCH" &&
      r.url().includes("/tasks/") &&
      r.status() === 200,
  );
  await page.getByRole("checkbox", { name: "Complete Verify release" }).click();
  await saved;
  await expect(
    page.getByRole("checkbox", { name: "Complete Verify release" }),
  ).toBeChecked();
  await page.reload();
  await expect(
    page.getByRole("checkbox", { name: "Complete Verify release" }),
  ).toBeChecked();
  await page.goto("/#calendar");
  await expect(page.locator(".calendar")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
});
