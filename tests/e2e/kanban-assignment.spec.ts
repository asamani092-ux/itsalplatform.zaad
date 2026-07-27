import { expect, test } from "@playwright/test";

test("manager assigns approved request on kanban", async ({ page, request }) => {
  await page.goto("/login");
  await page.fill("#phone", "0500000001");
  await page.fill("#password", "password123");
  await page.getByRole("button", { name: "دخول" }).click();
  await page.waitForURL(/\/dashboard/);

  // Ensure there is an assignable ticket
  const depts = await request.get("/api/public/departments");
  const deptJson = (await depts.json()) as {
    data: { departments: { id: string }[] };
  };
  const types = await request.get("/api/public/request-types");
  const typeJson = (await types.json()) as {
    data: { requestTypes: { id: string }[] };
  };
  const created = await request.post("/api/public/requests", {
    data: {
      title: "طلب إسناد Kanban E2E",
      description: "اختبار الإسناد من اللوحة",
      requiredDate: "2030-03-01",
      contactEmail: "e2e.kanban@example.com",
      contactPhone: "0501112233",
      departmentId: deptJson.data.departments[0]?.id,
      requestTypeId: typeJson.data.requestTypes[0]?.id,
    },
  });
  const createdJson = (await created.json()) as {
    data: { approvalUrl: string };
  };
  const token = new URL(
    createdJson.data.approvalUrl,
    "http://localhost:3001",
  ).searchParams.get("token");
  await request.post(`/api/approve?token=${token}`);

  await page.goto("/dashboard/kanban");
  await expect(page.getByText("طلب إسناد Kanban E2E")).toBeVisible({ timeout: 15_000 });

  const assignSelect = page.locator('select[id^="assign-"]').first();
  await assignSelect.selectOption({ index: 1 });
  await expect(page.getByText("وضع علامة مكتمل").first()).toBeVisible({
    timeout: 15_000,
  });
});
