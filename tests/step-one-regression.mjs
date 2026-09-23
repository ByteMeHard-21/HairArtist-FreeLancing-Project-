import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
const browser = await chromium.launch({ channel: "msedge", headless: true });
const context = await browser.newContext();
const page = await context.newPage();
const base = process.env.QA_BASE_URL || "http://127.0.0.1:3000";
try {
  for (const width of [360, 375, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(base + "/book");
    await page.locator(".booking-slot:not([disabled])").first().waitFor();
    const next = page.getByRole("button", { name: "Continue to details" });
    await expect(next).toBeDisabled();
    await page.locator(".booking-slot:not([disabled])").first().click();
    if (process.argv.includes("--diagnose")) {
      console.log(JSON.stringify({ width, selected: await page.locator(".booking-slot[aria-pressed=true]").count(), continueDisabled: await next.isDisabled() }));
      continue;
    }
    await expect(next).toBeEnabled();
    await page.locator(".booking-date[aria-pressed=true]").click();
    await expect(page.locator(".booking-dates")).toHaveAttribute("aria-busy", "false");
    await expect(next).toBeEnabled();
    await next.click();
    await expect(page.getByRole("heading", { name: "Your Details" })).toBeVisible();
    assert.equal(await page.getByRole("heading", { name: "Select a Date" }).count(), 0);
    await page.getByRole("button", { name: /Back to date/i }).click();
    await page.locator(".booking-date:not([disabled]):not([aria-pressed=true])").first().click();
    await expect(next).toBeDisabled();
    await page.locator(".booking-slot:not([disabled])").first().click();
    await expect(next).toBeEnabled();
    await next.click();
    await expect(page.getByRole("heading", { name: "Your Details" })).toBeVisible();
    console.log("PASS real API " + width + ": select time → continue; reselect same date; switch date; continue → details.");
  }
} finally { await browser.close(); }
