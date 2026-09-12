/**
 * Auth smoke: 401 without session, 403 for wrong role / out-of-scope section manager.
 * Usage: BASE_URL=http://127.0.0.1:3002 node scripts/auth-smoke.mjs
 */
const BASE = process.env.BASE_URL || "http://127.0.0.1:3002";

const PROTECTED = [
  { method: "GET", path: "/api/dashboard/requests" },
  { method: "GET", path: "/api/manager/tickets" },
  { method: "GET", path: "/api/manager/grants" },
  { method: "POST", path: "/api/manager/tickets/__missing__/assign", body: { employeeId: "x" } },
  { method: "PATCH", path: "/api/dashboard/requests/__missing__/status", body: { status: "Archived" } },
];

let failed = 0;

function ok(label) {
  console.log(`OK  ${label}`);
}
function fail(label, detail) {
  failed += 1;
  console.error(`FAIL ${label} — ${detail}`);
}

async function login(email, password) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const cookies = res.headers.getSetCookie?.() ?? [];
  const body = await res.json().catch(() => ({}));
  return {
    ok: res.ok && body.success !== false,
    status: res.status,
    cookie: cookies.map((c) => c.split(";")[0]).join("; "),
    body,
  };
}

async function api(path, cookie = "", opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method: opts.method || "GET",
    headers: {
      ...(cookie ? { Cookie: cookie } : {}),
      ...(opts.body ? { "Content-Type": "application/json" } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}

async function main() {
  console.log(`auth-smoke against ${BASE}`);

  for (const route of PROTECTED) {
    const r = await api(route.path, "", {
      method: route.method,
      body: route.body,
    });
    if (r.status === 401) ok(`401 ${route.method} ${route.path}`);
    else fail(`401 ${route.method} ${route.path}`, `got ${r.status}`);
  }

  const emp = await login("sara.comm@zaad.org", "password123");
  if (!emp.ok) {
    fail("employee login", JSON.stringify(emp.body));
  } else {
    ok("employee login");
    const r = await api("/api/dashboard/requests", emp.cookie);
    if (r.status === 403) ok("403 employee → dashboard/requests");
    else fail("403 employee → dashboard/requests", `got ${r.status}`);

    const g = await api("/api/manager/grants", emp.cookie);
    if (g.status === 403) ok("403 employee → grants");
    else fail("403 employee → grants", `got ${g.status}`);
  }

  const mgr = await login("manager@zaad.org", "password123");
  if (!mgr.ok) {
    fail("section manager login", JSON.stringify(mgr.body));
  } else {
    ok("section manager login");
    const list = await api("/api/dashboard/requests", mgr.cookie);
    if (list.status === 200) ok("200 section manager → dashboard/requests");
    else fail("200 section manager → dashboard/requests", `got ${list.status}`);

    const grants = await api("/api/manager/grants", mgr.cookie);
    if (grants.status === 403) ok("403 section manager → grants (director only)");
    else fail("403 section manager → grants", `got ${grants.status}`);
  }

  const dir = await login("director@zaad.org", "password123");
  if (!dir.ok) {
    fail("director login", JSON.stringify(dir.body));
  } else {
    ok("director login");
    const grants = await api("/api/manager/grants", dir.cookie);
    if (grants.status === 200) ok("200 director → grants");
    else fail("200 director → grants", `got ${grants.status}`);

    const all = await api("/api/dashboard/requests?view=all", dir.cookie);
    const requests = all.body?.data?.requests || [];
    const foreign = requests.find(
      (r) =>
        r.department?.slug === "partnerships" ||
        r.department?.slug === "general" ||
        (r.contactEmail && String(r.contactEmail).includes("partner@")),
    );
    if (!foreign) {
      fail("find out-of-scope request", "no partnerships/general request in seed");
    } else if (!mgr.ok) {
      fail("403 out-of-scope", "manager login failed earlier");
    } else {
      const denied = await api(`/api/dashboard/requests/${foreign.id}`, mgr.cookie);
      if (denied.status === 403) ok(`403 section manager → foreign ticket ${foreign.id}`);
      else fail("403 section manager → foreign ticket", `got ${denied.status}`);

      const deniedAssign = await api(
        `/api/manager/tickets/${foreign.id}/status`,
        mgr.cookie,
        { method: "PATCH", body: { status: "Archived" } },
      );
      if (deniedAssign.status === 403) ok("403 section manager → foreign status write");
      else fail("403 section manager → foreign status write", `got ${deniedAssign.status}`);
    }
  }

  if (failed > 0) {
    console.error(`\nauth-smoke FAILED (${failed})`);
    process.exit(1);
  }
  console.log("\nauth-smoke PASSED");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
