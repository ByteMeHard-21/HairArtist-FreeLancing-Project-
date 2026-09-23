import { randomBytes, randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { after } from "next/server";
import { z } from "zod";
import { detailsSchema, generateSlots } from "@/data/booking";
import { AppError, availability, database, failure, input, limit, proof, reply } from "@/lib/booking-server";
import { verificationService } from "@/lib/verification";
import { notifyBooking } from "@/lib/booking-notification";

export const runtime = "nodejs";
type Context = { params: Promise<{ action: string }> };
export async function GET(request: Request, context: Context) {
  try {
    if ((await context.params).action !== "availability") return reply({ error: "NOT_FOUND" }, 404);
    return reply(await availability(new URL(request.url).searchParams.get("date") || undefined));
  } catch (error) { return failure(error); }
}
export async function POST(request: Request, context: Context) {
  try {
    const { action } = await context.params;
    const body = await input(request);
    const db = database(), jar = await cookies();
    if (action === "request-code") {
      const parsed = detailsSchema.safeParse(body);
      if (!parsed.success) throw new AppError("INVALID_DETAILS");
      const details = parsed.data, available = await availability(details.date);
      if (!available.ready) throw new AppError("OTP_UNAVAILABLE", 503);
      const slot = available.selectedDate === details.date && available.slots.find(s => s.start === details.start && s.remaining > 0);
      if (!slot) throw new AppError("SLOT_UNAVAILABLE", 409);
      await limit(request, "send", details.mobile);
      const id = randomUUID();
      const secret = jar.get("booking-proof")?.value || randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 600000).toISOString();
      const { error } = await db.from("booking_challenges").insert({ id, proof_hash: proof(secret), payload: { ...details, end: slot.end }, expires_at: expiresAt });
      if (error) throw new AppError("SERVICE_UNAVAILABLE", 503);
      try {
        const providerId = await verificationService.send(details.mobile, id);
        const updated = await db.from("booking_challenges").update({ provider_id: providerId }).eq("id", id);
        if (updated.error) throw new AppError("OTP_UNAVAILABLE", 503);
      } catch (error) { await db.from("booking_challenges").delete().eq("id", id); throw error; }
      jar.set("booking-proof", secret, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/api/booking", maxAge: 86400 });
      return reply({ challengeId: id, expiresAt, resendAfter: 60 });
    }
    if (action === "verify") {
      const parsed = z.object({ challengeId: z.uuid(), code: z.string().regex(/^\d{6}$/) }).strict().safeParse(body);
      if (!parsed.success) throw new AppError("INVALID_CODE");
      const secret = jar.get("booking-proof")?.value;
      if (!secret) throw new AppError("OTP_EXPIRED", 410);
      await limit(request, "verify", parsed.data.challengeId);
      const id = parsed.data.challengeId;
      const claim = await db.rpc("claim_booking_verification", { p_id: id, p_hash: proof(secret) });
      if (claim.error) throw new AppError("SERVICE_UNAVAILABLE", 503);
      if (claim.data.error) throw new AppError(claim.data.error, 409);
      if (claim.data.booking) { after(() => notifyBooking(claim.data.booking.id)); return reply({ booking: claim.data.booking }); }
      const token = claim.data.token;
      try {
        const { end, ...raw } = claim.data.payload;
        const details = detailsSchema.safeParse(raw);
        if (!details.success || !generateSlots(raw.date).some(s => s.start === raw.start && s.end === end)) throw new AppError("SLOT_UNAVAILABLE", 409);
        const result = await verificationService.verify(claim.data.providerId, details.data.mobile, parsed.data.code);
        if (result !== "approved") throw new AppError(result === "expired" ? "OTP_EXPIRED" : "INVALID_CODE", result === "expired" ? 410 : 400);
        const confirmed = await db.rpc("confirm_verified_booking", { p_id: id, p_token: token });
        if (confirmed.error) throw new AppError("SERVICE_UNAVAILABLE", 503);
        if (confirmed.data.error) throw new AppError(confirmed.data.error, 409);
        after(() => notifyBooking(confirmed.data.booking.id));
        return reply({ booking: confirmed.data.booking });
      } finally { await db.rpc("release_booking_verification", { p_id: id, p_token: token }); }
    }
    return reply({ error: "NOT_FOUND" }, 404);
  } catch (error) { return failure(error); }
}
