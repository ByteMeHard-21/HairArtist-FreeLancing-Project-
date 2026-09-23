import { ArrowUpRight, Clock3, MapPin, Phone, MessageSquare } from "lucide-react";
import { business, contactLinks } from "@/data/business";
import { BookVisitTrigger } from "./contact-booking";
import { ActionLink } from "./action-link";
import { SectionHeading } from "./section-heading";
import { LocationMap } from "./location-map";

export function Location() {
  return (
    <section id="location" className="location section-space" aria-labelledby="location-title">
      <div className="container">
        <SectionHeading
          eyebrow="Visit the studio"
          id="location-title"
          title="Your next look starts here."
          description="Find David at JIAA Studio Unisex Salon in Anand."
        />
        <div className="location-grid">
          <div className="location-details">
            <p className="eyebrow">Salon location</p>
            <h3>{business.salon}</h3>
            <div className="location-detail-row">
              <MapPin size={19} strokeWidth={1.5} aria-hidden="true" />
              <div>
                <p className="detail-label">Address</p>
                <address>
                  {business.address.map(line => (
                    <span key={line}>{line}</span>
                  ))}
                </address>
              </div>
            </div>
            <div className="location-detail-row">
              <Clock3 size={19} strokeWidth={1.5} aria-hidden="true" />
              <div>
                <p className="detail-label">Studio hours</p>
                {business.hours.length ? (
                  business.hours.map(row => (
                    <p key={row.days}>
                      {row.days} <span>{row.time}</span>
                    </p>
                  ))
                ) : (
                  <p className="muted">Hours to be confirmed.</p>
                )}
                <p className="hours-note">Please contact David to confirm availability.</p>
              </div>
            </div>
            <div className="location-actions">
              <ActionLink href={contactLinks.directions} unavailable="Directions link to be confirmed">
                Get Directions <ArrowUpRight size={14} aria-hidden="true" />
              </ActionLink>
              <ActionLink href={contactLinks.call} variant="outline"><Phone size={14} aria-hidden="true" />Call David</ActionLink>
              <ActionLink href={contactLinks.whatsapp} variant="outline"><MessageSquare size={14} aria-hidden="true" />WhatsApp David</ActionLink>
              <BookVisitTrigger variant="gold">Book a visit <ArrowUpRight size={14} aria-hidden="true" /></BookVisitTrigger>
            </div>
          </div>
          <div className="map-panel">
            <LocationMap />
            <div className="map-caption">
              <span>A.V. Road · New Rajpath Marg</span>
              <span>Anand, Gujarat</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
