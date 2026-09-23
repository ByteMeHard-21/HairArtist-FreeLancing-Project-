import {chromium,expect} from "@playwright/test";
import assert from "node:assert/strict";
import {mkdir,writeFile} from "node:fs/promises";
const browser=await chromium.launch({channel:"msedge",headless:true});
const results=[];
try{
  const page=await browser.newPage();
  let announcements=[];
  await page.route("**/api/booking/availability",route=>route.fulfill({json:{announcements}}));
  await mkdir("qa/screenshots/ticker",{recursive:true});
  for(const width of [390,768,1024,1440,1920]){
    await page.setViewportSize({width,height:900});
    announcements=[];
    await page.goto("http://127.0.0.1:3000/");
    const ticker=page.locator(".availability-ticker");
    await expect(ticker).toHaveAttribute("aria-label","David is at salon");
    const track=page.locator(".ticker-track");
    await track.evaluate(el=>{el.style.animation="none";});
    const visibleCopies=await page.locator(".ticker-copy").first().locator("span:visible").count();
    assert.equal(visibleCopies,width>768?1:4);
    for(const progress of [0,0.25,0.5,0.75]){
      const metrics=await track.evaluate((el,progress)=>{
        el.style.transform="translateX("+(-el.getBoundingClientRect().width*0.5*progress)+"px)";
        const viewport=el.parentElement.getBoundingClientRect();
        const visible=[...el.querySelectorAll("span")].filter(span=>{
          const rect=span.getBoundingClientRect();
          return rect.width>0&&rect.right>viewport.left&&rect.left<viewport.right;
        });
        return {count:visible.length,overflow:document.documentElement.scrollWidth>innerWidth+1};
      },progress);
      assert.ok(!metrics.overflow);
      if(width>768)assert.ok(metrics.count<=2,"Desktop should never show a dense row of repeated notices");
    }
    await track.evaluate(el=>{el.style.transform="none";});
    await ticker.screenshot({path:"qa/screenshots/ticker/default-"+width+".png"});
    announcements=["David is away this afternoon."];
    await page.reload();
    await expect(ticker).toHaveAttribute("aria-label",announcements[0]);
    announcements=["   "];
    await page.reload();
    await expect(ticker).toHaveAttribute("aria-label","David is at salon");
    results.push(width+"px: default, active override, blank fallback, spacing and no horizontal overflow passed.");
  }
  await writeFile("qa/ticker-browser-results.json",JSON.stringify(results,null,2));
  console.log(results.join("\n"));
}finally{await browser.close();}