/* Auth transitions reload the document to discard private UI and cached session state. */
/* eslint-disable @next/next/no-location-assign-relative-destination */
"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { formatDate, slotLabel, studioHours, type Booking } from "@/data/booking";
import { AdminLogout, adminRequest } from "./admin-auth";

type Announcement={message:string;active:boolean;start_date:string;end_date:string};
type Dashboard={
  today:string;end:string;bookings:Booking[];total:number;confirmedToday:number;nextOffset:number|null;
  exceptions:{id:string;date:string;reason:string}[];announcement:Announcement|null;
  notifications:{booking_id:string;recipient:"david"|"customer";attempts:number;last_error:string|null}[];
};
function errorText(error:unknown){return error instanceof Error?error.message:"Unable to complete this action.";}
function genderName(gender:string){return gender==="men"?"Male":"Female";}

function NoticeEditor({initial,today,onSave}:{initial:Announcement|null;today:string;onSave:()=>void}){
  const [message,setMessage]=useState(initial?.message||""),[active,setActive]=useState(initial ? initial.active : true);
  const [start,setStart]=useState(initial?.start_date||today),[end,setEnd]=useState(initial?.end_date||today);
  const [busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
  const [lastInitial,setLastInitial]=useState(initial);
  // Apply refreshed server values only when the local form has no unsaved edits.
  if(lastInitial !== initial){
    const edited=message !== (lastInitial?.message||"") || active !== (lastInitial?.active??true)
      || start !== (lastInitial?.start_date||today) || end !== (lastInitial?.end_date||today);
    setLastInitial(initial);
    if(!edited){
      setMessage(initial?.message||""); setActive(initial?.active??true);
      setStart(initial?.start_date||today); setEnd(initial?.end_date||today);
    }
  }
  async function save(event:FormEvent){event.preventDefault();setBusy(true);setError("");setNotice("");
    try{await adminRequest("announcement",{message,active,start_date:start,end_date:end});setNotice("Public notice saved.");onSave();}
    catch(err){setError(errorText(err));}finally{setBusy(false);}
  }
  return <section className="booking-card admin-notice"><p className="eyebrow">Public notice</p><h2>Studio announcement</h2>
    <form className="booking-form admin-form" onSubmit={save}>
      <label>Message<textarea aria-label="Message" rows={3} maxLength={500} required={active} value={message} onChange={e=>setMessage(e.target.value)} /></label>
      <div className="admin-date-range"><label>Start date<input type="date" required value={start} onChange={e=>setStart(e.target.value)} /></label><label>End date<input type="date" required min={start} value={end} onChange={e=>setEnd(e.target.value)} /></label></div>
      <label className="admin-check"><input type="checkbox" checked={active} onChange={e=>setActive(e.target.checked)} />Active during these dates</label>
      <button className="booking-button" disabled={busy}>{busy?"Saving…":"Save notice"}</button>
      {notice&&<p role="status">{notice}</p>}{error&&<p role="alert" className="booking-error">{error}</p>}
    </form></section>;
}

function BookingDetail({booking,onClose,onChange}:{booking:Booking;onClose:()=>void;onChange:()=>void}){
  const dialog=useRef<HTMLDialogElement>(null);
  const [confirm,setConfirm]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState("");
  useEffect(()=>{const element=dialog.current!;element.showModal();return()=>element.close();},[]);
  const booked=new Intl.DateTimeFormat("en-IN",{dateStyle:"medium",timeStyle:"short",timeZone:"Asia/Kolkata"}).format(new Date(booking.created_at));
  async function cancel(){setBusy(true);setError("");try{await adminRequest("cancel",{id:booking.id});onChange();onClose();}catch(err){setError(errorText(err));setBusy(false);}}
  return <dialog ref={dialog} className="admin-detail" aria-labelledby="detail-heading" onCancel={e=>{if(busy)e.preventDefault();else onClose();}}>
    <div className="admin-detail-top"><p className="eyebrow">Appointment details</p><button className="booking-text-button" aria-label="Close appointment details" disabled={busy} onClick={onClose}>Close ×</button></div>
    <h2 id="detail-heading">{confirm?"Cancel appointment?":booking.booking_reference}</h2>
    {confirm?<><p>This will mark the appointment as cancelled. The booking record will be kept.</p><div className="admin-detail-actions"><button className="booking-button booking-button--outline" disabled={busy} onClick={()=>setConfirm(false)}>Keep appointment</button><button className="booking-button" disabled={busy} onClick={cancel}>{busy?"Cancelling…":"Cancel appointment"}</button></div></>:<>
      <dl className="admin-detail-fields">{[
        ["Customer",booking.customer_name],["Gender",genderName(booking.gender)],["Service",booking.service],
        ["Date",formatDate(booking.appointment_date)],["Time",slotLabel(booking.slot_start,booking.slot_end)],
        ["Mobile",booking.mobile_number],["Status",booking.status],["Booked at",booked+" IST"],
      ].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      <div className="admin-detail-actions"><a className="booking-button" href={"tel:"+booking.mobile_number}>Call customer</a><a className="booking-button booking-button--outline" href={"https://wa.me/"+booking.mobile_number.replace(/\D/g,"")} target="_blank" rel="noopener noreferrer">WhatsApp customer</a></div>
      {booking.status==="CONFIRMED"&&<button className="booking-text-button admin-cancel" onClick={()=>setConfirm(true)}>Cancel appointment</button>}
    </>}{error&&<p role="alert" className="booking-error">{error}</p>}
  </dialog>;
}

export function AdminDashboard({availabilityOnly=false}:{availabilityOnly?:boolean}){
  const [data,setData]=useState<Dashboard|null>(null),[view,setView]=useState("today");
  const [search,setSearch]=useState(""),[query,setQuery]=useState(""),[offset,setOffset]=useState(0),[refresh,setRefresh]=useState(0);
  const [loading,setLoading]=useState(true),[error,setError]=useState(""),[busy,setBusy]=useState(false),[notice,setNotice]=useState("");
  const [date,setDate]=useState(""),[reason,setReason]=useState(""),[selected,setSelected]=useState<Booking|null>(null);
  useEffect(()=>{const timer=setTimeout(()=>{setQuery(search);setOffset(0);},300);return()=>clearTimeout(timer);},[search]);
  useEffect(()=>{const timer=setInterval(()=>setRefresh(v=>v+1),60000);return()=>clearInterval(timer);},[]);
  useEffect(()=>{
    const controller=new AbortController();
    const params=new URLSearchParams({view,q:query,offset:String(offset)});
    fetch("/api/admin/"+(availabilityOnly?"settings":"dashboard?"+params),{cache:"no-store",signal:controller.signal}).then(async response=>{
      if(response.status===401){window.location.assign("/admin/login");return;}
      const result=await response.json();
      if(!response.ok){
        if(result.error==="FORBIDDEN")window.location.assign("/admin/unauthorized");
        throw new Error("Studio data could not be loaded. Please try again.");
      }
      setData(result);setError("");
    }).catch(err=>{if(!controller.signal.aborted)setError(errorText(err));}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return()=>controller.abort();
  },[view,query,offset,refresh,availabilityOnly]);
  async function save(action:string,body:unknown,message:string){
    if(busy)return;setBusy(true);setError("");setNotice("");
    try{await adminRequest(action,body);setNotice(message);setRefresh(v=>v+1);}
    catch(err){setError(errorText(err));}finally{setBusy(false);}
  }
  async function openBooking(id:string){
    if(busy)return;setBusy(true);setError("");
    try{const result=await adminRequest("booking?id="+id);setSelected(result.booking);}
    catch(err){setError(errorText(err));}finally{setBusy(false);}
  }
  function selectView(value:string){setView(value);setOffset(0);setLoading(true);}
  const groups=data?Object.groupBy(data.bookings||[],b=>b.appointment_date):{};
  return <main id="main" className="admin-page"><div className="booking-container">
    <header className="admin-heading"><div><Link href="/admin" className="wordmark"><span>JIAA STUDIO</span></Link><p className="eyebrow">Booking dashboard</p></div><div className="admin-account"><span>David</span><AdminLogout /></div></header>
    <nav className="admin-tabs" aria-label="Studio navigation"><Link href="/admin" aria-current={!availabilityOnly?"page":undefined}>Appointments</Link><Link href="/admin/availability" aria-current={availabilityOnly?"page":undefined}>Availability</Link></nav>
    {error&&<p className="booking-error" role="alert">{error}</p>}{notice&&<p className="booking-notice" role="status">{notice}</p>}
    {!data?<div className="booking-card"><p role="status">{loading?"Loading studio bookings…":"No data available."}</p><button className="booking-text-button" onClick={()=>setRefresh(v=>v+1)}>Try again</button></div>:<>
      {availabilityOnly?<div className="admin-settings">
        <section className="booking-card"><p className="eyebrow">Regular schedule</p><h1>Studio hours</h1><p className="booking-help">Hourly periods are generated automatically. Manage only exceptions below.</p><dl className="admin-schedule">{studioHours().map(row=><div key={row.days}><dt>{row.days}</dt><dd>{row.time}</dd></div>)}</dl></section>
        <section className="booking-card"><p className="eyebrow">Unavailable dates</p><h2>Add unavailable date</h2><p className="booking-help">Existing appointments remain confirmed. Contact affected customers separately.</p>
          <form className="booking-form admin-form" onSubmit={e=>{e.preventDefault();void save("exception",{date,reason},"Date closed to new bookings.");}}>
            <label>Date<input type="date" required min={data.today} value={date} onChange={e=>setDate(e.target.value)} /></label>
            <label>Public reason<input required maxLength={200} value={reason} onChange={e=>setReason(e.target.value)} /></label>
            <button className="booking-button" disabled={busy}>Add unavailable date</button>
          </form><ul className="admin-exceptions">{data.exceptions.map(item=><li key={item.id}><div><strong>{formatDate(item.date,true)}</strong><p>{item.reason}</p></div><button className="booking-text-button" disabled={busy} onClick={()=>save("remove-exception",{id:item.id},"Date reopened according to regular hours.")}>Reopen</button></li>)}</ul>
          {!data.exceptions.length&&<p className="booking-help">No upcoming exceptional closures.</p>}
        </section>
      </div>:<>
        <NoticeEditor initial={data.announcement} today={data.today} onSave={()=>setRefresh(v=>v+1)} />
        <section className="booking-card admin-appointments">
          <div className="booking-card-heading"><div><p className="eyebrow">Today · {formatDate(data.today,true)}</p><h1>{data.confirmedToday} confirmed appointment{data.confirmedToday===1?"":"s"}</h1></div><button className="booking-text-button" disabled={busy} onClick={()=>setRefresh(v=>v+1)}>Refresh</button></div>
          <div className="admin-toolbar"><div className="admin-tabs" role="group" aria-label="Appointment filters">{["today","upcoming","all"].map(item=><button key={item} aria-pressed={view===item} onClick={()=>selectView(item)}>{item}</button>)}</div><label>Search customer<input type="search" maxLength={80} placeholder="Search customer…" value={search} onChange={e=>setSearch(e.target.value)} /></label></div>
          {view==="upcoming"&&<p className="booking-help">Confirmed visits through {formatDate(data.end,true)}.</p>}
          {view==="all"&&<p className="booking-help">All dates and statuses, including historical bookings.</p>}
          {loading?<p role="status">Loading appointments…</p>:!data.bookings.length?<p className="booking-empty">No appointments to display.</p>:Object.entries(groups).map(([day,bookings])=><section className="admin-day" key={day}><h2>{formatDate(day)}</h2>
            <div className="admin-table"><table><thead><tr>{["Date","Time","Customer","Gender","Service","Mobile","Status"].map(label=><th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{bookings!.map(booking=><tr key={booking.id}>
              <td>{formatDate(booking.appointment_date,true)}</td><td>{slotLabel(booking.slot_start,booking.slot_end)}</td>
              <td><button className="admin-booking-open" disabled={busy} onClick={()=>openBooking(booking.id)}>{booking.customer_name}<small>{booking.booking_reference}</small></button></td>
              <td>{genderName(booking.gender)}</td><td>{booking.service}</td><td><a href={"tel:"+booking.mobile_number}>{booking.mobile_number}</a></td><td><span className={"admin-status status-"+booking.status.toLowerCase()}>{booking.status}</span></td>
            </tr>)}</tbody></table></div>
            <div className="admin-mobile-bookings">{bookings!.map(booking=><button className="admin-appointment-card" disabled={busy} key={booking.id} onClick={()=>openBooking(booking.id)}>
              <span className="eyebrow">{slotLabel(booking.slot_start,booking.slot_end)}</span><strong>{booking.customer_name}</strong><span>{genderName(booking.gender)} · {booking.service}</span><span>{booking.mobile_number}</span><span className={"admin-status status-"+booking.status.toLowerCase()}>{booking.status}</span>
            </button>)}</div>
          </section>)}
          <div className="admin-pagination"><button className="booking-text-button" disabled={!offset||loading} onClick={()=>{setOffset(v=>Math.max(0,v-25));setLoading(true);}}>← Previous</button><span className="booking-help">Page {offset/25+1} · {data.total} results</span><button className="booking-text-button" disabled={data.nextOffset===null||loading} onClick={()=>{setOffset(data.nextOffset!);setLoading(true);}}>Next →</button></div>
        </section>
        {!!data.notifications.length&&<section className="booking-card admin-notifications"><p className="eyebrow">Delivery</p><h2>WhatsApp notifications</h2><p className="booking-help">Notification failures do not cancel appointments.</p><ul className="admin-exceptions">{data.notifications.map(item=><li key={item.booking_id+item.recipient}><div><strong>{item.recipient==="david"?"David notification":"Customer confirmation"}</strong><p>{item.last_error==="NOT_CONFIGURED"?"Provider configuration required":item.last_error?"Delivery unsuccessful":"Awaiting delivery"} · Attempts: {item.attempts}</p></div><button className="booking-text-button" disabled={busy} onClick={()=>save("retry-notification",{id:item.booking_id,recipient:item.recipient},"Retry requested.")}>Retry</button></li>)}</ul></section>}
      </>}
    </>}
    {selected&&<BookingDetail booking={selected} onClose={()=>setSelected(null)} onChange={()=>{setNotice("Appointment cancelled.");setRefresh(v=>v+1);}} />}
  </div></main>;
}
