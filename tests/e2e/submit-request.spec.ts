import { expect, test } from "@playwright/test";

test("public form submits and shows reference number", async ({ page }) => {
  await page.goto("/");

  await page.waitForSelector("#department");
  await page.selectOption("#department", { index: 1 });
  await page.selectOption("#requestType", { index: 1 });
  await page.fill("#title", "طلب اختبار E2E");
  await page.fill("#description", "وصف طلب الاختبار الآلي للمنصة");
  await page.fill("#requiredDate", "2030-01-15");
  await page.fill("#contactEmail", "e2e.submitter@example.com");
  await page.fill("#contactPhone", "0501234567");

  await page.getByRole("button", { name: "تقديم الطلب" }).click();
  await expect(page.getByText("تم تقديم الطلب بنجاح")).toBeVisible({ timeout: 15_000 });
  await expect(page.locator("text=/#[A-Z0-9]{6,}/")).toBeVisible();
});
