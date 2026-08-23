import { expect, test } from "@playwright/test";

test("employee completes assigned ticket", async ({ page, request }) => {
  const login = await request.post("/api/auth/login", {
    data: { email: "manager@zaad.org", password: "password123" },
  });
  expect(login.ok()).toBeTruthy();

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
      title: "تذكرة إكمال موظف E2E",
      description: "اختبار الإكمال من مساحة الموظف",
      requiredDate: "2030-04-01",
      contactEmail: "e2e.employee@example.com",
      contactPhone: "0502223344",
      departmentId: deptJson.data.departments[0]?.id,
      requestTypeId: typeJson.data.requestTypes[0]?.id,
    },
  });
  expect(created.ok()).toBeTruthy();

  const team = await request.get("/api/manager/team");
  const teamJson = (await team.json()) as {
    data: { employees: { id: string; role: string }[] };
  };
  const employee = teamJson.data.employees.find((e) => e.role === "EMPLOYEE");
  expect(employee).toBeTruthy();

  const tickets = await request.get("/api/manager/tickets?view=all");
  const ticketsJson = (await tickets.json()) as {
    data: { requests: { id: string; title: string; status: string }[] };
  };
  const target = ticketsJson.data.requests.find(
    (r) => r.title === "تذكرة إكمال موظف E2E",
  );
  expect(target).toBeTruthy();
  expect(target?.status).toBe("Approved_Pending_Assignment");

  await request.post(`/api/manager/tickets/${target!.id}/assign`, {
    data: { employeeId: employee!.id },
  });

  await request.post("/api/auth/logout");

  await page.goto("/login");
  await page.fill("#email", "sara.comm@zaad.org");
  await page.fill("#password", "password123");
  await page.getByRole("button", { name: "دخول" }).click();
  await page.waitForURL(/\/employee/);

  await page.goto(`/employee/tickets/${target!.id}`);
  await page.getByRole("button", { name: /إكمال|مكتمل/ }).click();
  await expect(page.getByText(/مكتمل|تم الإكمال/)).toBeVisible({ timeout: 15_000 });
});
