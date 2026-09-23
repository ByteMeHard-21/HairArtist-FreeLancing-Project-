import { siteConfig } from "@/data/business";

export function getBookingWhatsAppHref() {
  const number = siteConfig.contact.whatsapp.replace(/\D/g, "");
  return "https://wa.me/" + number + "?text=" + encodeURIComponent(siteConfig.contact.bookingMessage);
}
