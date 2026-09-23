import assert from "node:assert/strict";
import {mkdir,writeFile} from "node:fs/promises";
import {chromium,expect} from "@playwright/test";
const base="http://127.0.0.1:3000";
const browser=await chromium.launch({channel:"msedge",headless:true});
const results=[];
await mkdir("qa/screenshots/portfolio",{recursive:true});
try{
  for(const width of [360,390,599,768,1024,1440]){
    const context=await browser.newContext({viewport:{width,height:1000},hasTouch:width<600,isMobile:width<600});
    const page=await context.newPage();
    const errors=[];let documents=0;
    page.on("pageerror",e=>errors.push(e.message));
    page.on("console",e=>{if(e.type()==="error")errors.push(e.text());});
    page.on("request",r=>{if(r.isNavigationRequest()&&r.frame()===page.mainFrame())documents++;});
    await page.goto(base);
    const section=page.locator("#work"),filters=section.locator(".portfolio-filters");
    await expect(page.locator("section#work")).toHaveCount(1);
    await expect(filters.getByRole("button")).toHaveCount(3);
    for(const [filter,count] of [["all",6],["men",6],["women",5]]){
      await filters.evaluate(el=>el.scrollIntoView({block:"center",behavior:"instant"}));
      const sectionTop=await section.evaluate(el=>el.getBoundingClientRect().top+scrollY);
      const scrollBefore=await page.evaluate(()=>scrollY);
      await filters.getByRole("button",{name:filter,exact:true}).click();
      await expect(filters.getByRole("button",{name:filter,exact:true})).toHaveAttribute("aria-pressed","true");
      await expect(section.locator(".portfolio-card")).toHaveCount(count);
      assert.equal(await section.evaluate(el=>el.getBoundingClientRect().top+scrollY),sectionTop);
      assert.ok(Math.abs((await page.evaluate(()=>scrollY))-scrollBefore)<3,"Filter must not move scroll position: "+width+" "+filter+" from "+scrollBefore+" to "+(await page.evaluate(()=>scrollY)));
      if(width<600){
        await expect(section.locator(".portfolio-card:visible")).toHaveCount(3);
        await section.getByRole("button",{name:"See more work",exact:true}).tap();
      }
      await expect(section.locator(".portfolio-card:visible")).toHaveCount(count);
      if(filter==="all"){
        assert.equal(await section.locator('[data-project^="men-"]').count(),3);
        assert.equal(await section.locator('[data-project^="women-"]').count(),3);
      }else{
        assert.equal(await section.locator('[data-project^="'+filter+'-"]').count(),count);
      }
      assert.equal(await section.locator(".portfolio-photo--transformation").count(),filter==="men"?0:1);
      for(const card of await section.locator(".portfolio-card").all()){
        await card.scrollIntoViewIfNeeded();
        await expect.poll(()=>card.locator("img").evaluateAll(imgs=>imgs.every(img=>img.complete&&img.naturalWidth>0)),{timeout:15000}).toBe(true);
      }
      if(filter==="men"){
        const photo=section.locator('[data-project="men-04"] .portfolio-photo img');
        assert.equal(await photo.evaluate(el=>getComputedStyle(el).objectFit),"contain");
      }
      await section.screenshot({style:".site-header,.skip-link,.mobile-contact-bar { visibility:hidden !important; }",path:"qa/screenshots/portfolio/"+filter+"-"+width+".png"});
    }
    assert.equal(documents,1,"Filters must not reload or navigate");
    await expect(page).toHaveURL(base+"/");
    await expect(section.getByRole("link",{name:/View more work/i})).toHaveAttribute("href","https://www.instagram.com/davidsid_24/");
    const reveal=section.locator(".portfolio-photo--transformation");
    const layer=reveal.locator(".transformation-after");
    await reveal.scrollIntoViewIfNeeded();
    await page.mouse.move(0,0);
    await expect(reveal).toHaveAttribute("aria-pressed","false");
    await expect(reveal.locator(".transformation-label")).toHaveText("Before");
    const card=reveal.locator(".."),beforeBox=await card.boundingBox();
    if(width<600){
      await reveal.tap();
    }else{
      await reveal.hover();
    }
    await expect(reveal).toHaveAttribute("aria-pressed","true");
    assert.equal(await layer.evaluate(el=>getComputedStyle(el).transitionDuration),"0.6s");
    await expect.poll(()=>layer.evaluate(el=>new DOMMatrixReadOnly(getComputedStyle(el).transform).m41)).toBe(0);
    assert.deepEqual(await card.boundingBox(),beforeBox,"Only the image layer should move");
    await expect(reveal.locator(".transformation-label")).toHaveText("After");
    await reveal.screenshot({path:"qa/screenshots/portfolio/after-"+width+".png"});
    if(width<600)await reveal.tap();else await page.mouse.move(0,0);
    await expect(reveal).toHaveAttribute("aria-pressed","false");
    await expect.poll(()=>layer.evaluate(el=>new DOMMatrixReadOnly(getComputedStyle(el).transform).m41)).toBeGreaterThan(0);
    await reveal.focus();
    await page.keyboard.press("Space");
    await expect(reveal).toHaveAttribute("aria-pressed","true");
    await page.keyboard.press("Enter");
    await expect(reveal).toHaveAttribute("aria-pressed","false");
    assert.equal(await reveal.evaluate(el=>getComputedStyle(el).outlineStyle),"solid");
    await page.emulateMedia({reducedMotion:"reduce"});
    assert.equal(await layer.evaluate(el=>getComputedStyle(el).transitionDuration),"0s");
    await page.keyboard.press("Space");
    await expect.poll(()=>layer.evaluate(el=>new DOMMatrixReadOnly(getComputedStyle(el).transform).m41)).toBe(0);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    assert.deepEqual(errors,[]);
    results.push(width+"px: shared filters, counts, images, Instagram, reveal, keyboard, reduced motion and overflow passed.");
    await context.close();
  }
  console.log(results.join("\n"));
  await writeFile("qa/portfolio-browser-results.json",JSON.stringify(results,null,2));
}finally{await browser.close();}