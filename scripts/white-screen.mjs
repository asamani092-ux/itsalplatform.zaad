import { chromium } from "playwright";

const base = "http://127.0.0.1:3002";
const browser = await chromium.launch({
  headless: true,
  executablePath: "/usr/local/bin/google-chrome",
  args: ["--no-sandbox"],
});
const page = await browser.newPage();
const errors = [];
const pageErrors = [];
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(msg.text());
});
page.on("pageerror", (err) => pageErrors.push(String(err)));

await page.goto(base + "/", { waitUntil: "networkidle" });
await page.fill("#email", "manager@zaad.org");
await page.fill("#password", "password123");
await page.click('button[type="submit"]');
await page.waitForURL("**/dashboard**", { timeout: 15000 });
console.log("landed", page.url());

const hrefs = [
  "/dashboard",
  "/dashboard/kanban",
  "/dashboard/reception",
  "/dashboard/forms",
  "/dashboard/hospitality",
  "/dashboard/media",
  "/dashboard/team",
  "/dashboard/settings",
];

let failed = 0;
for (const href of hrefs) {
  errors.length = 0;
  pageErrors.length = 0;
  await page.goto(base + href, { waitUntil: "networkidle", timeout: 20000 });
  await page.waitForTimeout(500);
  const mainHtml = await page.evaluate(
    () => document.querySelector(".zad-shell__content")?.innerHTML?.length || 0,
  );
  const bodyText = await page.evaluate(() => document.body?.innerText?.trim().slice(0, 120) || "");
  const blank = mainHtml < 50 || bodyText.length < 10;
  const chunkErr = pageErrors.some((e) => /ChunkLoadError|Loading chunk/i.test(e));
  if (blank || chunkErr) failed += 1;
  console.log(
    JSON.stringify({
      href,
      blank,
      mainHtml,
      chunkErr,
      pageErrors: pageErrors.slice(0, 3),
      errors: errors.filter((e) => /chunk|400|MIME/i.test(e)).slice(0, 3),
    }),
  );
}

await page.goto(base + "/dashboard/reception", { waitUntil: "networkidle" });
const tabs = await page.$$eval('[role="tab"]', (ts) => ts.map((t) => t.textContent?.trim()));
console.log("reception tabs", tabs);
for (const label of tabs) {
  pageErrors.length = 0;
  await page.click(`button[role="tab"]:has-text("${label}")`);
  await page.waitForTimeout(400);
  const mainHtml = await page.evaluate(
    () => document.querySelector(".zad-shell__content")?.innerHTML?.length || 0,
  );
  console.log(JSON.stringify({ tab: label, mainHtml, pageErrors: [...pageErrors] }));
}

await browser.close();
process.exit(failed > 0 ? 1 : 0);
