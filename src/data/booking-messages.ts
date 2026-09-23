import { business, siteConfig } from "./business";
import { formatDate, slotLabel, type Booking } from "./booking";
export type NotificationRecipient = "david" | "customer";

// Customer text is deliberately limited to this customer's own reservation.
export function bookingMessage(booking: Booking, recipient: NotificationRecipient) {
  const time = slotLabel(booking.slot_start, booking.slot_end);
  if (recipient === "david") return {
    to: siteConfig.contact.whatsapp.replace(/\D/g, ""),
    message: [
      "NEW APPOINTMENT — JIAA STUDIO",
      "Booking ID: " + booking.booking_reference,
      "Customer: " + booking.customer_name,
      "Gender: " + (booking.gender === "men" ? "Male" : "Female"),
      "Service: " + booking.service,
      "Date: " + formatDate(booking.appointment_date),
      "Time: " + time,
      "Mobile: " + booking.mobile_number,
      "Status: " + booking.status,
    ].join("\n"),
  };
  const firstName = booking.customer_name.trim().split(/\s+/)[0];
  return {
    to: booking.mobile_number.replace(/\D/g, ""),
    message: [
      "JIAA STUDIO — APPOINTMENT CONFIRMED",
      "Hi " + firstName + ", your appointment with David has been confirmed.",
      "",
      formatDate(booking.appointment_date),
      time,
      booking.service,
      "Booking ID: " + booking.booking_reference,
      business.salon + ", Anand",
    ].join("\n"),
  };
}
