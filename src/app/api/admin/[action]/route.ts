import { after } from "next/server";
import { z } from "zod";
import { dateSchema, dateRange, indiaToday } from "@/data/booking";
import { AppError, authClient, failure, input, limit, reply } from "@/lib/booking-server";
import { adminSession } from "@/lib/admin-server";
import { notifyBooking } from "@/lib/booking-notification";

export const runtime = "nodejs";
type Context = { params: Promise<{ action: string }> };
const columns = "id,booking_reference,appointment_date,slot_start,slot_end,customer_name,gender,mobile_number,service,status,created_at,updated_at";

export async function GET(request: Request, context: Context) {
  try {
    const {action} = await context.params;
    if (action === "session") {
      await adminSession();
      return reply({ok:true});
    }
    const {auth} = await adminSession();
    const params = new URL(request.url).searchParams;
    if (action === "booking") {
      const id = z.uuid().safeParse(params.get("id"));
      if (!id.success) throw new AppError("INVALID_REQUEST");
      const result = await auth.from("bookings").select(columns).eq("id",id.data).maybeSingle();
      if (result.error) throw new AppError("SERVICE_UNAVAILABLE",503);
      if (!result.data) throw new AppError("NOT_FOUND",404);
      return reply({booking:result.data});
    }
    if (action === "settings") {
      const today = indiaToday();
      const [exceptions,announcement] = await Promise.all([
        auth.from("availability_exceptions").select("id,date,reason").gte("date",today).order("date").limit(100),
        auth.from("public_announcements").select("message,active,start_date,end_date").eq("id",1).maybeSingle(),
      ]);
      if(exceptions.error || announcement.error) throw new AppError("SERVICE_UNAVAILABLE",503);
      return reply({today,exceptions:exceptions.data,announcement:announcement.data});
    }
    if (action !== "dashboard") throw new AppError("NOT_FOUND",404);
    const query = z.object({
      view:z.enum(["today","upcoming","all"]).default("today"),
      q:z.string().trim().max(80).regex(/^[\p{L}\p{N} .+'-]*$/u).default(""),
      offset:z.coerce.number().int().min(0).max(10000).default(0),
    }).safeParse(Object.fromEntries(params));
    if (!query.success) throw new AppError("INVALID_REQUEST");
    const {view,q,offset}=query.data;
    const today=indiaToday(), end=dateRange(today).at(-1)!;
    let bookings=auth.from("bookings").select(columns,{count:"exact"});
    if(view==="today") bookings=bookings.eq("appointment_date",today);
    if(view==="upcoming") bookings=bookings.gt("appointment_date",today).lte("appointment_date",end).eq("status","CONFIRMED");
    if(q) bookings=bookings.ilike("customer_name","%"+q+"%");
    const results=await Promise.all([
      bookings.order("appointment_date",{ascending:view!=="all"}).order("slot_start").order("id").range(offset,offset+24),
      auth.from("bookings").select("id",{count:"exact",head:true}).eq("appointment_date",today).eq("status","CONFIRMED"),
      auth.from("availability_exceptions").select("id,date,reason").gte("date",today).order("date").limit(100),
      auth.from("public_announcements").select("message,active,start_date,end_date").eq("id",1).maybeSingle(),
      auth.from("booking_notifications").select("booking_id,recipient,attempts,last_error").is("delivered_at",null).order("created_at").limit(50),
    ]);
    if(results.some(r=>r.error)) throw new AppError("SERVICE_UNAVAILABLE",503);
    return reply({ today, end, bookings:results[0].data, total:results[0].count, confirmedToday:results[1].count,
      exceptions:results[2].data, announcement:results[3].data, notifications:results[4].data,
      nextOffset:(results[0].count || 0)>offset+25?offset+25:null });
  } catch(error) { return failure(error); }
}
export async function POST(request: Request, context: Context) {
  try {
    const {action}=await context.params;
    const body=await input(request);
    if(action==="login") {
      const parsed=z.object({email:z.email().max(254),password:z.string().min(1).max(200)}).strict().safeParse(body);
      if(!parsed.success) throw new AppError("INVALID_LOGIN",401);
      await limit(request,"admin-login",parsed.data.email.toLowerCase());
      const auth=await authClient();
      const result=await auth.auth.signInWithPassword(parsed.data);
      if(result.error || !result.data.user) throw new AppError("INVALID_LOGIN",401);
      try { await adminSession(); } catch(error) { await auth.auth.signOut({scope:"local"}); throw error; }
      return reply({ok:true});
    }
    if(action==="logout") {
      const auth=await authClient();
      const result=await auth.auth.signOut({scope:"local"});
      if(result.error && result.error.status !== 403) throw new AppError("SERVICE_UNAVAILABLE",503);
      return reply({ok:true});
    }
    if(action==="forgot-password") {
      const parsed=z.object({email:z.email().max(254)}).strict().safeParse(body);
      if(!parsed.success) throw new AppError("INVALID_DETAILS");
      await limit(request,"admin-recovery",parsed.data.email.toLowerCase());
      const auth=await authClient();
      const origin=process.env.APP_ORIGIN || new URL(request.headers.get("origin")!).origin;
      // Generic response prevents account enumeration. No provider error or email is logged.
      await auth.auth.resetPasswordForEmail(parsed.data.email,{redirectTo:origin+"/admin/callback"});
      return reply({ok:true});
    }
    const {auth}=await adminSession();
    if(action==="password") {
      const parsed=z.object({password:z.string().min(12).max(128)}).strict().safeParse(body);
      if(!parsed.success) throw new AppError("INVALID_PASSWORD");
      if((await auth.auth.updateUser({password:parsed.data.password})).error) throw new AppError("PASSWORD_FAILED");
      return reply({ok:true});
    }
    if(action==="cancel") {
      const parsed=z.object({id:z.uuid()}).strict().safeParse(body);
      if(!parsed.success) throw new AppError("INVALID_DETAILS");
      const result=await auth.rpc("cancel_studio_booking",{p_id:parsed.data.id});
      if(result.error) throw new AppError("SERVICE_UNAVAILABLE",503);
      if(!result.data) throw new AppError("BOOKING_CHANGED",409);
    } else if(action==="exception") {
      const parsed=z.object({date:dateSchema.refine(d=>d>=indiaToday()),reason:z.string().trim().min(1).max(200)}).strict().safeParse(body);
      if(!parsed.success) throw new AppError("INVALID_DETAILS");
      if((await auth.from("availability_exceptions").upsert(parsed.data,{onConflict:"date"})).error) throw new AppError("SERVICE_UNAVAILABLE",503);
    } else if(action==="remove-exception") {
      const parsed=z.object({id:z.uuid()}).strict().safeParse(body);
      if(!parsed.success) throw new AppError("INVALID_DETAILS");
      if((await auth.from("availability_exceptions").delete().eq("id",parsed.data.id)).error) throw new AppError("SERVICE_UNAVAILABLE",503);
    } else if(action==="announcement") {
      const parsed=z.object({message:z.string().trim().max(500),active:z.boolean(),start_date:dateSchema,end_date:dateSchema}).strict()
        .refine(v=>v.end_date>=v.start_date && (!v.active || v.message.length>0)).safeParse(body);
      if(!parsed.success) throw new AppError("INVALID_DETAILS");
      if((await auth.from("public_announcements").upsert({id:1,...parsed.data})).error) throw new AppError("SERVICE_UNAVAILABLE",503);
    } else if(action==="retry-notification") {
      const parsed=z.object({id:z.uuid(),recipient:z.enum(["david","customer"])}).strict().safeParse(body);
      if(!parsed.success) throw new AppError("INVALID_DETAILS");
      after(()=>notifyBooking(parsed.data.id,parsed.data.recipient));
    } else throw new AppError("NOT_FOUND",404);
    return reply({ok:true});
  } catch(error) { return failure(error); }
}
