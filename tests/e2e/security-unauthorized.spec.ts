import { expect, test } from "@playwright/test";

test("legacy manager APIs reject unauthenticated requests", async ({ request }) => {
  const employees = await request.get("/api/employees");
  expect(employees.status()).toBe(401);

  const dashboard = await request.get("/api/dashboard/requests");
  expect(dashboard.status()).toBe(401);
});

test("employee session cannot access manager KPIs", async ({ request }) => {
  const login = await request.post("/api/auth/login", {
    data: { email: "sara.comm@zaad.org", password: "password123" },
  });
  expect(login.ok()).toBeTruthy();

  const kpis = await request.get("/api/manager/kpis");
  expect(kpis.status()).toBe(403);
});

test("public request appears directly on manager board", async ({ request }) => {
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
      title: "طلب مباشر للوحة E2E",
      description: "بدون موافقة مدير جهة",
      requiredDate: "2030-05-01",
      contactEmail: "e2e.direct@example.com",
      contactPhone: "0503334455",
      departmentId: deptJson.data.departments[0]?.id,
      requestTypeId: typeJson.data.requestTypes[0]?.id,
    },
  });
  const createdJson = (await created.json()) as {
    success: boolean;
    data: { id: string; approvalUrl: string | null; status: string };
  };
  expect(created.ok()).toBeTruthy();
  expect(createdJson.success).toBeTruthy();
  expect(createdJson.data.approvalUrl).toBeNull();

  const login = await request.post("/api/auth/login", {
    data: { email: "manager@zaad.org", password: "password123" },
  });
  expect(login.ok()).toBeTruthy();

  const tickets = await request.get("/api/manager/tickets?view=all");
  const ticketsJson = (await tickets.json()) as {
    data: { requests: { id: string; title: string; status: string }[] };
  };
  const target = ticketsJson.data.requests.find(
    (r) => r.title === "طلب مباشر للوحة E2E",
  );
  expect(target).toBeTruthy();
  expect(target?.status).toBe("Approved_Pending_Assignment");
});
