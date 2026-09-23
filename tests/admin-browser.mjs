// Isolated provider fixture: the real Next server/auth routes run against this local fake Supabase.
// No production accounts, booking rows, emails or messages are changed.
import {createServer} from "node:http";
import {spawn} from "node:child_process";
import {createHmac,randomUUID} from "node:crypto";
import {mkdir,writeFile} from "node:fs/promises";
import assert from "node:assert/strict";
import {chromium,expect} from "@playwright/test";
import {indiaToday,dateRange} from "../src/data/booking.ts";
const base="http://127.0.0.1:3100", backend="http://127.0.0.1:4319";
const admin="11111111-1111-4111-8111-111111111111",other="22222222-2222-4222-8222-222222222222";
const today=indiaToday(),future=dateRange(today)[2];
let active=true,notices=null,exceptions=[];
const mfaRequests=[];
const tokens=new Map();
function user(id){return {id,email:id===admin?"admin@example.test":"outsider@example.test",aud:"authenticated",role:"authenticated",created_at:new Date().toISOString(),app_metadata:{provider:"email"},user_metadata:{},factors:[]};}
function session(id,aal="aal1"){
  const header=Buffer.from(JSON.stringify({alg:"HS256",typ:"JWT"})).toString("base64url");
  const payload=Buffer.from(JSON.stringify({sub:id,aal,role:"authenticated",aud:"authenticated",iss:backend+"/auth/v1",exp:Math.floor(Date.now()/1000)+3600,iat:Math.floor(Date.now()/1000),session_id:randomUUID()})).toString("base64url");
  const jwt=header+"."+payload+"."+createHmac("sha256","fixture-only").update(header+"."+payload).digest("base64url");
  tokens.set(jwt,{id,aal});return {access_token:jwt,refresh_token:randomUUID(),expires_in:3600,token_type:"bearer",user:user(id)};
}
const rows=[
  {id:randomUUID(),booking_reference:"JIAA-TEST1",appointment_date:today,slot_start:"10:00:00",slot_end:"11:00:00",customer_name:"Test Client",gender:"men",mobile_number:"+919999999999",service:"Hair + Beard",status:"CONFIRMED",created_at:new Date().toISOString(),updated_at:new Date().toISOString()},
  {id:randomUUID(),booking_reference:"JIAA-TEST2",appointment_date:future,slot_start:"14:00:00",slot_end:"15:00:00",customer_name:"Future Client",gender:"women",mobile_number:"+919888888888",service:"Women's Hair Styling",status:"CONFIRMED",created_at:new Date().toISOString(),updated_at:new Date().toISOString()},
  {id:randomUUID(),booking_reference:"JIAA-TEST3",appointment_date:future,slot_start:"15:00:00",slot_end:"16:00:00",customer_name:"Cancelled Client",gender:"men",mobile_number:"+919777777777",service:"Haircut",status:"CANCELLED",created_at:new Date().toISOString(),updated_at:new Date().toISOString()},
];
function match(record,params){
  for(const [key,filter] of params){
    if(["select","order","offset","limit"].includes(key))continue;
    const index=filter.indexOf("."),op=filter.slice(0,index),value=filter.slice(index+1);
    if(op==="eq" && String(record[key])!==value)return false;
    if(op==="gte" && record[key]<value)return false;if(op==="gt"&&record[key]<=value)return false;if(op==="lte"&&record[key]>value)return false;
    if(op==="ilike" && !record[key]?.toLowerCase().includes(value.replaceAll("%","").toLowerCase()))return false;
  }return true;
}
const server=createServer(async(req,res)=>{
  const url=new URL(req.url,backend),path=url.pathname;
  let raw="";for await(const chunk of req)raw+=chunk;
  const body=raw?JSON.parse(raw):{},token=tokens.get((req.headers.authorization||"").replace("Bearer ",""));
  const send=(data,status=200,count)=>{
    res.writeHead(status,{"Content-Type":"application/json",...(count===undefined?{}:{"Content-Range":"0-"+Math.max(0,count-1)+"/"+count})});res.end(req.method==="HEAD"?"":JSON.stringify(data));
  };
  if(path==="/auth/v1/token"){ if(url.searchParams.get("grant_type")==="pkce" && body.auth_code==="fixture-recovery") return send(session(admin));
    if(body.password!=="fixture-password")return send({msg:"Invalid credentials",code:"invalid_credentials"},400);
    return send(session(body.email==="admin@example.test"?admin:other));
  }
  if(path==="/auth/v1/user"){
    if(!token)return send({msg:"Invalid token"},401);
    return send(user(token.id));
  }
  if(path==="/auth/v1/logout"){tokens.delete((req.headers.authorization||"").replace("Bearer ",""));res.writeHead(204);return res.end();}
  if(path==="/auth/v1/recover")return send({});
  if(path.startsWith("/auth/v1/factors")){mfaRequests.push(path);return send({message:"MFA is not part of studio sign-in"},404);}
  if(path==="/rest/v1/rpc/consume_booking_limits")return send(true);
  if(path==="/rest/v1/admin_users")return send(token?.id===admin?{role:"ADMIN",is_active:active}:null);
  if(path==="/rest/v1/rpc/cancel_studio_booking"){
    if(token?.id!==admin||!active)return send({message:"FORBIDDEN"},403);
    const row=rows.find(r=>r.id===body.p_id&&r.status==="CONFIRMED");if(row)row.status="CANCELLED";return send(row?.id||null);
  }
  if(path.startsWith("/rest/v1/")){
    const table=path.split("/").at(-1);
    if(table==="bookings"){
      const data=rows.filter(r=>match(r,url.searchParams));
      if(req.headers.accept?.includes("vnd.pgrst.object"))return send(data[0]||null);
      const offset=Number(url.searchParams.get("offset")||0),limit=Number(url.searchParams.get("limit")||25);
      return send(data.slice(offset,offset+limit),200,data.length);
    }
    if(table==="public_announcements"){
      if(req.method==="POST")notices=body;
      return send(req.method==="GET"?notices:null);
    }
    if(table==="availability_exceptions"){
      if(req.method==="POST")exceptions=[...exceptions.filter(e=>e.date!==body.date),{id:randomUUID(),...body}];
      if(req.method==="DELETE")exceptions=exceptions.filter(e=>!match(e,url.searchParams));
      return send(req.method==="GET"?exceptions:null);
    }
    if(table==="booking_notifications")return send([]);
  }
  send({message:"Unexpected fixture endpoint "+path},404);
});
await new Promise(resolve=>server.listen(4319,"127.0.0.1",resolve));
const next=spawn(process.execPath,["node_modules/next/dist/bin/next","start","--hostname","127.0.0.1","--port","3100"],{
  cwd:process.cwd(),windowsHide:true,stdio:["ignore","pipe","pipe"],
  env:{...process.env,SUPABASE_URL:backend,SUPABASE_ANON_KEY:"fixture-anon",SUPABASE_SERVICE_ROLE_KEY:"fixture-service",BOOKING_HMAC_SECRET:"fixture-only-secret-32-characters-long",APP_ORIGIN:base,VERIFICATION_BASE_URL:"",VERIFICATION_TOKEN:"",WHATSAPP_NOTIFICATION_URL:"",WHATSAPP_NOTIFICATION_TOKEN:""}
});
let logs="";next.stdout.on("data",d=>logs+=d);next.stderr.on("data",d=>logs+=d);
let browser, lastPage;
const results=[];
try{
  for(let n=0;n<100;n++){try{if((await fetch(base+"/admin/login")).ok)break;}catch{}await new Promise(r=>setTimeout(r,200));}
  browser=await chromium.launch({channel:"msedge",headless:true});
  const context=await browser.newContext();
  const page=await context.newPage(); lastPage=page; const apiGet=async(url)=>{const status=await page.evaluate(async endpoint=>(await fetch(endpoint)).status,url);return {status:()=>status};};
  const pageErrors=[];page.on("pageerror",e=>pageErrors.push(e.message));
  await page.goto(base+"/admin/availability");await expect(page).toHaveURL(/\/admin\/login$/);
  assert.equal((await apiGet(base+"/api/admin/dashboard")).status(),401);
  await page.getByLabel("Email",{exact:true}).fill("admin@example.test");
  await page.getByLabel("Password",{exact:true}).fill("wrong");
  await page.getByRole("button",{name:"Sign in",exact:true}).click();
  await expect(page.locator(".booking-error[role=alert]")).toContainText("incorrect");
  await page.getByLabel("Password",{exact:true}).fill("fixture-password");
  await page.getByRole("button",{name:"Sign in",exact:true}).click();
  await expect(page).toHaveURL(base+"/admin");
  await expect(page.getByRole("heading",{name:"1 confirmed appointment",exact:true})).toBeVisible();
  assert.ok((await context.cookies()).filter(c=>c.name.includes("auth-token")).every(c=>c.httpOnly&&c.secure));
  results.push("Real Next auth routes with isolated provider: redirects, wrong password, direct password login, AAL1 admin access, secure HttpOnly cookies.");
  await mkdir("qa/screenshots/admin",{recursive:true});
  for(const width of [360,375,390,768,1024,1440]){
    await page.setViewportSize({width,height:1000});
    await page.goto(base+"/admin");
    await expect(page.getByRole("heading",{name:"1 confirmed appointment",exact:true})).toBeVisible();
    assert.equal(await page.locator(".site-header").count(),0);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    await page.screenshot({path:"qa/screenshots/admin/dashboard-"+width+".png",fullPage:true});
    const open=width<900?page.locator(".admin-appointment-card").filter({hasText:"Test Client"}):page.getByRole("button",{name:/Test Client/});
    await open.click();await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("dialog")).toContainText("JIAA-TEST1");
    await expect(page.getByRole("link",{name:"Call customer",exact:true})).toHaveAttribute("href","tel:+919999999999");
    await page.getByRole("button",{name:"Close appointment details"}).click();
    await page.getByRole("button",{name:"upcoming",exact:true}).click();
    await expect(page.locator(".admin-day").first()).toContainText("Future Client");
    await expect(page.locator(".admin-day")).not.toContainText("Cancelled Client");
    await page.getByRole("button",{name:"all",exact:true}).click();
    await page.getByLabel("Search customer").fill("Future");
    await expect(page.locator(".admin-pagination")).toContainText("1 results");
    await page.getByRole("link",{name:"Availability",exact:true}).click();
    await expect(page.getByRole("heading",{name:"Studio hours",exact:true})).toBeVisible();
    await expect(page.locator(".admin-schedule")).toContainText("Sunday");
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    await page.screenshot({path:"qa/screenshots/admin/availability-"+width+".png",fullPage:true});
  }
  results.push("Six widths: dashboard, appointment details, upcoming excludes cancelled, server search, regular hours and availability; no overflow or public navbar.");
  await page.getByLabel("Date",{exact:true}).fill(future);
  await page.getByLabel("Public reason").fill("Test closure");
  await page.getByRole("button",{name:"Add unavailable date",exact:true}).click();
  await expect(page.locator(".admin-exceptions")).toContainText("Test closure");
  await page.getByRole("button",{name:"Reopen",exact:true}).click();
  await expect(page.locator(".admin-exceptions li")).toHaveCount(0);
  await page.goto(base+"/admin");
  await page.getByLabel("Message",{exact:true}).fill("Test public notice");
  await page.getByLabel("Active during these dates").check();
  await page.getByRole("button",{name:"Save notice",exact:true}).click();
  await expect(page.getByRole("status")).toContainText("Public notice saved");
  await page.getByLabel("Message",{exact:true}).fill("Unsaved notice draft");
  await Promise.all([page.waitForResponse(response=>response.url().includes("/api/admin/dashboard")), page.getByRole("button",{name:"Refresh",exact:true}).click()]);
  await expect(page.getByLabel("Message",{exact:true})).toHaveValue("Unsaved notice draft");
  await page.getByRole("button",{name:/Test Client/}).click();
  await page.getByRole("button",{name:"Cancel appointment",exact:true}).click();
  await page.getByRole("button",{name:"Keep appointment",exact:true}).click();
  assert.equal(rows[0].status,"CONFIRMED");
  await page.getByRole("button",{name:"Cancel appointment",exact:true}).click();
  await page.getByRole("dialog").getByRole("button",{name:"Cancel appointment",exact:true}).click();
  await expect(page.getByRole("heading",{name:"0 confirmed appointments",exact:true})).toBeVisible();
  assert.equal(rows[0].status,"CANCELLED");
  results.push("Exception add/reopen, public notice save, keep/cancel dialog, cancelled count exclusion.");
  active=false;
  assert.equal((await apiGet(base+"/api/admin/dashboard")).status(),403);
  active=true;
  await page.getByRole("button",{name:"Log out",exact:true}).click();
  await expect(page).toHaveURL(/\/admin\/login$/);
  assert.equal((await apiGet(base+"/api/admin/dashboard")).status(),401);
  await page.getByLabel("Email",{exact:true}).fill("admin@example.test");
  await page.getByLabel("Password",{exact:true}).fill("fixture-password");
  await page.getByRole("button",{name:"Sign in",exact:true}).click();
  await expect(page).toHaveURL(base+"/admin");
  assert.equal((await apiGet(base+"/api/admin/dashboard")).status(),200);
  await page.getByRole("button",{name:"Log out",exact:true}).click();
  await expect(page).toHaveURL(/\/admin\/login$/);
  await page.getByRole("button",{name:"Forgot password?",exact:true}).click();
  await page.getByLabel("Email",{exact:true}).fill("admin@example.test");
  await page.getByRole("button",{name:"Send reset link",exact:true}).click();
  await expect(page.getByRole("status")).toContainText("If the account is eligible");
  await page.goto(base+"/admin/callback?code=fixture-recovery");
  await expect(page).toHaveURL(base+"/admin/reset-password");
  await page.getByLabel("New password",{exact:true}).fill("fixture-new-password");
  await page.getByLabel("Confirm password",{exact:true}).fill("fixture-new-password");
  await page.getByRole("button",{name:"Save password",exact:true}).click();
  await expect(page).toHaveURL(base+"/admin");
  results.push("Password recovery PKCE callback allows password update without an authenticator (local provider fixture only).");
  const outsider=await browser.newContext();
  const rejected=await outsider.request.post(base+"/api/admin/login",{headers:{Origin:base},data:{email:"outsider@example.test",password:"fixture-password"}});
  assert.equal(rejected.status(),403);
  assert.equal((await outsider.request.get(base+"/api/admin/dashboard")).status(),401);
  await outsider.close();
  assert.deepEqual(pageErrors,[]);
  assert.deepEqual(mfaRequests,[],"Sign-in and recovery must not request authenticator APIs");
  results.push("Deactivation rejected, logout clears access, returning user enters dashboard directly, non-admin login denied; no page errors.");
  await writeFile("qa/admin-browser-results.json",JSON.stringify({fixture:true,results},null,2));
  console.log(results.join("\n"));
}catch(error){console.error(logs.slice(-4000)); if(lastPage)console.error("Fixture page:",lastPage.url(),await lastPage.locator("body").innerText()); throw error;}
finally{if(browser)await browser.close();next.kill();server.close();}
