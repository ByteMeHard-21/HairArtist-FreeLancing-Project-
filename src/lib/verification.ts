import "server-only";
import { AppError } from "./booking-server";

export interface VerificationService {
  send(phone: string, requestId: string): Promise<string>;
  verify(verificationId: string, phone: string, code: string): Promise<"approved" | "invalid" | "expired">;
}
// Replace this small HTTPS adapter when the SMS provider is selected. No OTP bypass exists.
async function gateway(action: string, payload: Record<string, string>) {
  const base = process.env.VERIFICATION_BASE_URL, token = process.env.VERIFICATION_TOKEN;
  if (!base || !token || !base.startsWith("https://")) throw new AppError("OTP_UNAVAILABLE", 503);
  try {
    const response = await fetch(base.replace(/\/$/, "") + "/" + action, {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
      body: JSON.stringify(payload), signal: AbortSignal.timeout(10000), cache: "no-store", redirect: "error",
    });
    if (!response.ok) throw new Error("Provider unavailable");
    return await response.json();
  } catch { throw new AppError("OTP_UNAVAILABLE", 503); }
}
export const verificationService: VerificationService = {
  async send(phone, requestId) {
    const data = await gateway("send", { phone, requestId });
    if (typeof data.verificationId !== "string" || !data.verificationId || data.verificationId.length > 500) throw new AppError("OTP_UNAVAILABLE", 503);
    return data.verificationId;
  },
  async verify(verificationId, phone, code) {
    const data = await gateway("verify", { verificationId, phone, code });
    if (!["approved", "invalid", "expired"].includes(data.status)) throw new AppError("OTP_UNAVAILABLE", 503);
    return data.status;
  },
};
