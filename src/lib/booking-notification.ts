import "server-only";
import { database } from "./booking-server";
import { bookingMessage, type NotificationRecipient } from "@/data/booking-messages";
import type { Booking } from "@/data/booking";

// Each recipient has its own lease, outcome and idempotency key.
// The selected provider/gateway must honor Idempotency-Key on retries.
export async function notifyBooking(id: string, recipient?: NotificationRecipient) {
  const recipients: NotificationRecipient[] = recipient ? [recipient] : ["david", "customer"];
  await Promise.allSettled(recipients.map(target => deliver(id, target)));
}
async function deliver(id: string, recipient: NotificationRecipient) {
  const db = database();
  const claim = await db.rpc("claim_booking_notification", { p_id: id, p_recipient: recipient });
  if (claim.error || !claim.data) return;
  let errorCode: string | null = null;
  try {
    const { data, error } = await db.from("bookings").select("*").eq("id", id).single();
    if (error) throw new Error("BOOKING_READ_FAILED");
    const booking = data as Booking;
    if (booking.status !== "CONFIRMED") throw new Error("BOOKING_NOT_CONFIRMED");
    const url = process.env.WHATSAPP_NOTIFICATION_URL, token = process.env.WHATSAPP_NOTIFICATION_TOKEN;
    if (!url || !token || !url.startsWith("https://")) throw new Error("NOT_CONFIGURED");
    const payload = bookingMessage(booking, recipient);
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + token, "Idempotency-Key": booking.booking_reference + ":" + recipient },
      body: JSON.stringify({ ...payload, recipient, bookingReference: booking.booking_reference }),
      signal: AbortSignal.timeout(10000), redirect: "error",
    });
    if (!response.ok) throw new Error("DELIVERY_FAILED");
  } catch (error) {
    const code = error instanceof Error ? error.message : "DELIVERY_FAILED";
    errorCode = ["NOT_CONFIGURED", "BOOKING_READ_FAILED", "BOOKING_NOT_CONFIRMED"].includes(code) ? code : "DELIVERY_FAILED";
  }
  const saved = await db.from("booking_notifications")
    .update({ delivered_at: errorCode ? null : new Date().toISOString(), last_error: errorCode, lease_until: null, lease_token: null })
    .eq("booking_id", id).eq("recipient", recipient).eq("lease_token", claim.data);
  if (saved.error) console.error("Unable to record WhatsApp notification outcome; retry lease will expire.");
}
