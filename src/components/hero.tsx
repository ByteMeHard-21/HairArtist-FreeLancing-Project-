import { ArrowDown, MapPin, MessageSquare } from "lucide-react";
import { business, contactLinks } from "@/data/business";
import { ActionLink } from "./action-link";

export function Hero() {
  return <>
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-inner">
        <p className="hero-location">{business.salon} <span>·</span> {business.city}</p>
        <h1 id="hero-title">David&apos;s Haircut,<br /><em>Iconic Confidence.</em></h1>
        <p className="hero-description">Precision hair, modern grooming, expressive colour and professional treatments — crafted to bring out your individual style.</p>
        <div className="hero-actions">
          <ActionLink href="/#work" variant="gold">View my work <ArrowDown size={15} aria-hidden="true" /></ActionLink>
          <ActionLink href={contactLinks.whatsapp} variant="outline"><MessageSquare size={15} aria-hidden="true" />WhatsApp David</ActionLink>
        </div>
        <p className="hero-identity">{business.artist}<span>{business.title}</span></p>
        <p className="hero-services">Hair · Beard · Colour · Treatments · Grooming</p>
        <p className="mobile-hero-location"><MapPin size={12} aria-hidden="true" />{business.city}</p>
      </div>
    </section>
    <div className="statement-strip"><div className="container statement-inner"><p>Unisex studio · Men, women & children</p><span className="statement-brand">JIAA STUDIO</span><p>Hair · Style · Individuality</p></div></div>
  </>;
}
