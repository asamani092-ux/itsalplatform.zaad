import { expect, test } from "@playwright/test";

test("manager approves request via magic link", async ({ page, request }) => {
  const depts = await request.get("/api/public/departments");
  const deptJson = (await depts.json()) as {
    success: boolean;
    data: { departments: { id: string }[] };
  };
  const types = await request.get("/api/public/request-types");
  const typeJson = (await types.json()) as {
    success: boolean;
    data: { requestTypes: { id: string }[] };
  };

  expect(deptJson.success).toBeTruthy();
  expect(typeJson.success).toBeTruthy();

  const createRes = await request.post("/api/public/requests", {
    data: {
      title: "طلب موافقة E2E",
      description: "اختبار مسار الموافقة",
      requiredDate: "2030-02-01",
      contactEmail: "e2e.approve@example.com",
      contactPhone: "0507654321",
      departmentId: deptJson.data.departments[0]?.id,
      requestTypeId: typeJson.data.requestTypes[0]?.id,
    },
  });
  const created = (await createRes.json()) as {
    success: boolean;
    data: { approvalUrl: string; id: string };
  };
  expect(createRes.ok()).toBeTruthy();
  expect(created.success).toBeTruthy();

  const token = new URL(created.data.approvalUrl, "http://localhost:3001").searchParams.get(
    "token",
  );
  expect(token).toBeTruthy();

  await page.goto(`/approve?token=${token}`);
  await page.getByRole("button", { name: /موافقة/ }).click();
  await expect(page.getByText(/تمت الموافقة|معتمد/)).toBeVisible({ timeout: 15_000 });
});
