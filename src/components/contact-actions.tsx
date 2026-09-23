import { MessageSquare, Phone } from "lucide-react";
import { contactLinks } from "@/data/business";
import { ActionLink } from "./action-link";

export function ContactActions({ gold = false, className = "" }: { gold?: boolean; className?: string }) {
  return <div className={`contact-actions ${className}`}>
    <ActionLink href={contactLinks.call} variant={gold ? "gold" : "dark"} unavailable="Phone number to be confirmed"><Phone size={14} aria-hidden="true" />Call David</ActionLink>
    <ActionLink href={contactLinks.whatsapp} variant="outline"><MessageSquare size={14} aria-hidden="true" />WhatsApp David</ActionLink>
  </div>;
}
