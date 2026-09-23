import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
const browser = await chromium.launch({ channel: "msedge", headless: true });
try {
  for (const origin of ["http://127.0.0.1:3000", "http://localhost:3000"]) {
    const context = await browser.newContext({ viewport: { width: 390, height: 900 } });
    const availability = await (await context.request.get(origin + "/api/booking/availability")).json();
    assert.equal(availability.ready, false, "This test must not run against a configured live OTP provider");
    const date = availability.dates.find(d => !d.closed).date;
    const slots = await (await context.request.get(origin + "/api/booking/availability?date=" + date)).json();
    const details = { date, start: slots.slots.find(s => s.remaining > 0).start, name: "Local API Check", gender: "men", mobile: "9999999999", service: "Haircut" };
    const result = await context.request.post(origin + "/api/booking/request-code", { headers: { Origin: origin }, data: details });
    assert.equal(result.status(), 503);
    assert.equal((await result.json()).error, "OTP_UNAVAILABLE", "Valid same-origin requests must reach verification configuration checks");
    const foreign = await context.request.post(origin + "/api/booking/request-code", { headers: { Origin: "https://unrelated.example" }, data: details });
    assert.equal(foreign.status(), 403);
    const page = await context.newPage();
    await page.goto(origin + "/book");
    await expect(page.locator(".booking-dates")).toHaveAttribute("aria-busy", "false");
    if (!await page.locator(".booking-slot:not([disabled])").count()) await page.locator(".booking-date:not([disabled])").first().click();
    await page.locator(".booking-slot:not([disabled])").first().click();
    await page.getByRole("button", { name: "Continue to details" }).click();
    await page.getByLabel("Full name", { exact: false }).fill(details.name);
    await page.getByLabel("Select service", { exact: false }).selectOption(details.service);
    await page.getByLabel("10-digit Indian mobile number").fill(details.mobile);
    await page.getByRole("button", { name: /verify & book/i }).first().click();
    await expect(page.locator(".booking-error[role=alert]")).toContainText("SMS verification is currently unavailable");
    await expect(page.getByRole("heading", { name: "Your Details" })).toBeVisible();
    assert.equal(await page.getByRole("heading", { name: "Verify Your Mobile" }).count(), 0);
    console.log("PASS " + origin + ": legitimate request reaches OTP_UNAVAILABLE; foreign origin rejected; UI explains missing verification and does not pretend to send OTP.");
    await context.close();
  }
} finally { await browser.close(); }
