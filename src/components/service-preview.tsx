import { ArrowRight, Scissors } from "lucide-react";
import { servicePreview, formatPrice, menuPricingNote, type Service } from "@/data/services";
import { defaultMenuServices, groomServiceId } from "@/lib/menu-services";
import { GroomPackageCard } from "./groom-package-card";
import { BookVisitTrigger } from "./contact-booking";
import { ActionLink } from "./action-link";
import { SectionHeading } from "./section-heading";

export function ServicePreview({ services = defaultMenuServices }: { services?: Service[] | null }) {
  const groom = services?.find(service => service.id === groomServiceId);
  return <section className="service-preview section-space" aria-labelledby="preview-title"><div className="container">
    <SectionHeading eyebrow="Services" id="preview-title" title="The service menu" description="A few cuts to start with. Explore the full menu for more." />
    {services === null ? <p className="content-note" role="status">Menu prices are temporarily unavailable. Please contact David for current services and prices.</p> : <div className="service-preview-grid">{servicePreview.map(item => {
      const selectedServices = item.serviceIds.flatMap(id => {
        const service = services.find(service => service.id === id && service.status === "confirmed" && service.audiences.includes(item.audience));
        return service ? [service] : [];
      });
      if (!selectedServices.length) return null;
      return <article className="service-preview-item" key={item.audience}>
        <div className="preview-item-title"><h3>{item.title}</h3><Scissors size={19} strokeWidth={1.3} aria-hidden="true" /></div>
        <dl>{selectedServices.map(service => <div className="service-row" key={service.id}><dt>{service.name}</dt><dd>{service.price === null ? "Price to be confirmed" : formatPrice(service.price)}</dd></div>)}</dl>
      </article>;
    })}{groom && <GroomPackageCard className="service-preview-item" compact price={groom.price!} />}</div>}
    <div className="centered-cta"><ActionLink href="/menu">View full menu <ArrowRight size={14} aria-hidden="true" /></ActionLink><BookVisitTrigger variant="gold">Book a visit <ArrowRight size={14} aria-hidden="true" /></BookVisitTrigger><p className="content-note">{menuPricingNote}</p></div>
  </div></section>;
}
