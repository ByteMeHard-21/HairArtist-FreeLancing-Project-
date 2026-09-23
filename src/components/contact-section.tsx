import { ContactActions } from "./contact-actions";
import { business } from "@/data/business";

export function ContactSection() {
  return <section id="contact" className="contact-section" aria-labelledby="contact-title"><div className="container"><div className="contact-panel"><p className="eyebrow">Next appointment</p><h2 id="contact-title">Ready for your next look?</h2><p>Let&apos;s create something that feels like you.</p><ContactActions gold />{(!business.phone || !business.whatsappUrl) && <p className="contact-pending">Contact details to be confirmed.</p>}</div></div></section>;
}
