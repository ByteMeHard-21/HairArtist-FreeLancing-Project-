import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const base = "http://127.0.0.1:3000";
const browser = await chromium.launch({ channel: "msedge", headless: true });
const results = [];
const shotDir = "qa/screenshots/booking";
await mkdir(shotDir, { recursive: true });
const errors = [];
const context = await browser.newContext();
const page = await context.newPage();
page.on("pageerror", error => errors.push(error.message));
page.on("console", message => { if (message.type() === "error" && !/status of (400|401|403|409|410|429)/.test(message.text())) errors.push(message.text()); });
async function noOverflow(label) {
  const sizes = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
  assert.ok(sizes.scroll <= sizes.width + 1, label + ": horizontal overflow " + JSON.stringify(sizes));
  results.push(label + ": no horizontal overflow");
}
try {
  // Real API checks: unconfigured SMS is fail-closed; public responses contain no customer data.
  const actual = await context.request.get(base + "/api/booking/availability");
  assert.equal(actual.status(), 200);
  const availability = await actual.json();
  assert.equal(availability.ready, false);
  assert.equal(availability.dates.length, 15);
  assert.ok(!JSON.stringify(availability).includes("mobile_number"));
  const denied = await context.request.get(base + "/api/admin/dashboard");
  assert.equal(denied.status(), 401);
  assert.equal((await context.request.post(base + "/api/booking/request-code", { data: {} })).status(), 403);
  results.push("Live API: provider unconfigured, 15 dates, no customer data, admin denied, cross-origin POST denied");
  for (const width of [360, 375, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(base + "/book");
    await page.getByText("Online reservations are being prepared.", { exact: false }).waitFor();
    await noOverflow("Real booking " + width);
    await page.screenshot({ path: shotDir + "/book-" + width + ".png", fullPage: true });
    await page.goto(base + "/admin");
    await page.getByRole("heading", { name: "Welcome back." }).waitFor();
    await noOverflow("Admin login " + width);
    await page.goto(base + "/");
    await page.getByRole("heading", { name: /David/ }).first().waitFor();
    await noOverflow("Homepage " + width);
    if (width < 900) {
      await page.getByRole("button", { name: "Open navigation" }).click();
      await page.getByRole("navigation", { name: "Mobile navigation", exact: true }).getByRole("button", { name: /Book a visit/i }).click();
      await page.getByRole("dialog", { name: "Book a visit", exact: true }).waitFor();
      await page.getByRole("button", { name: "Close booking options" }).click();
    } else {
      await page.getByRole("navigation", { name: "Main navigation", exact: true }).getByRole("button", { name: /Book a visit/i }).click();
      await page.getByRole("dialog", { name: "Book a visit", exact: true }).waitFor();
      await page.getByRole("button", { name: "Close booking options" }).click();
    }
    results.push("Contact booking dialog " + width);
  }
  // Test-only network fixtures, never included in app routes or production code.

  const chosen = availability.dates.find(d => !d.closed)?.date;
  assert.ok(chosen, "Confirmed schedule must have an open date");
  const fixture = { ...availability, ready: true, message: undefined, selectedDate: chosen, slots: [
    { start: "09:00", end: "10:00", remaining: 3 }, { start: "10:00", end: "11:00", remaining: 2 },
    { start: "11:00", end: "12:00", remaining: 1 }, { start: "12:00", end: "13:00", remaining: 0 },
  ] };
  let mode = "invalid", sendCount = 0;
  await page.route("**/api/booking/availability*", route => route.fulfill({ json: fixture }));
  await page.route("**/api/booking/request-code", route => { sendCount++; return route.fulfill({ json: { challengeId: "11111111-1111-4111-8111-111111111111", expiresAt: new Date(Date.now() + 600000).toISOString(), resendAfter: 60 } }); });
  const booking = { id: "11111111-1111-4111-8111-111111111112", booking_reference: "JIAA-QA", appointment_date: chosen, slot_start: "09:00", slot_end: "10:00", customer_name: "Browser Test", gender: "women", mobile_number: "+919999999999", service: "Women's Hair Styling", status: "CONFIRMED" };
  await page.route("**/api/booking/verify", route => mode === "success" ? route.fulfill({ json: { booking } }) : route.fulfill({ status: 409, json: { error: mode === "full" ? "SLOT_UNAVAILABLE" : mode === "expired" ? "OTP_EXPIRED" : "INVALID_CODE" } }));
  for (const width of [360, 375, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(base + "/book");
    const available = page.getByRole("button", { name: /09:00 AM/ });
    await available.click();
    assert.ok(await page.getByRole("button", { name: /12:00 PM.*Full/ }).isDisabled());
    await noOverflow("Fixture time grid " + width);
    await page.screenshot({ path: shotDir + "/slots-" + width + ".png", fullPage: true });
    await page.getByRole("button", { name: "Continue to details" }).click();
    await page.getByLabel("Full name", { exact: false }).fill("Browser Test");
    await page.getByRole("radio", { name: /^women$/i }).check();
    await page.getByLabel("Select service", { exact: false }).selectOption("Women's Hair Styling");
    await page.getByLabel("10-digit Indian mobile number").fill("9999999999");
    await noOverflow("Fixture details " + width);
    await page.screenshot({ path: shotDir + "/details-" + width + ".png", fullPage: true });
    await page.getByRole("button", { name: /verify & book/i }).first().click();
    await page.getByLabel("Verification code").fill("123456");
    mode = "invalid"; await page.getByRole("button", { name: "Confirm appointment" }).click();
    await page.getByRole("alert").getByText("That code is not valid.", { exact: false }).waitFor();
    mode = "expired"; await page.getByRole("button", { name: "Confirm appointment" }).click();
    await page.getByRole("alert").getByText("Your code has expired.", { exact: false }).waitFor();
    await noOverflow("Fixture OTP " + width);
    await page.screenshot({ path: shotDir + "/otp-" + width + ".png", fullPage: true });
    mode = "success"; await page.getByRole("button", { name: "Confirm appointment" }).click();
    await page.getByRole("heading", { name: "Your Visit Is Confirmed" }).waitFor();
    await noOverflow("Fixture confirmed " + width);
    await page.screenshot({ path: shotDir + "/confirmed-" + width + ".png", fullPage: true });
    results.push("Fixture form/gender/service/invalid OTP/expired OTP/confirmation " + width);
  }
  // Lost slot must return to selection without displaying a false confirmation.
  await page.goto(base + "/book"); await page.getByRole("button", { name: /09:00 AM/ }).click();
  await page.getByRole("button", { name: "Continue to details" }).click();
  await page.getByLabel("Full name", { exact: false }).fill("Browser Test");
  await page.getByLabel("Select service", { exact: false }).selectOption("Haircut");
  await page.getByLabel("10-digit Indian mobile number").fill("9999999999");
  await page.getByRole("button", { name: /verify & book/i }).first().click();
  await page.getByLabel("Verification code").fill("123456");
  mode = "full"; await page.getByRole("button", { name: "Confirm appointment" }).click();
  await page.getByRole("heading", { name: "Select a Date" }).waitFor();
  await page.getByRole("alert").getByText("This time period is no longer available.", { exact: false }).waitFor();
  results.push("Fixture race lost: returned to date selection");
  // Protected admin flows are exercised by admin-browser.mjs against its isolated provider fixture.
  assert.equal(errors.length, 0, errors.join("\n"));
  results.push("No browser page errors; OTP/provider success screens tested with network fixtures only");
  await writeFile("qa/booking-browser-results.json", JSON.stringify({ results, sendCount, errors }, null, 2));
  console.log(results.join("\n"));
} finally { await browser.close(); }
