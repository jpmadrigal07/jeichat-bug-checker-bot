import { firefox } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const runDir = "C:/zkript-solutions/in-house/jeichat-bug-checker-bot/runs/2b71ad83-5092-4cd1-a114-f17d24b8a3c7";
const email = "test.account@gmail.com";
const password = "123123123";

const browser = await firefox.launch({ headless: true });
const page = await browser.newPage();
const apiCalls = [];
page.on("response", async (res) => {
  const url = res.url();
  if (url.includes("jeichat-api") && url.includes("users/me")) {
    apiCalls.push({ method: res.request().method(), status: res.status(), url });
  }
});

await page.goto("https://jeichat.zkript.dev/login", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.locator("#auth-email").fill(email);
await page.locator("#auth-password").fill(password);
await page.getByRole("button", { name: /log in/i }).click();
await page.waitForTimeout(5000);
console.log("after login url", page.url());

await page.goto("https://jeichat.zkript.dev/settings", { waitUntil: "domcontentloaded", timeout: 60000 });
const nameField = page.locator("#auth-email").or(page.getByLabel(/^name$/i)).first();
// settings name input - find by label Name
const nameInput = page.locator('input').filter({ has: page.locator('xpath=..') }).first();
const inputs = page.locator('label:has-text("Name") ~ input, label:has-text("Name") + input');
let field = page.getByRole("textbox").nth(1);
try {
  field = page.locator('input[type="text"]').nth(0);
} catch {}
const before = await page.locator('input[type="text"]').first().inputValue();
console.log("before", before);
await page.locator('input[type="text"]').first().fill("QA Bot");
apiCalls.length = 0;
await page.getByRole("button", { name: /save name/i }).click();
await page.waitForTimeout(4000);
const toast = await page.getByText(/name updated/i).isVisible().catch(() => false);
console.log("toast", toast, "patch", apiCalls);
const afterSave = await page.locator('input[type="text"]').first().inputValue();
console.log("afterSave", afterSave);
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForTimeout(2000);
const afterReload = await page.locator('input[type="text"]').first().inputValue();
console.log("afterReload", afterReload);
await mkdir(runDir, { recursive: true });
await page.screenshot({ path: path.join(runDir, "settings-after-save.png"), fullPage: true });
await browser.close();
