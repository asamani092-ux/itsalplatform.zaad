/**
 * Lifecycle UAT across all roles — findings + screenshots.
 */
import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "node:fs";

const BASE = "http://127.0.0.1:3002";
const OUT = "/opt/cursor/artifacts/uat-lifecycle";
mkdirSync(OUT, { recursive: true });

const findings = [];
function note(kind, role, severity, title, detail = "") {
  findings.push({ kind, severity, role, title, detail: String(detail) });
  console.log(
    `[${kind}][${role}] ${title}${detail ? " — " + String(detail).slice(0, 200) : ""}`,
  );
}

async function login(email, password) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const cookies = res.headers.getSetCookie?.() ?? [];
  const body = await res.json();
  return { ok: res.ok && body.success !== false, status: res.status, body, cookies };
}

function cookieOf(cookies) {
  return cookies.map((c) => c.split(";")[0]).join("; ");
}

async function api(path, cookie = "", opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      Cookie: cookie,
      ...(opts.body ? { "Content-Type": "application/json" } : {}),
      ...(opts.headers || {}),
    },
  });
  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { ok: res.ok && body?.success !== false, status: res.status, body };
}

async function browserLogin(page, email, password) {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill("#email", email);
  await page.fill("#password", password);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle", timeout: 15000 }).catch(() => null),
    page.click('button[type="submit"]'),
  ]);
  await page.waitForTimeout(700);
}

async function shot(page, name) {
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
}

async function assertContent(page, role, route) {
  const { htmlLen, text } = await page.evaluate(() => ({
    htmlLen:
      document.querySelector(".zad-shell__content, main, [role='main']")?.innerHTML
        ?.length ||
      document.body?.innerHTML?.length ||
      0,
    text: document.body?.innerText?.trim().slice(0, 240) || "",
  }));
  if (htmlLen < 100 || text.length < 20) {
    note("error", role, "high", `شاشة فارغة على ${route}`, `html=${htmlLen}`);
  } else {
    note("ok", role, "info", `محتوى ظاهر على ${route}`, `html=${htmlLen}`);
  }
}

async function testPublic() {
  const role = "PUBLIC_SUBMITTER";
  const [admins, types, depts] = await Promise.all([
    api("/api/public/administrations"),
    api("/api/public/request-types"),
    api("/api/public/departments"),
  ]);
  note(
    admins.ok ? "ok" : "error",
    role,
    admins.ok ? "info" : "high",
    "تحميل الإدارات الخارجية",
    admins.ok
      ? `n=${admins.body.data.administrations.length}`
      : JSON.stringify(admins.body),
  );
  note(
    types.ok ? "ok" : "error",
    role,
    types.ok ? "info" : "high",
    "تحميل أنواع الطلبات",
    types.ok ? `n=${types.body.data.requestTypes.length}` : "",
  );
  note(
    depts.ok ? "ok" : "error",
    role,
    depts.ok ? "info" : "high",
    "تحميل الأقسام المستقبِلة",
    depts.ok ? `n=${depts.body.data.departments.length}` : "",
  );
  if (!types.ok || !depts.ok || !admins.ok) return;

  const type = types.body.data.requestTypes[0];
  const deptId = type.departmentId || depts.body.data.departments[0].id;
  const adminId = admins.body.data.administrations[0].id;
  const submit = await api("/api/public/requests", "", {
    method: "POST",
    body: JSON.stringify({
      title: "UAT طلب عام — دورة حياة",
      description: "اختبار اشتقاق مدير مقدّم الطلب",
      requiredDate: "2026-10-15",
      contactEmail: "uat.public@demo.zaad.org",
      contactPhone: "0551122334",
      departmentId: deptId,
      requestTypeId: type.id,
      requesterAdministrationId: adminId,
    }),
  });
  note(
    submit.ok ? "ok" : "error",
    role,
    submit.ok ? "info" : "high",
    "تقديم طلب عام",
    submit.ok
      ? `id=${submit.body.data?.id} status=${submit.body.data?.status}`
      : JSON.stringify(submit.body),
  );
}

async function testDirector() {
  const role = "DIRECTOR";
  const auth = await login("director@zaad.org", "password123");
  if (!auth.ok) {
    note("error", role, "critical", "فشل دخول مدير الإدارة", JSON.stringify(auth.body));
    return;
  }
  const user = auth.body.data.user;
  note("ok", role, "info", "دخول ناجح", `role=${user.role} desk=${user.deskAccess}`);
  const c = cookieOf(auth.cookies);

  const kpis = await api("/api/manager/kpis", c);
  if (!kpis.ok) {
    note("error", role, "high", "فشل المؤشرات", JSON.stringify(kpis.body));
  } else {
    const k = kpis.body.data.kpis;
    note(
      "ok",
      role,
      "info",
      "مؤشرات عامة",
      `total=${k.totalRequests} overdue=${k.overdueOpen} pendingMgr=${k.pendingManager}`,
    );
    if (typeof k.avgLifecycleMs === "number" && k.avgLifecycleMs < 0) {
      note("error", role, "high", "متوسط دورة الحياة سالب (خلل SLA)", String(k.avgLifecycleMs));
    }
    if (typeof k.avgAssignmentMs === "number" && k.avgAssignmentMs < 0) {
      note("error", role, "high", "متوسط زمن الإسناد سالب", String(k.avgAssignmentMs));
    }
  }

  const grants = await api("/api/manager/grants", c);
  note(
    grants.ok ? "ok" : "error",
    role,
    grants.ok ? "info" : "high",
    "قائمة المنح",
    grants.ok ? `n=${grants.body.data.grants.length}` : JSON.stringify(grants.body),
  );

  const created = await api("/api/manager/grants", c, {
    method: "POST",
    body: JSON.stringify({
      title: "منحة UAT دورة حياة",
      donorName: "مانح الاختبار",
      amount: 12000,
      details: "اختبار إنشاء مراحل",
      stageCount: 2,
    }),
  });
  const grant = created.body?.data;
  if (!created.ok || !grant?.id) {
    note("error", role, "high", "فشل إنشاء منحة", JSON.stringify(created.body));
  } else {
    note("ok", role, "info", "إنشاء منحة", `id=${grant.id} stages=${grant.stages?.length}`);
    const stage = grant.stages?.[0];
    if (stage) {
      const upd = await api(`/api/manager/grants/${grant.id}/stages`, c, {
        method: "PATCH",
        body: JSON.stringify({ stageId: stage.id, status: "Done", note: "متابعة UAT" }),
      });
      note(
        upd.ok ? "ok" : "error",
        role,
        upd.ok ? "info" : "medium",
        "تحديث مرحلة منحة",
        upd.ok ? "Done" : JSON.stringify(upd.body),
      );
    }
    const close = await api(`/api/manager/grants/${grant.id}`, c, {
      method: "PATCH",
      body: JSON.stringify({ status: "Closed" }),
    });
    note(
      close.ok ? "ok" : "warn",
      role,
      close.ok ? "info" : "medium",
      "إغلاق منحة",
      close.ok ? "Closed" : JSON.stringify(close.body),
    );
  }

  const team = await api("/api/manager/team", c);
  note(
    team.ok ? "ok" : "error",
    role,
    team.ok ? "info" : "high",
    "تحميل الفريق",
    team.ok
      ? `n=${team.body.data.employees?.length ?? team.body.data.count}`
      : JSON.stringify(team.body),
  );

  const tickets = await api("/api/manager/tickets?view=all", c);
  note(
    tickets.ok ? "ok" : "error",
    role,
    tickets.ok ? "info" : "high",
    "طلبات اللوحة",
    tickets.ok
      ? `n=${tickets.body.data.requests?.length ?? tickets.body.data.count}`
      : JSON.stringify(tickets.body),
  );

  const admins = await api("/api/manager/settings/administrations", c);
  note(
    admins.ok ? "ok" : "warn",
    role,
    admins.ok ? "info" : "medium",
    "دليل الإدارات في الإعدادات",
    admins.ok
      ? `n=${admins.body.data.administrations?.length}`
      : JSON.stringify(admins.body),
  );
}

async function testSectionManager() {
  const role = "SECTION_MANAGER";
  const auth = await login("manager@zaad.org", "password123");
  if (!auth.ok) {
    note("error", role, "critical", "فشل دخول مدير القسم", JSON.stringify(auth.body));
    return;
  }
  note("ok", role, "info", "دخول ناجح", `role=${auth.body.data.user.role}`);
  const c = cookieOf(auth.cookies);

  const grants = await api("/api/manager/grants", c);
  if (grants.status === 403) note("ok", role, "info", "حظر المنح عن مدير القسم", "403");
  else if (grants.ok) note("error", role, "high", "مدير القسم وصل لإدارة المنح", "");
  else note("warn", role, "medium", "استجابة غير متوقعة للمنح", `status=${grants.status}`);

  const kpis = await api("/api/manager/kpis", c);
  if (!kpis.ok) note("error", role, "high", "فشل المؤشرات", JSON.stringify(kpis.body));
  else {
    const k = kpis.body.data.kpis;
    const names = (k.byDepartment || []).map((d) => d.departmentName).join(",");
    note("ok", role, "info", "مؤشرات مقيّدة بالقسم", `depts=[${names}] total=${k.totalRequests}`);
  }

  const team = await api("/api/manager/team", c);
  const employees = team.body?.data?.employees || [];
  note(team.ok ? "ok" : "error", role, team.ok ? "info" : "high", "فريق القسم", `n=${employees.length}`);

  const tickets = await api("/api/manager/tickets?view=all", c);
  const reqs = tickets.body?.data?.requests || [];
  note(tickets.ok ? "ok" : "error", role, tickets.ok ? "info" : "high", "طلبات كانبان القسم", `n=${reqs.length}`);

  const assignable = reqs.find(
    (r) =>
      String(r.status).includes("Pending_Assignment") ||
      String(r.status).includes("Approved_Pending"),
  );
  const emp = employees.find((e) => e.role === "EMPLOYEE" && e.isActive);
  if (assignable && emp) {
    const assign = await api(`/api/manager/tickets/${assignable.id}/assign`, c, {
      method: "POST",
      body: JSON.stringify({ employeeId: emp.id }),
    });
    note(
      assign.ok ? "ok" : "warn",
      role,
      assign.ok ? "info" : "medium",
      "إسناد طلب لموظف",
      assign.ok ? emp.email : JSON.stringify(assign.body),
    );
  } else {
    note("warn", role, "low", "لا يوجد طلب قابل للإسناد الآن", "");
  }
}

async function testReception() {
  const role = "RECEPTION_EMPLOYEE";
  const auth = await login("reception@zaad.org", "password123");
  if (!auth.ok) {
    note("error", role, "critical", "فشل دخول الاستقبال", JSON.stringify(auth.body));
    return;
  }
  const u = auth.body.data.user;
  note("ok", role, "info", "دخول ناجح", `role=${u.role} deskAccess=${u.deskAccess}`);
  if (u.role !== "EMPLOYEE") note("error", role, "high", "دور الاستقبال ليس EMPLOYEE بعد الدمج", u.role);
  if (!u.deskAccess) note("error", role, "high", "deskAccess=false لموظف الاستقبال", "");
  const c = cookieOf(auth.cookies);

  const desk = await api("/api/reception/desk", c);
  note(
    desk.ok ? "ok" : "error",
    role,
    desk.ok ? "info" : "high",
    "API مكتب الاستقبال",
    desk.ok ? "ok" : JSON.stringify(desk.body),
  );

  for (const [path, label] of [
    ["/api/manager/grants", "المنح"],
    ["/api/manager/team", "الفريق"],
    ["/api/manager/kpis", "المؤشرات"],
  ]) {
    const r = await api(path, c);
    if (r.status === 401 || r.status === 403) note("ok", role, "info", `حظر ${label}`, String(r.status));
    else if (r.ok) note("error", role, "high", `وصول غير مصرّح إلى ${label}`, "");
    else note("warn", role, "low", `استجابة ${label}`, String(r.status));
  }
}

async function testEmployee() {
  const role = "EMPLOYEE";
  const auth = await login("sara.comm@zaad.org", "password123");
  if (!auth.ok) {
    note("error", role, "critical", "فشل دخول الموظف", JSON.stringify(auth.body));
    return;
  }
  note(
    "ok",
    role,
    "info",
    "دخول ناجح",
    `role=${auth.body.data.user.role} desk=${auth.body.data.user.deskAccess}`,
  );
  const c = cookieOf(auth.cookies);

  const tickets = await api("/api/employee/tickets", c);
  const list = tickets.body?.data?.tickets || tickets.body?.data?.requests || [];
  note(tickets.ok ? "ok" : "error", role, tickets.ok ? "info" : "high", "تذاكر الموظف", `n=${list.length}`);

  const open = list.find(
    (t) => String(t.status).includes("In_Progress") || String(t.status).includes("Progress"),
  );
  if (open) {
    const complete = await api(`/api/employee/tickets/${open.id}/complete`, c, {
      method: "POST",
      body: JSON.stringify({ note: "إكمال من UAT" }),
    });
    note(
      complete.ok ? "ok" : "warn",
      role,
      complete.ok ? "info" : "medium",
      "إكمال تذكرة",
      complete.ok ? open.id : JSON.stringify(complete.body),
    );
  } else {
    note("warn", role, "low", "لا توجد تذكرة قيد التنفيذ", "");
  }

  const kpis = await api("/api/manager/kpis", c);
  if (kpis.status === 401 || kpis.status === 403) note("ok", role, "info", "حظر مؤشرات المدير", String(kpis.status));
  else if (kpis.ok) note("error", role, "high", "الموظف وصل لمؤشرات المدير", "");
}

async function browserFlows() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "/usr/local/bin/google-chrome",
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.setDefaultTimeout(20000);

  await page.goto(`${BASE}/request`, { waitUntil: "networkidle" });
  await shot(page, "01-public-request");
  const labels = await page.$$eval("label", (els) =>
    els.map((e) => e.textContent?.trim()).filter(Boolean),
  );
  note("ok", "PUBLIC_SUBMITTER", "info", "تسميات النموذج العام", labels.slice(0, 12).join(" | "));
  const hasRequester = labels.some((l) => /إدارتك|مقدّم الطلب|مقدم الطلب/.test(l || ""));
  if (!hasRequester) {
    note(
      "warn",
      "PUBLIC_SUBMITTER",
      "high",
      "حقل إدارة مقدّم الطلب غير واضح في الواجهة العامة",
      labels.join(", "),
    );
  } else {
    note("ok", "PUBLIC_SUBMITTER", "info", "حقل إدارة مقدّم الطلب ظاهر", "");
  }

  await browserLogin(page, "director@zaad.org", "password123");
  await shot(page, "02-director-landing");
  note("ok", "DIRECTOR", "info", "وجهة الدخول", page.url());
  await assertContent(page, "DIRECTOR", page.url());
  await page.goto(`${BASE}/dashboard/grants`, { waitUntil: "networkidle" });
  await shot(page, "03-director-grants");
  await assertContent(page, "DIRECTOR", "/dashboard/grants");
  await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
  await shot(page, "04-director-kpis");
  const overdue = await page.locator("text=متأخر").count();
  note(
    overdue > 0 ? "ok" : "warn",
    "DIRECTOR",
    overdue > 0 ? "info" : "medium",
    "إبراز المتأخرة في الواجهة",
    `matches=${overdue}`,
  );

  await page.context().clearCookies();
  await browserLogin(page, "manager@zaad.org", "password123");
  await shot(page, "05-sm-landing");
  note("ok", "SECTION_MANAGER", "info", "وجهة الدخول", page.url());
  await page.goto(`${BASE}/dashboard/grants`, { waitUntil: "networkidle" });
  await shot(page, "06-sm-grants");
  const smGrants = await page.innerText("body");
  if (/إضافة منحة/.test(smGrants) && !/صلاحية|غير مفعّلة|مطلوبة|ممنوع|لا يمكن/.test(smGrants)) {
    note("error", "SECTION_MANAGER", "high", "واجهة إنشاء المنح تبدو متاحة لمدير القسم", "");
  } else {
    note("ok", "SECTION_MANAGER", "info", "مدير القسم لا يملك أدوات إنشاء المنح", "");
  }
  await page.goto(`${BASE}/dashboard/kanban`, { waitUntil: "networkidle" });
  await shot(page, "07-sm-kanban");
  await assertContent(page, "SECTION_MANAGER", "/dashboard/kanban");

  await page.context().clearCookies();
  await browserLogin(page, "reception@zaad.org", "password123");
  await shot(page, "08-reception-landing");
  note("ok", "RECEPTION_EMPLOYEE", "info", "وجهة الدخول", page.url());
  if (!/reception|employee/.test(page.url())) {
    note("warn", "RECEPTION_EMPLOYEE", "medium", "وجهة دخول غير متوقعة", page.url());
  }
  await page.goto(`${BASE}/dashboard/reception`, { waitUntil: "networkidle" });
  await shot(page, "09-reception-desk");
  await assertContent(page, "RECEPTION_EMPLOYEE", "/dashboard/reception");
  await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
  await shot(page, "10-reception-dashboard");
  const rText = await page.innerText("body");
  if (/إجمالي الطلبات|نسبة الإكمال/.test(rText) && /\/dashboard\/?$/.test(page.url())) {
    note("error", "RECEPTION_EMPLOYEE", "high", "موظف الاستقبال يرى مؤشرات لوحة الإدارة", page.url());
  } else {
    note("ok", "RECEPTION_EMPLOYEE", "info", "لا وصول لمؤشرات الإدارة", page.url());
  }

  await page.context().clearCookies();
  await browserLogin(page, "sara.comm@zaad.org", "password123");
  await shot(page, "11-employee-landing");
  note("ok", "EMPLOYEE", "info", "وجهة الدخول", page.url());
  if (!page.url().includes("/employee")) {
    note("warn", "EMPLOYEE", "medium", "لم يُحوَّل إلى /employee", page.url());
  }
  await assertContent(page, "EMPLOYEE", page.url());
  await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
  await shot(page, "12-employee-dashboard");
  const eText = await page.innerText("body");
  if (/إجمالي الطلبات/.test(eText) && /\/dashboard\/?$/.test(page.url())) {
    note("error", "EMPLOYEE", "critical", "الموظف وصل للوحة المدير", page.url());
  } else {
    note("ok", "EMPLOYEE", "info", "إعادة توجيه بعيداً عن لوحة المدير", page.url());
  }

  await page.context().clearCookies();
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await shot(page, "13-login");
  const help = await page.locator("text=/حسابات|تجريب|password|مدير الإدارة/").count();
  if (help === 0) note("warn", "ALL", "low", "لا توجد تلميحات حسابات تجريبية في صفحة الدخول", "");

  await browser.close();
}

await testPublic();
await new Promise((r) => setTimeout(r, 15000));
await testDirector();
await new Promise((r) => setTimeout(r, 15000));
await testSectionManager();
await new Promise((r) => setTimeout(r, 15000));
await testReception();
await new Promise((r) => setTimeout(r, 15000));
await testEmployee();
await new Promise((r) => setTimeout(r, 65000));
await browserFlows();

const summary = {
  generatedAt: new Date().toISOString(),
  base: BASE,
  branch: "main @ PR#5 merged",
  counts: {
    total: findings.length,
    errors: findings.filter((f) => f.kind === "error").length,
    warns: findings.filter((f) => f.kind === "warn").length,
    oks: findings.filter((f) => f.kind === "ok").length,
  },
  findings,
};
writeFileSync(`${OUT}/findings.json`, JSON.stringify(summary, null, 2));
writeFileSync(
  `${OUT}/findings.md`,
  findings
    .map(
      (f) =>
        `- **[${f.kind}/${f.role}/${f.severity}]** ${f.title}${f.detail ? `: ${f.detail}` : ""}`,
    )
    .join("\n"),
);
console.log("\n=== SUMMARY ===");
console.log(JSON.stringify(summary.counts, null, 2));
