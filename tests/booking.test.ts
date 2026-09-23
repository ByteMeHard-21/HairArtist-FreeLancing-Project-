import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { isSameOrigin } from "../src/lib/request-origin";
import { bookingMessage } from "../src/data/booking-messages";
import type { Booking } from "../src/data/booking";
import { siteConfig } from "../src/data/business";
import { PGlite } from "@electric-sql/pglite";
import { bookingConfig, dateRange, detailsSchema, generateSlots, indiaToday } from "../src/data/booking";

test("India date boundary, 15 dates, confirmed hours, lunch, Sunday, and elapsed periods", () => {
  assert.equal(indiaToday(new Date("2026-09-17T18:31:00Z")), "2026-09-18");
  const now = new Date("2026-09-17T00:00:00Z");
  assert.equal(dateRange(indiaToday(now)).length, 15);
  const slots = generateSlots("2026-09-18", now);
  assert.equal(slots.length, 11);
  assert.equal(slots[0].start, "09:00");
  assert.equal(slots.at(-1)?.end, "21:00");
  assert.ok(!slots.some(s => s.start === "13:00"));
  assert.equal(generateSlots("2026-09-20", now).length, 0);
  assert.equal(generateSlots("2026-10-02", now).length, 0);
  assert.equal(generateSlots("2026-09-16", now).length, 0);
  assert.ok(generateSlots("2026-09-17", new Date("2026-09-17T06:00:00Z")).every(s => s.start >= "12:00"));
});
test("Only approved gender-specific services and valid India mobiles are accepted", () => {
  const details = { name: "Test Client", date: "2026-09-18", start: "09:00", gender: "men", mobile: "91 9999999999", service: "Haircut" };
  assert.equal(detailsSchema.parse(details).mobile, "+919999999999");
  assert.ok(!detailsSchema.safeParse({ ...details, mobile: "123" }).success);
  assert.ok(!detailsSchema.safeParse({ ...details, date: "2026-02-30" }).success);
  assert.ok(!detailsSchema.safeParse({ ...details, service: "Invented service" }).success);
  assert.ok(!detailsSchema.safeParse({ ...details, gender: "women" }).success);
  assert.ok(detailsSchema.safeParse({ ...details, gender: "women", service: bookingConfig.services.women[0] }).success);
  assert.ok(!detailsSchema.safeParse({ ...details, end: "12:00" }).success);
});
test("PostgreSQL migration: private tables, OTP ownership/expiry/attempts, atomic insertion, capacity, exceptions, outbox", async () => {
  const db = new PGlite();
  try {
    await db.exec("create role anon; create role authenticated; create role service_role bypassrls;");
    await db.exec(readFileSync(new URL("../supabase/migrations/202609170001_booking.sql", import.meta.url), "utf8"));
    await db.exec(readFileSync(new URL("../supabase/migrations/202609170002_notification_recipients.sql", import.meta.url), "utf8"));
    const tomorrow = dateRange(indiaToday())[1];
    const payload = { name: "Database Test", gender: "men", mobile: "+919999999999", service: "Haircut", date: tomorrow, start: "09:00", end: "10:00" };
    const challenge = async (overrides = {}) => {
      const id = randomUUID();
      await db.query("insert into booking_challenges(id,proof_hash,provider_id,payload) values($1,'owner','test-provider',$2)", [id, JSON.stringify({ ...payload, ...overrides })]);
      return id;
    };
    const claim = async (id: string, hash = "owner") => (await db.query<{ result: Record<string, unknown> }>("select claim_booking_verification($1,$2) result", [id, hash])).rows[0].result;
    const confirm = async (id: string, token: unknown) => (await db.query<{ result: { error?: string; booking?: { id: string; booking_reference: string } } }>("select confirm_verified_booking($1,$2) result", [id, token])).rows[0].result;
    const first = await challenge();
    assert.equal((await db.query("select * from bookings")).rows.length, 0, "challenge must not create a booking");
    assert.equal((await claim(first, "wrong-owner")).error, "OTP_EXPIRED");
    const claimed = await claim(first);
    assert.equal((await claim(first)).error, "VERIFY_BUSY");
    const created = await confirm(first, claimed.token);
    assert.match(created.booking!.booking_reference, /^JIAA-\d+$/);
    assert.equal((await confirm(first, claimed.token)).booking?.id, created.booking?.id, "retry is idempotent");
    assert.equal((await db.query("select * from booking_notifications")).rows.length, 2);
    const token = (await db.query<{ token: string }>("select claim_booking_notification($1) token", [created.booking!.id])).rows[0].token;
    assert.ok(token);
    assert.equal((await db.query<{ token: null }>("select claim_booking_notification($1) token", [created.booking!.id])).rows[0].token, null);
    const customerToken = (await db.query<{ token: string }>("select claim_booking_notification($1,'customer') token", [created.booking!.id])).rows[0].token;
    assert.ok(customerToken, "David's active lease does not block the customer");
    await db.query("update booking_notifications set delivered_at=now(),lease_until=null,lease_token=null where booking_id=$1 and recipient='customer'", [created.booking!.id]);
    await db.query("update booking_notifications set last_error='DELIVERY_FAILED',lease_until=null,lease_token=null where booking_id=$1 and recipient='david'", [created.booking!.id]);
    assert.equal((await db.query<{ token: null }>("select claim_booking_notification($1,'customer') token", [created.booking!.id])).rows[0].token, null, "Delivered customer message must not resend");
    assert.ok((await db.query<{ token: string }>("select claim_booking_notification($1,'david') token", [created.booking!.id])).rows[0].token, "Failed David message can retry independently");
    assert.equal((await db.query<{ status: string }>("select status from bookings where id=$1", [created.booking!.id])).rows[0].status, "CONFIRMED", "Delivery failure does not change booking status");
    for (let n = 0; n < 2; n++) { const id = await challenge(); assert.ok((await confirm(id, (await claim(id)).token)).booking); }
    const full = await challenge();
    assert.equal((await confirm(full, (await claim(full)).token)).error, "SLOT_UNAVAILABLE");
    assert.equal((await db.query("select * from bookings")).rows.length, 3);
    await db.query("update bookings set status='CANCELLED' where id=$1", [created.booking!.id]);
    const replacement = await challenge(); assert.ok((await confirm(replacement, (await claim(replacement)).token)).booking);
    const expired = await challenge({ start: "10:00", end: "11:00" });
    await db.query("update booking_challenges set expires_at=now()-interval '1 minute' where id=$1", [expired]);
    assert.equal((await claim(expired)).error, "OTP_EXPIRED");
    const attempts = await challenge();
    for (let n = 0; n < 5; n++) { const c = await claim(attempts); await db.query("select release_booking_verification($1,$2)", [attempts, c.token]); }
    assert.equal((await claim(attempts)).error, "OTP_ATTEMPTS");
    await db.query("insert into availability_exceptions(date,reason) values($1,'Closed for test')", [tomorrow]);
    const closed = await challenge({ start: "11:00", end: "12:00" });
    assert.equal((await confirm(closed, (await claim(closed)).token)).error, "DATE_UNAVAILABLE");
    const rate = [{ key: "test", seconds: 60, limit: 1 }];
    assert.equal((await db.query<{ ok: boolean }>("select consume_booking_limits($1) ok", [JSON.stringify(rate)])).rows[0].ok, true);
    assert.equal((await db.query<{ ok: boolean }>("select consume_booking_limits($1) ok", [JSON.stringify(rate)])).rows[0].ok, false);
    for (const role of ["anon", "authenticated"]) {
      await db.exec("set role " + role);
      await assert.rejects(db.query("select * from bookings"), /permission denied/);
      await assert.rejects(db.query("select confirm_verified_booking($1,$2)", [first, claimed.token]), /permission denied/);
      await db.exec("reset role");
    }
    const flags = await db.query<{ relrowsecurity: boolean }>("select relrowsecurity from pg_class where relname in ('bookings','booking_challenges','booking_notifications','booking_rate_limits','availability_exceptions','public_announcements')");
    assert.equal(flags.rows.length, 6); assert.ok(flags.rows.every(row => row.relrowsecurity));
  } finally { await db.close(); }
});

test("Origin validation accepts the actual browser host, rejects foreign origins and ignores forwarded-host spoofing", () => {
  const make = (origin: string, host = "127.0.0.1:3000", forwarded = "") => new Request("http://localhost:3000/api/booking/request-code", { headers: { origin, host, "x-forwarded-host": forwarded } });
  assert.ok(isSameOrigin(make("http://127.0.0.1:3000")));
  assert.ok(isSameOrigin(make("http://localhost:3000", "localhost:3000")));
  assert.ok(!isSameOrigin(make("https://evil.example")));
  assert.ok(!isSameOrigin(make("null")));
  assert.ok(!isSameOrigin(make("http://127.0.0.1:3000/path")));
  assert.ok(!isSameOrigin(make("https://evil.example", "127.0.0.1:3000", "evil.example")));
  assert.ok(isSameOrigin(make("https://studio.example"), "https://studio.example"));
  assert.ok(!isSameOrigin(make("http://127.0.0.1:3000"), "https://studio.example"));
});
test("Separate David/customer WhatsApp messages use the requested content and their own recipients", () => {
  const booking = { booking_reference: "JIAA-TEST", customer_name: "Rahul Sharma", appointment_date: "2026-09-19", slot_start: "10:00:00", slot_end: "11:00:00", mobile_number: "+919999999999", gender: "men", service: "Hair + Beard", status: "CONFIRMED" } as Booking;
  const david = bookingMessage(booking, "david"), customer = bookingMessage(booking, "customer");
  assert.equal(david.to, siteConfig.contact.whatsapp.replace(/\D/g, ""));
  assert.equal(customer.to, "919999999999");
  assert.ok(david.message.startsWith("NEW APPOINTMENT — JIAA STUDIO"));
  for (const line of ["Booking ID: JIAA-TEST", "Customer: Rahul Sharma", "Gender: Male", "Service: Hair + Beard", "19 September 2026", "10:00 AM", "11:00 AM", "Mobile: +919999999999", "Status: CONFIRMED"]) assert.ok(david.message.includes(line));
  assert.ok(customer.message.startsWith("JIAA STUDIO — APPOINTMENT CONFIRMED"));
  assert.ok(customer.message.includes("Hi Rahul, your appointment with David has been confirmed."));
  assert.ok(customer.message.includes("Booking ID: JIAA-TEST"));
  assert.ok(customer.message.includes("JIAA Studio Unisex Salon, Anand"));
});