import { chromium } from "@playwright/test";
const browser = await chromium.launch({ channel: "msedge", headless: true });
try {
  const page = await browser.newPage();
  page.on("response", response => { if (response.status() >= 400) console.log("HTTP", response.status(), response.url()); });
  page.on("console", message => { if (message.type() === "error") console.log("CONSOLE", message.text(), message.location().url); });
  await page.goto("http://127.0.0.1:3000/book");
  await page.locator(".booking-slot").first().waitFor();
  await page.goto("http://127.0.0.1:3000/");
  await page.locator("#location").scrollIntoViewIfNeeded();
  await page.waitForTimeout(6000);
} finally { await browser.close(); }
