import { expect, test } from "@playwright/test";

test("public mobile welcome screen opens role selection", async ({ page }) => {
  await page.route(/^https?:\/\/(?!127\.0\.0\.1(?::|\/)).*/, (route) =>
    route.abort(),
  );
  await page.goto("/");

  await expect(page.getByText("Get Started", { exact: true })).toBeVisible();
  await page.getByText("Get Started", { exact: true }).click();
  await expect(
    page.getByText("Choose your role to personalize your experience"),
  ).toBeVisible();
});
