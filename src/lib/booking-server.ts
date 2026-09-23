import "server-only";
import { isSameOrigin } from "./request-origin";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createHmac } from "node:crypto";
import { bookingConfig, dateRange, generateSlots, indiaToday, type AvailabilityResponse } from "@/data/booking";

export class AppError extends Error {
  constructor(public code: string, public status = 400) { super(code); }
}
export function database() {
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new AppError("NOT_CONFIGURED", 503);
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
export function proof(value: string) {
  const key = process.env.BOOKING_HMAC_SECRET;
  if (!key || key.length < 32) throw new AppError("NOT_CONFIGURED", 503);
  return createHmac("sha256", key).update(value).digest("hex");
}
export function reply(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}
export function failure(error: unknown) {
  if (error instanceof AppError) return reply({ error: error.code }, error.status);
  console.error("Booking operation failed.");
  return reply({ error: "SERVICE_UNAVAILABLE" }, 503);
}
export async function input(request: Request): Promise<unknown> {
  if (!isSameOrigin(request, process.env.APP_ORIGIN)) throw new AppError("INVALID_ORIGIN", 403);
  if (!request.headers.get("content-type")?.startsWith("application/json")) throw new AppError("INVALID_REQUEST");
  if (Number(request.headers.get("content-length")) > 8192) throw new AppError("INVALID_REQUEST", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new AppError("INVALID_REQUEST");
  const chunks: Uint8Array[] = []; let length = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > 8192) { await reader.cancel(); throw new AppError("INVALID_REQUEST", 413); }
    chunks.push(value);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { throw new AppError("INVALID_REQUEST"); }
}
export async function limit(request: Request, action: string, identity?: string) {
  // Only configure a header overwritten by your trusted hosting proxy.
  const header = process.env.TRUSTED_CLIENT_IP_HEADER;
  const source = header ? request.headers.get(header)?.split(",")[0]?.trim() || "unknown" : "shared";
  const limits = [{ key: proof(action + ":source:" + source), seconds: 900, limit: action === "verify" ? 60 : 20 }];
  if (identity) {
    limits.push({ key: proof(action + ":identity:" + identity), seconds: 900, limit: action === "verify" ? 15 : 5 });
    if (action === "send") limits.push({ key: proof("send:cooldown:" + identity), seconds: 60, limit: 1 });
  }
  const { data, error } = await database().rpc("consume_booking_limits", { p_limits: limits });
  if (error) throw new AppError("SERVICE_UNAVAILABLE", 503);
  if (!data) throw new AppError("RATE_LIMITED", 429);
}
export async function availability(selectedDate?: string): Promise<AvailabilityResponse> {
  const today = indiaToday(), days = dateRange(today);
  const selected = selectedDate && days.includes(selectedDate) ? selectedDate : today;
  const db = database();
  const [exceptions, bookings, notices] = await Promise.all([
    db.from("availability_exceptions").select("date,reason").gte("date", today).lte("date", days.at(-1)!),
    db.from("bookings").select("slot_start").eq("appointment_date", selected).eq("status", "CONFIRMED"),
    db.from("public_announcements").select("message").eq("active", true).lte("start_date", today).gte("end_date", today),
  ]);
  if (exceptions.error || bookings.error || notices.error) throw new AppError("SERVICE_UNAVAILABLE", 503);
  const closures = new Map(exceptions.data.map(item => [item.date, item.reason]));
  const ready = bookingConfig.workingHours.length > 0 && Boolean(process.env.VERIFICATION_BASE_URL && process.env.VERIFICATION_TOKEN && process.env.BOOKING_HMAC_SECRET);
  return {
    ready, today, selectedDate: selected,
    message: ready ? undefined : "Online reservations are being prepared. Please call or WhatsApp David to arrange your visit.",
    dates: days.map(date => ({ date, closed: closures.has(date) || !generateSlots(date).length, reason: closures.get(date) })),
    slots: closures.has(selected) ? [] : generateSlots(selected).map(slot => ({ ...slot, remaining: Math.max(0, bookingConfig.capacity - bookings.data.filter(b => b.slot_start.slice(0, 5) === slot.start).length) })),
    announcements: notices.data.map(item => item.message),
  };
}
export async function authClient() {
  const jar = await cookies();
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new AppError("NOT_CONFIGURED", 503);
  return createServerClient(url, key, {
    cookieOptions: { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" },
    cookies: { getAll: () => jar.getAll(), setAll: values => { try { values.forEach(({ name, value, options }) => jar.set(name, value, options)); } catch { /* Server Component: the proxy refreshes cookies before rendering. */ } } },
  });
}
