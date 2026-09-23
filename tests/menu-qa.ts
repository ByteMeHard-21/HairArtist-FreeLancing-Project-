import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium, expect } from "@playwright/test";
import { services, formatPrice } from "../src/data/services";
import { MenuCatalogue } from "../src/components/menu-catalogue";

const approved = [
  ["Haircut", ["Classic Haircut", "Fade Haircut", "Modern / Trendy Haircut", "Precision Haircut", "Haircut + Wash"]],
  ["Beard", ["Beard Trim & Shape", "Beard Fade", "Italian Beard", "Beard Styling", "Beard Grooming"]],
  ["Hair + Beard", ["Haircut + Beard Trim", "Haircut + Beard Fade", "Haircut + Italian Beard", "Signature Hair + Beard"]],
  ["Hair Styling", ["Classic Hair Styling", "Modern Hair Styling", "Blow-Dry & Finish", "Occasion Styling", "Groom Styling"]],
  ["Hair Colour", ["Global Hair Colour", "Root Colour", "Highlights", "Creative / Fashion Colour", "Colour Consultation"]],
] as const;
async function main() {
  const men = services.filter(service => service.audiences.includes("men") && service.status === "confirmed");
  assert.equal(men.length, 24);
  assert.equal(new Set(men.map(service => service.id)).size, 24);
  assert.deepEqual(men.map(service => service.name), approved.flatMap(([, names]) => [...names]));
  for (const [category, names] of approved) assert.deepEqual(men.filter(service => service.category === category).map(service => service.name), [...names]);
  assert.ok(men.every(service => [100, 150, 200].includes(service.price!)));
  assert.equal(men.find(service => service.id === "cut-wash")?.price, 200);
  assert.equal(men.find(service => service.id === "beard-styling")?.price, 200);
  assert.equal(formatPrice(100), "₹100"); assert.equal(formatPrice(350), "₹350");
  const original = men[0].price;
  try {
    men[0].price = 350; // Memory-only edit, never written to production configuration.
    const html = renderToStaticMarkup(createElement(MenuCatalogue));
    assert.ok(html.includes("<dt>Classic Haircut</dt><dd>₹350</dd>"), "The component must render the changed data value without a JSX edit.");
  } finally { men[0].price = original; }
  assert.ok(renderToStaticMarkup(createElement(MenuCatalogue)).includes("<dt>Classic Haircut</dt><dd>₹100</dd>"));
  const results = ["24 exact names in five ordered categories; only 100/150/200; memory-only 100 → 350 → 100 data update renders correctly."];
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  try {
    const page = await browser.newPage();
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
    await mkdir("qa/screenshots/menu", { recursive: true });
    for (const width of [360, 375, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto("http://127.0.0.1:3000/menu");
      await expect(page.locator(".menu-intro-note")).toContainText("temporary and unconfirmed");
      await page.getByRole("button", { name: "Men", exact: true }).click();
      await expect(page.locator(".menu-category")).toHaveCount(5);
      assert.deepEqual(await page.locator(".menu-category h3").allTextContents(), approved.map(([category]) => category));
      assert.deepEqual(await page.locator(".service-row dt").allTextContents(), men.map(service => service.name));
      assert.deepEqual(await page.locator(".service-row dd").allTextContents(), men.map(service => formatPrice(service.price!)));
      const expectedColumns = width >= 900 ? 3 : width >= 600 ? 2 : 1;
      const columns = await page.locator(".menu-categories").evaluate(element => getComputedStyle(element).gridTemplateColumns.split(" ").length);
      assert.equal(columns, expectedColumns, "Category card columns at " + width);
      const cards = await page.locator(".menu-category").evaluateAll(elements => elements.map(element => {
        const rect = element.getBoundingClientRect(), css = getComputedStyle(element);
        return { x: rect.x, y: rect.y, bottom: rect.bottom, border: css.borderTopWidth, background: css.backgroundColor };
      }));
      assert.ok(cards.every(card => card.border === "1px" && card.background === "rgb(255, 255, 255)"));
      for (let i = 1; i < expectedColumns; i++) {
        assert.equal(cards[i].y, cards[0].y);
        assert.ok(cards[i].x > cards[i - 1].x);
      }
      assert.ok(cards[expectedColumns].y > cards[0].bottom, "Additional categories wrap to a new card row");
      const geometry = await page.locator(".service-row").evaluateAll(rows => rows.map(row => {
        const name = row.querySelector("dt")!, price = row.querySelector("dd")!;
        const n = name.getBoundingClientRect(), p = price.getBoundingClientRect(), r = row.getBoundingClientRect();
        return { overlap: n.right > p.left, alignedRight: Math.abs(p.right - r.right) < 1, whiteSpace: getComputedStyle(price).whiteSpace, priceClipped: price.scrollWidth > price.clientWidth + 1, nameClipped: name.scrollWidth > name.clientWidth + 1 };
      }));
      assert.ok(geometry.every(row => !row.overlap && row.alignedRight && row.whiteSpace === "nowrap" && !row.priceClipped && !row.nameClipped), JSON.stringify({ width, geometry }));
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
      await page.screenshot({ path: "qa/screenshots/menu/men-" + width + ".png", fullPage: true });
      await page.getByRole("button", { name: "Women", exact: true }).click();
      await expect(page.locator(".service-row")).toHaveCount(25);
      await expect(page.locator(".menu-category")).toHaveCount(5);
      await page.getByRole("button", { name: "Groom", exact: true }).click();
      await expect(page.locator(".service-row")).toHaveCount(0);
      await expect(page.locator(".groom-package")).toHaveCount(1);
      await expect(page.locator(".groom-package-price dd")).toHaveText("₹2,499");
      await expect(page.getByRole("button", { name: "Children", exact: true })).toHaveCount(0);
      await page.getByRole("button", { name: "All", exact: true }).click();
      await expect(page.locator(".service-row")).toHaveCount(49);
      results.push(width + "px: " + expectedColumns + " card columns; exact names/prices, right alignment, no clipping/overflow; filters preserved.");
    }
    assert.deepEqual(errors, []);
    results.push("No browser console errors or uncaught errors.");
    await writeFile("qa/menu-results.json", JSON.stringify({ results, services: men.map(({ category, name, price }) => ({ category, name, price })) }, null, 2));
    console.log(results.join("\n"));
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
