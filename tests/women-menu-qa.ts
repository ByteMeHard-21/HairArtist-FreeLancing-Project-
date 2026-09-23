
import assert from "node:assert/strict";
import { chromium, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { services, formatPrice, servicePreview } from "../src/data/services";
const expected = [{"id":"women-0-0","name":"Classic Haircut","category":"Haircut","audiences":["women"],"price":699,"status":"confirmed"},{"id":"women-0-1","name":"Layer Cut","category":"Haircut","audiences":["women"],"price":899,"status":"confirmed"},{"id":"women-0-2","name":"Bob / Short Haircut","category":"Haircut","audiences":["women"],"price":899,"status":"confirmed"},{"id":"women-0-3","name":"Precision Haircut","category":"Haircut","audiences":["women"],"price":1099,"status":"confirmed"},{"id":"women-0-4","name":"Haircut + Wash","category":"Haircut","audiences":["women"],"price":999,"status":"confirmed"},{"id":"women-1-0","name":"Hair Wash & Blow Dry","category":"Hair Styling","audiences":["women"],"price":699,"status":"confirmed"},{"id":"women-1-1","name":"Classic Hair Styling","category":"Hair Styling","audiences":["women"],"price":799,"status":"confirmed"},{"id":"women-1-2","name":"Blow-Dry & Finish","category":"Hair Styling","audiences":["women"],"price":899,"status":"confirmed"},{"id":"women-1-3","name":"Ironing / Straight Finish","category":"Hair Styling","audiences":["women"],"price":999,"status":"confirmed"},{"id":"women-1-4","name":"Occasion Hair Styling","category":"Hair Styling","audiences":["women"],"price":1499,"status":"confirmed"},{"id":"women-2-0","name":"Root Touch-Up","category":"Hair Colour","audiences":["women"],"price":999,"status":"confirmed"},{"id":"women-2-1","name":"Global Colour — Short","category":"Hair Colour","audiences":["women"],"price":1799,"status":"confirmed"},{"id":"women-2-2","name":"Global Colour — Medium","category":"Hair Colour","audiences":["women"],"price":2499,"status":"confirmed"},{"id":"women-2-3","name":"Highlights","category":"Hair Colour","audiences":["women"],"price":3499,"status":"confirmed"},{"id":"women-2-4","name":"Creative / Fashion Colour","category":"Hair Colour","audiences":["women"],"price":4999,"status":"confirmed"},{"id":"women-3-0","name":"Hair Spa","category":"Hair Treatments","audiences":["women"],"price":999,"status":"confirmed"},{"id":"women-3-1","name":"Protein Treatment","category":"Hair Treatments","audiences":["women"],"price":1499,"status":"confirmed"},{"id":"women-3-2","name":"Hair Repair Treatment","category":"Hair Treatments","audiences":["women"],"price":1799,"status":"confirmed"},{"id":"women-3-3","name":"Smoothening","category":"Hair Treatments","audiences":["women"],"price":4499,"status":"confirmed"},{"id":"women-3-4","name":"Keratin Treatment","category":"Hair Treatments","audiences":["women"],"price":5999,"status":"confirmed"},{"id":"women-4-0","name":"Basic Occasion Styling","category":"Occasion & Grooming","audiences":["women"],"price":1199,"status":"confirmed"},{"id":"women-4-1","name":"Premium Occasion Styling","category":"Occasion & Grooming","audiences":["women"],"price":1799,"status":"confirmed"},{"id":"women-4-2","name":"Hair Dressing","category":"Occasion & Grooming","audiences":["women"],"price":1499,"status":"confirmed"},{"id":"women-4-3","name":"Facial / Clean-Up","category":"Occasion & Grooming","audiences":["women"],"price":799,"status":"confirmed"},{"id":"women-4-4","name":"D-Tan Treatment","category":"Occasion & Grooming","audiences":["women"],"price":699,"status":"confirmed"}];
async function main() {
  const women = services.filter(s => s.audiences.includes("women"));
  assert.deepEqual(women, expected);
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  try {
    const page = await browser.newPage();
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("console", message => { if(message.type() === "error") errors.push(message.text()); });
    await mkdir("qa/screenshots/women", { recursive:true });
    for (const width of [360,390,768,1024,1440]) {
      await page.setViewportSize({ width, height:1000 });
      await page.goto("http://127.0.0.1:3000/menu");
      await page.getByRole("button", { name:"Women", exact:true }).click();
      await expect(page.locator(".menu-category")).toHaveCount(5);
      assert.deepEqual(await page.locator(".menu-category h3").allTextContents(), [...new Set(expected.map(s=>s.category))]);
      assert.deepEqual(await page.locator(".service-row dt").allTextContents(), expected.map(s=>s.name));
      assert.deepEqual(await page.locator(".service-row dd").allTextContents(), expected.map(s=>formatPrice(s.price)));
      assert.equal(await page.locator(".menu-categories").evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(" ").length), width>=900?3:width>=600?2:1);
      const geometry = await page.locator(".service-row").evaluateAll(rows=>rows.every(row=>{
        const n=row.querySelector("dt")!,p=row.querySelector("dd")!;
        return n.getBoundingClientRect().right <= p.getBoundingClientRect().left && n.scrollWidth<=n.clientWidth+1 && p.scrollWidth<=p.clientWidth+1;
      }));
      assert.ok(geometry, "Names/prices fit at "+width);
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
      await page.screenshot({ path:"qa/screenshots/women/menu-"+width+".png", fullPage:true });
      await page.goto("http://127.0.0.1:3000");
      await expect(page.locator(".service-preview-item")).toHaveCount(3);
      const packageCard = page.locator(".service-preview .groom-package");
      await expect(packageCard.locator("h3")).toHaveText("Groom");
      await expect(packageCard.locator(".groom-package-price dd")).toHaveText("₹2,499");
      await expect(packageCard.locator("li")).toHaveCount(0);
      if(width >= 900) {
        const tops = await page.locator(".service-preview-item").evaluateAll(cards => cards.map(card=>card.getBoundingClientRect().top));
        assert.ok(tops.every(top=>top === tops[0]), "Three homepage cards in one desktop row");
      }
      await expect(page.locator(".service-preview .service-row")).toHaveCount(6);
      const selected=servicePreview.flatMap(item=>item.serviceIds.map(id=>services.find(s=>s.id===id)!));
      assert.deepEqual(await page.locator(".service-preview .service-row dt").allTextContents(),selected.map(s=>s.name));
      assert.deepEqual(await page.locator(".service-preview .service-row dd").allTextContents(),selected.map(s=>formatPrice(s.price!)));
      assert.ok(await page.locator(".service-preview .service-row").evaluateAll(rows=>rows.every(row=>{
        const n=row.querySelector("dt")!,p=row.querySelector("dd")!;
        return n.getBoundingClientRect().right<=p.getBoundingClientRect().left && n.scrollWidth<=n.clientWidth+1 && p.scrollWidth<=p.clientWidth+1;
      })));
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
      await page.locator(".service-preview").screenshot({path:"qa/screenshots/women/home-"+width+".png"});
      await page.getByRole("link", {name:"View full menu"}).click();
      await expect(page).toHaveURL(/\/menu$/);
      await page.getByRole("button", { name:"Groom", exact:true }).click();
      await expect(page.locator(".menu-audience")).toHaveCount(1);
      await expect(page.locator(".groom-package")).toHaveCount(1);
      await expect(page.locator(".groom-package-price dd")).toHaveText("₹2,499");
      await expect(page.locator(".menu-category")).toHaveCount(0); assert.deepEqual(await page.locator(".groom-package li").allTextContents(), ["Precision Haircut", "Beard Shape & Styling", "Hair Styling", "Hair Wash & Finish"]);
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth+1));
      const centered = await page.locator(".menu-groom-package").evaluate(el => { const box=el.getBoundingClientRect(); return Math.abs(box.left+box.width/2-innerWidth/2)<2; });
      assert.ok(centered, "Single package card centered");
      await page.screenshot({path:"qa/screenshots/women/groom-"+width+".png", fullPage:true});
      console.log(width+"px: 25 exact women's services/prices, 5 responsive cards, 3 homepage cards with 6 shared-price rows and the groom package, no overflow.");
    }
    assert.deepEqual(errors,[]);
    console.log("No browser errors.");
  } finally { await browser.close(); }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
