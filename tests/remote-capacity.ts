// Explicit integration check for the linked project. Uses owned temporary rows and removes them in finally.
// Never sends SMS or WhatsApp: this tests the service-only database boundary directly.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { dateRange, generateSlots, indiaToday } from "../src/data/booking";
async function main() {
const db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const marker = "QA-" + randomUUID();
const ids: string[] = [];
const day = dateRange(indiaToday()).slice(1).find(date => generateSlots(date).length)!;
const slot = generateSlots(day).at(-1)!;
try {
  const before = await db.from("bookings").select("id").eq("appointment_date", day).eq("slot_start", slot.start);
  assert.ifError(before.error); assert.equal(before.data?.length, 0, "Test requires an unused slot; no existing bookings will be changed.");
  const claims: { id: string; token: string }[] = [];
  for (let i = 0; i < 8; i++) {
    const id = randomUUID(); ids.push(id);
    const inserted = await db.from("booking_challenges").insert({ id, proof_hash: marker, provider_id: "qa-no-provider-call", payload: { date: day, start: slot.start, end: slot.end, name: marker, gender: "men", mobile: "+919999999999", service: "Haircut" } });
    assert.ifError(inserted.error);
    const claim = await db.rpc("claim_booking_verification", { p_id: id, p_hash: marker });
    assert.ifError(claim.error); claims.push({ id, token: claim.data.token });
  }
  const beforeVerify = await db.from("bookings").select("id").eq("customer_name", marker);
  assert.equal(beforeVerify.data?.length, 0);
  const results = await Promise.all(claims.map(c => db.rpc("confirm_verified_booking", { p_id: c.id, p_token: c.token })));
  results.forEach(result => assert.ifError(result.error));
  const created = results.filter(result => result.data.booking);
  const rejected = results.filter(result => result.data.error === "SLOT_UNAVAILABLE");
  assert.equal(created.length, 3); assert.equal(rejected.length, 5);
  assert.equal(new Set(created.map(result => result.data.booking.booking_reference)).size, 3);
  const stored = await db.from("bookings").select("id").eq("customer_name", marker);
  assert.equal(stored.data?.length, 3);
  const anon = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
  assert.ok((await anon.from("bookings").select("*")).error);
  assert.ok((await anon.rpc("confirm_verified_booking", { p_id: claims[0].id, p_token: claims[0].token })).error);
  console.log("PASS: 8 simultaneous real PostgreSQL confirmations produced exactly 3 bookings and 5 SLOT_UNAVAILABLE results. Anonymous reads/RPC denied.");
} finally {
  const rows = await db.from("bookings").select("id").eq("customer_name", marker);
  assert.ifError(rows.error);
  const bookingIds = rows.data!.map(row => row.id);
  if (ids.length) assert.ifError((await db.from("booking_challenges").delete().in("id", ids).eq("proof_hash", marker)).error);
  if (bookingIds.length) {
    assert.ifError((await db.from("booking_notifications").delete().in("booking_id", bookingIds)).error);
    assert.ifError((await db.from("bookings").delete().in("id", bookingIds).eq("customer_name", marker)).error);
  }
  assert.equal((await db.from("bookings").select("id").eq("customer_name", marker)).data?.length, 0);
  console.log("PASS: all temporary test rows removed. Booking reference sequence gaps are expected.");
}

}
main().catch(error => { console.error(error); process.exitCode = 1; });
