import assert from "node:assert/strict";
import {mkdir,writeFile} from "node:fs/promises";
import {chromium,expect} from "@playwright/test";
import {testimonials} from "../src/data/testimonials.ts";
const browser=await chromium.launch({channel:"msedge",headless:true});
const results=[];
await mkdir("qa/screenshots/home-content",{recursive:true});
try{
  for(const width of [360,390,599,768,1024,1440]){
    const context=await browser.newContext({viewport:{width,height:1000},hasTouch:width<600,isMobile:width<600});
    const page=await context.newPage();
    const errors=[];
    page.on("pageerror",e=>errors.push(e.message));
    page.on("console",e=>{if(e.type()==="error")errors.push(e.text());});
    await page.goto("http://127.0.0.1:3000/");
    const artist=page.locator("#artist");
    await expect(artist).toContainText("6+ years of experience");
    await expect(artist.locator(".artist-work, .artist-studio")).toHaveCount(0);
    await expect(artist).toContainText("Good hair starts with understanding the person behind it.");
    const men=page.locator("#work .portfolio-filters").getByRole("button",{name:"men",exact:true});
    await men.click();
    for(const [id,file] of [["01","precision-cut-v2.png"],["05","hair-colour-v2.png"]]){
      const image=page.locator('[data-project="men-'+id+'"] img');
      await expect(image).toHaveAttribute("src",new RegExp(file));
    }
    const carousel=page.getByRole("region",{name:"Client reviews"});
    const track=carousel.locator(".testimonial-track");
    const current=()=>carousel.locator('.testimonial-card[aria-hidden="false"]');
    await carousel.scrollIntoViewIfNeeded();
    await page.getByRole("button",{name:"Pause automatic testimonials"}).click();
    const height=await carousel.locator(".testimonial-window").evaluate(el=>el.getBoundingClientRect().height);
    await page.mouse.move(0,0);
    for(let index=0;index<5;index++){
      const expected=testimonials[index%4];
      await expect(current().locator("blockquote")).toHaveText(expected.quote);
      await expect(current()).toContainText(expected.attribution);
      await expect(current()).toContainText(expected.service);
      await page.getByRole("button",{name:"Next testimonial",exact:true}).click();
      await expect(track).toHaveAttribute("data-moving","true");
      assert.equal(await track.evaluate(el=>getComputedStyle(el).transitionDuration),"0.6s");
      await expect(track).toHaveAttribute("data-moving","false");
      assert.equal(await carousel.locator(".testimonial-window").evaluate(el=>el.getBoundingClientRect().height),height,"Review height must not jump");
    }
    // Priya → Rahul → Amit crosses the cloned previous edge.
    for(const name of ["Rahul P.","Amit R."]){
      await page.getByRole("button",{name:"Previous testimonial",exact:true}).click();
      await expect(track).toHaveAttribute("data-moving","false");
      await expect(current()).toContainText(name);
    }
    if(width<600){
      const cdp=await context.newCDPSession(page);
      const viewport=carousel.locator(".testimonial-window");
      await viewport.scrollIntoViewIfNeeded();
      const box=await viewport.boundingBox(), y=Math.min(box.y+box.height/2,850);
      await cdp.send("Input.dispatchTouchEvent",{type:"touchStart",touchPoints:[{x:box.x+box.width*.8,y}]});
      for(const fraction of [.65,.5,.35,.2])await cdp.send("Input.dispatchTouchEvent",{type:"touchMove",touchPoints:[{x:box.x+box.width*fraction,y}]});
      await cdp.send("Input.dispatchTouchEvent",{type:"touchEnd",touchPoints:[]});
      await expect(track).toHaveAttribute("data-moving","false");
      await expect(current()).toContainText("Rahul P.");
    }
    const next=page.getByRole("button",{name:"Next testimonial",exact:true});
    await next.focus();await page.keyboard.press("Enter");
    await expect(track).toHaveAttribute("data-moving","false");
    assert.equal(await next.evaluate(el=>getComputedStyle(el).outlineStyle),"solid");
    await page.emulateMedia({reducedMotion:"reduce"});
    await next.click();
    await expect(track).toHaveAttribute("data-moving","false");
    assert.equal(await track.evaluate(el=>getComputedStyle(el).transitionDuration),"0s");
    const still=await current().innerText();
    await page.waitForTimeout(700);
    assert.equal(await current().innerText(),still);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    await page.locator(".testimonials").screenshot({path:"qa/screenshots/home-content/reviews-"+width+".png",style:".site-header,.skip-link,.mobile-contact-bar {visibility:hidden!important}"});
    await artist.scrollIntoViewIfNeeded();
    await expect.poll(()=>artist.locator("img").evaluate(img=>img.complete&&img.naturalWidth>0)).toBe(true);
    await artist.screenshot({path:"qa/screenshots/home-content/artist-"+width+".png",style:".site-header,.skip-link,.mobile-contact-bar {visibility:hidden!important}"});
    assert.deepEqual(errors,[]);
    results.push(width+"px: updated content/images, forward/backward loops, stable height, keyboard, reduced motion"+(width<600?", touch swipe":"")+", no overflow or console errors.");
    await context.close();
  }
  // Real-time autoplay and hover checks on a separate, unfocused desktop session.
  const context=await browser.newContext({viewport:{width:1440,height:1000}});
  const page=await context.newPage();
  await page.goto("http://127.0.0.1:3000/");
  const carousel=page.locator(".testimonial-carousel"),track=carousel.locator(".testimonial-track");
  const current=()=>carousel.locator('.testimonial-card[aria-hidden="false"]');
  await carousel.scrollIntoViewIfNeeded();
  await carousel.hover();
  const held=await current().innerText();
  await page.waitForTimeout(6100);
  assert.equal(await current().innerText(),held,"Hover pauses autoplay");
  await page.mouse.move(0,0);
  await expect(current()).toContainText("Priya S.",{timeout:7000});
  await expect(track).toHaveAttribute("data-moving","false");
  for(const name of ["Mansi. S.","Amit R.","Rahul P."]){
    await expect(current()).toContainText(name,{timeout:7000});
    await expect(track).toHaveAttribute("data-moving","false");
  }
  await page.getByRole("button",{name:"Next testimonial",exact:true}).click();
  await page.mouse.move(0,0);
  await expect(track).toHaveAttribute("data-moving","false");
  await page.waitForTimeout(3500);
  await expect(current()).toContainText("Priya S.");
  await expect(current()).toContainText("Mansi. S.",{timeout:4000});
  results.push("5.5-second autoplay loops last-to-first, pauses on hover and restarts with a full interval after manual interaction.");
  await context.close();
  console.log(results.join("\n"));
  await writeFile("qa/home-content-browser-results.json",JSON.stringify(results,null,2));
}finally{await browser.close();}