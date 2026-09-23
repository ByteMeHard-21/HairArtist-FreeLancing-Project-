/* Auth transitions reload the document to discard private UI and cached session state. */
/* eslint-disable @next/next/no-location-assign-relative-destination */
"use client";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
const errors:Record<string,string> = {
  INVALID_LOGIN:"Email or password is incorrect.", FORBIDDEN:"This account is not authorized for studio access.",
  RATE_LIMITED:"Too many attempts. Please wait before trying again.", INVALID_PASSWORD:"Use a password of at least 12 characters.",
};
export async function adminRequest(action:string, body?:unknown) {
  const response=await fetch("/api/admin/"+action,{method:body===undefined?"GET":"POST",cache:"no-store",
    ...(body===undefined?{}:{headers:{"Content-Type":"application/json"},body:JSON.stringify(body)})});
  const data=await response.json();
  if(!response.ok) {
    if(data.error==="FORBIDDEN") window.location.assign("/admin/unauthorized");
    if(data.error==="UNAUTHORIZED") window.location.assign("/admin/login");
    throw new Error(errors[data.error] || "Studio service is temporarily unavailable. Please try again.");
  }
  return data;
}
export function AdminLogout() {
  const [busy,setBusy]=useState(false),[error,setError]=useState("");
  return <div><button className="booking-button booking-button--outline" disabled={busy} onClick={async()=>{
    setBusy(true); setError(""); try { await adminRequest("logout",{}); window.location.assign("/admin/login"); }
    catch(err){ setError(err instanceof Error?err.message:"Unable to log out.");setBusy(false); }
  }}>{busy?"Logging out…":"Log out"}</button>{error&&<p role="alert" className="booking-error">{error}</p>}</div>;
}
export function AdminAuth({reset=false}:{reset?:boolean}) {
  const [mode,setMode]=useState<"login"|"forgot"|"reset">(reset?"reset":"login");
  const [checking,setChecking]=useState(!reset),[busy,setBusy]=useState(false);
  const [email,setEmail]=useState(""),[password,setPassword]=useState(""),[confirm,setConfirm]=useState("");
  const [error,setError]=useState(""),[notice,setNotice]=useState("");
  function destination(){ return new URLSearchParams(window.location.search).get("recovery")==="1"?"/admin/reset-password":"/admin"; }
  async function session() {
    const response=await fetch("/api/admin/session",{cache:"no-store"});
    if(response.status===401){setMode("login");return;}
    const data=await response.json();
    if(!response.ok){if(data.error==="FORBIDDEN")window.location.assign("/admin/unauthorized");throw new Error("Studio access is temporarily unavailable.");}
    window.location.assign(destination());
  }
  useEffect(()=>{
    if(reset)return;
    let active=true;
    Promise.resolve().then(session).catch(err=>{if(active)setError(err.message);}).finally(()=>{if(active)setChecking(false);});
    return()=>{active=false;};
    // Session hydration runs only on entry; subsequent sign-in calls session explicitly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[reset]);
  async function submit(event:FormEvent) {
    event.preventDefault();if(busy)return;setBusy(true);setError("");setNotice("");
    try{
      if(mode==="login"){await adminRequest("login",{email,password});setPassword("");await session();}
      if(mode==="forgot"){await adminRequest("forgot-password",{email});setNotice("If the account is eligible, a password reset link will arrive by email.");}
      if(mode==="reset"){
        if(password!==confirm)throw new Error("Passwords do not match.");
        await adminRequest("password",{password});setPassword("");setConfirm("");window.location.assign("/admin");
      }
    }catch(err){setError(err instanceof Error?err.message:"Unable to continue.");}
    finally{setBusy(false);}
  }
  return <main id="main" className="admin-page"><section className="booking-card admin-login">
    <Link href="/" className="wordmark"><span>JIAA STUDIO</span></Link>
    <p className="eyebrow">Studio login</p>
    <h1>{mode==="forgot"?"Reset password":mode==="reset"?"Choose a password":"Welcome back."}</h1>
    {error&&<p className="booking-error" role="alert">{error}</p>}
    {notice&&<p className="booking-notice" role="status">{notice}</p>}
    {checking?<p role="status">Checking your session…</p>:<form className="booking-form" onSubmit={submit}>
      {(mode==="login"||mode==="forgot")&&<label>Email<input required type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} /></label>}
      {(mode==="login"||mode==="reset")&&<label>{mode==="reset"?"New password":"Password"}<input required type="password" minLength={mode==="reset"?12:1} autoComplete={mode==="reset"?"new-password":"current-password"} value={password} onChange={e=>setPassword(e.target.value)} /></label>}
      {mode==="reset"&&<label>Confirm password<input required type="password" minLength={12} autoComplete="new-password" value={confirm} onChange={e=>setConfirm(e.target.value)} /></label>}
      <button className="booking-button" disabled={busy}>{busy?"Please wait…":mode==="login"?"Sign in":mode==="forgot"?"Send reset link":"Save password"}</button>
      {mode==="login"&&<button type="button" className="booking-text-button" onClick={()=>{setMode("forgot");setError("");}}>Forgot password?</button>}
      {mode==="forgot"&&<button type="button" className="booking-text-button" onClick={()=>{setMode("login");setNotice("");setError("");}}>Back to sign in</button>}
    </form>}
  </section></main>;
}
