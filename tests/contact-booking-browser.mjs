import assert from "node:assert/strict";
import {mkdir,writeFile} from "node:fs/promises";
import {chromium,webkit,expect,devices} from "@playwright/test";
const engine=process.env.QA_BROWSER||"msedge";
const browser=engine==="webkit"?await webkit.launch({headless:true}):await chromium.launch({channel:engine,headless:true});
const base="http://127.0.0.1:3000";
const forceApple=process.env.QA_APPLE==="1";
const sizes=forceApple?[[390,844],[768,1000]]:engine==="msedge"?[[360,800],[375,812],[390,844],[768,1000],[1024,900],[1440,1000],[390,420]]:engine==="webkit"?[[390,844],[768,1000],[1440,1000]]:[[390,844],[1440,1000]];
const message="Hi David, I found your website and would like to book a visit. Please let me know your availability.";
const results=[];
await mkdir("qa/screenshots/contact-booking",{recursive:true});
try{
 for(const [width,height] of sizes){
  const apple=(engine==="webkit"||forceApple)&&width<900;
  const options={...(apple?devices[width<600?"iPhone 13":"iPad (gen 7)"]:{}),viewport:{width,height},hasTouch:width<900,isMobile:width<900};
  const context=await browser.newContext(options);
  const page=await context.newPage(),errors=[],writes=[];
  page.on("pageerror",e=>errors.push(e.message));
  page.on("console",e=>{if(e.type()==="error")errors.push(e.text());});
  page.on("request",request=>{if(request.method()==="POST"&&request.url().includes("/api/"))writes.push(request.url());});
  await page.goto(base);
  const dialog=page.getByRole("dialog",{name:"Book a visit",exact:true});
  await expect(page.locator("#contact-booking-dialog")).toHaveCount(1);
  await expect(page.locator('a[href="/book"]')).toHaveCount(0);
  await expect(page.locator(".service-preview").getByRole("link",{name:/View full menu/i})).toHaveAttribute("href","/menu");
  await expect(page.getByRole("link",{name:"Studio login →",exact:true})).toHaveAttribute("href","/admin/login");
  await expect(page.locator(".location-actions").getByRole("link",{name:/Call David/i})).toHaveAttribute("href","tel:+918238108943");
  await expect(page.locator(".location-actions").getByRole("link",{name:/WhatsApp David/i})).toHaveAttribute("href",/https:\/\/wa.me\/918238108943/);
  for(const entry of ["navigation","services","location","footer"]){
   if(entry==="navigation"&&width<900)await page.getByRole("button",{name:"Open navigation",exact:true}).click();
   const scope=entry==="navigation"?page.getByRole("navigation",{name:width<900?"Mobile navigation":"Main navigation",exact:true}):page.locator(entry==="services"?".service-preview":entry==="location"?".location-actions":".site-footer");
   const trigger=scope.getByRole("button",{name:/Book a visit/i});
   await trigger.evaluate(el=>el.scrollIntoView({block:"center",behavior:"instant"}));
   const scroll=await page.evaluate(()=>scrollY);
   const bodyStyle=await page.evaluate(()=>({position:document.body.style.position,overflow:document.documentElement.style.overflow}));
   if(width<900)await trigger.tap();else await trigger.click();
   await expect(dialog).toBeVisible();
   await expect(page).toHaveURL(base+"/");
   await expect(dialog).toContainText("How would you like to book your appointment?");
   await expect(dialog).toContainText("David confirms availability personally.");
   const call=dialog.getByRole("link",{name:/Call David/});
   const whatsapp=dialog.getByRole("link",{name:/Message David/});
   await expect(call).toHaveAttribute("href","tel:+918238108943");
   const href=await whatsapp.getAttribute("href");
   assert.equal(href,"https://wa.me/918238108943?text="+encodeURIComponent(message));
   await expect(whatsapp).toHaveAttribute("target","_blank");
   await expect(whatsapp).toHaveAttribute("rel","noopener noreferrer");
   assert.equal(new URL(href).searchParams.get("text"),message);
   await expect.poll(()=>dialog.evaluate(el=>getComputedStyle(el).animationName)).toBe(width<600?"contact-booking-sheet":"contact-booking-enter");
   // Wait for the brief entrance animation to finish before measuring placement.
   await dialog.evaluate(async el=>{await Promise.all(el.getAnimations().map(animation=>animation.finished));});
   const rect=await dialog.boundingBox();
   assert.ok(rect.x>=-1&&rect.y>=-1&&rect.x+rect.width<=width+1&&rect.y+rect.height<=height+1,JSON.stringify(rect));
   if(width<600)assert.ok(Math.abs(rect.y+rect.height-height)<2,"Sheet should sit at viewport bottom");
   else assert.ok(Math.abs(rect.y+rect.height/2-height/2)<3,"Desktop dialog should be centered");
   assert.equal(await page.evaluate(()=>document.body.style.position),"fixed");
   assert.equal(await page.evaluate(()=>document.documentElement.style.overflow),"hidden");
   for(let i=0;i<5;i++){
    await page.keyboard.press("Tab");
    assert.ok(await dialog.evaluate(el=>el.contains(document.activeElement)),"Keyboard focus must remain in the dialog");
   }
   for(const action of [call,whatsapp]){
    const colors=await action.evaluate(el=>({color:getComputedStyle(el).color,background:getComputedStyle(el).backgroundColor,height:el.getBoundingClientRect().height}));
    assert.ok(colors.height>=44);
    assert.notEqual(colors.color,colors.background);
    assert.equal(await action.getAttribute("aria-busy"),null);
   }
   if(entry==="services")await page.screenshot({path:"qa/screenshots/contact-booking/"+engine+"-"+width+"x"+height+".png"});
   await page.keyboard.press("Escape");
   await expect(dialog).not.toBeVisible();
   await expect.poll(()=>page.evaluate(()=>scrollY)).toBe(scroll);
   assert.deepEqual(await page.evaluate(()=>({position:document.body.style.position,overflow:document.documentElement.style.overflow})),bodyStyle);
   const returnTo=entry==="navigation"&&width<900?page.getByRole("button",{name:"Open navigation",exact:true}):trigger;
   await expect(returnTo).toBeFocused();
  }
  const trigger=page.locator(".service-preview").getByRole("button",{name:/Book a visit/i});
  await trigger.click();await expect(dialog).toBeVisible();
  await page.mouse.click(5,5);await expect(dialog).not.toBeVisible();
  // Do not launch a phone/WhatsApp application during automated checks.
  for(const label of ["Call David","Message David"]){
   await trigger.click();await expect(dialog).toBeVisible();
   const action=dialog.getByRole("link",{name:new RegExp(label)});
   await page.mouse.move(0,0);
   const original=await action.evaluate(el=>({color:getComputedStyle(el).color,background:getComputedStyle(el).backgroundColor}));
   await action.evaluate(el=>el.addEventListener("click",event=>event.preventDefault(),{once:true}));
   if(width<900)await action.tap();else await action.click();
   await expect(dialog).not.toBeVisible();
   await trigger.click();await expect(dialog).toBeVisible();
   await page.mouse.move(0,0);
   const current=await action.evaluate(el=>({color:getComputedStyle(el).color,background:getComputedStyle(el).backgroundColor}));
   assert.deepEqual(current,original,"Native action must not leave a loading or white-button state");
   await dialog.getByRole("button",{name:"Close booking options"}).click();
  }
  await page.emulateMedia({reducedMotion:"reduce"});
  await trigger.click();await expect(dialog).toBeVisible();
  assert.equal(await dialog.evaluate(el=>getComputedStyle(el).animationName),"none");
  await dialog.getByRole("button",{name:"Close booking options"}).click();
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  assert.deepEqual(writes,[],"Contact booking must not submit to APIs or trigger OTP");
  assert.deepEqual(errors,[]);
  // The same provider works on an internal public page.
  await page.goto(base+"/menu");
  const footer=page.locator(".site-footer").getByRole("button",{name:/Book a visit/i});
  await footer.click();await expect(dialog).toBeVisible();
  await dialog.getByRole("button",{name:"Close booking options"}).click();
  results.push(engine+" "+width+"x"+height+": all entry points, tel/WhatsApp, focus, Escape/outside/close, scroll restoration, reduced motion, no writes/overflow/console errors.");
  await context.close();
 }
 console.log(results.join("\n"));
 await writeFile("qa/contact-booking-"+engine+(forceApple?"-apple-uri":"")+".json",JSON.stringify(results,null,2));
}finally{await browser.close();}