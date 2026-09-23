import { chromium, devices } from "@playwright/test";
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
const browser = await chromium.launch({ channel: "msedge", headless: true });
const context = await browser.newContext({ ...devices["Pixel 7"], viewport: { width: 390, height: 844 } });
const page = await context.newPage();
const results = [];
try {
  await page.goto("http://127.0.0.1:3000/");
  const link = page.locator(".mobile-contact-bar a").filter({ hasText: "WhatsApp David" });
  await link.waitFor();
  assert.match(await link.getAttribute("href"), /^https:\/\/wa.me\/918238108943\?text=/);
  const before = await link.evaluate(element => { const css = getComputedStyle(element); return { color: css.color, background: css.backgroundColor }; });
  // Prevent the external app opening during QA; exercise the actual touch styling.
  await link.evaluate(element => element.addEventListener("click", event => event.preventDefault()));
  await link.tap();
  await page.waitForTimeout(600); // Allow the CSS transition and touch active highlight to settle.
  await page.waitForFunction(() => getComputedStyle(document.querySelector(".mobile-contact-bar .action--outline")).backgroundColor === "rgba(0, 0, 0, 0)");
  const after = await link.evaluate(element => { const css = getComputedStyle(element); return { color: css.color, background: css.backgroundColor }; });
  assert.deepEqual(after, before, "Touch must not leave a persistent hover background.");
  assert.equal(after.color, "rgb(228, 221, 211)");
  assert.equal(await page.locator(".mobile-contact-bar").evaluate(element => getComputedStyle(element).backgroundColor), "rgb(20, 19, 17)");
  assert.equal(await page.locator(".mobile-contact-bar a").filter({ hasText: "Call David" }).getAttribute("href"), "tel:+918238108943");
  assert.equal(await link.getAttribute("aria-disabled"), null);
  await page.screenshot({ path: "qa/screenshots/booking/touch-cta-390.png", fullPage: false });
  results.push("Touch-emulated WhatsApp tap retains readable text/background, valid href and enabled link; no artificial loading state.");
  for(const label of ["Call David", "WhatsApp David", "Get direction", "View more work"]) {
    const action=page.getByRole("link",{name:new RegExp(label,"i")}).first();
    await action.scrollIntoViewIfNeeded();
    await action.evaluate(element=>element.addEventListener("click",event=>event.preventDefault()));
    const original=await action.evaluate(element=>({color:getComputedStyle(element).color,background:getComputedStyle(element).backgroundColor}));
    await action.tap();
    await page.waitForTimeout(350);
    const current=await action.evaluate(element=>({color:getComputedStyle(element).color,background:getComputedStyle(element).backgroundColor}));
    assert.deepEqual(current,original,label+": touch must not stick hover/active styling");
    assert.equal(await action.getAttribute("aria-busy"),null);
  }
  results.push("All direct-link CTA types retain their colors after touch and have no artificial loading state.");
  await page.goto("http://127.0.0.1:3000/");
  await page.getByRole("button", { name: "Open navigation" }).tap();
  const mobileNav = page.getByRole("navigation", { name: "Mobile navigation", exact: true });
  const hrefs = await mobileNav.locator("a").evaluateAll(links => links.map(a => a.getAttribute("href")));
  assert.deepEqual(hrefs, ["/#work", "/menu", "/#artist", "/#location", "/#contact"]);
  await mobileNav.getByRole("button", { name: /Book a visit/i }).tap();
  await page.getByRole("dialog", { name: "Book a visit", exact: true }).waitFor();
  await page.getByRole("button", { name: "Close booking options" }).tap();
  assert.equal(await page.getByRole("button", { name: "Open navigation" }).getAttribute("aria-expanded"), "false");
  results.push("Touch mobile menu destinations remain correct and menu closes after opening contact booking.");
  await page.goto("http://127.0.0.1:3000/");
  for(const selector of [".service-preview", ".location-actions"]) {
    await page.locator(selector).getByRole("button",{name:/Book a visit/i}).tap();
    await page.getByRole("dialog",{name:"Book a visit",exact:true}).waitFor();
    await page.getByRole("button",{name:"Close booking options"}).tap();
  }
  await page.getByRole("link",{name:"Studio login →",exact:true}).tap();
  await page.waitForURL("**/admin/login");
  await page.getByRole("heading",{name:"Welcome back."}).waitFor();
  assert.equal(await page.locator(".site-header").count(),0);
  results.push("Service/location booking triggers open the shared contact dialog; footer Studio login opens the private login without public navigation.");
  await writeFile("qa/booking-touch-results.json", JSON.stringify(results, null, 2));
  console.log(results.join("\n"));
} finally { await browser.close(); }
