"use client";

import { GroomPackageCard } from "./groom-package-card";
import { useState } from "react";
import { audiences, services, serviceCategories, formatPrice, type Audience } from "@/data/services";


export function MenuCatalogue() {
  const [selected, setSelected] = useState<"all" | Audience>("all");
  const visibleAudiences = audiences.filter(audience => selected === "all" || selected === audience.id);
  const confirmed = services.filter(service => service.status === "confirmed");
  return <div className="menu-catalogue">
    <div className="filters menu-filters" role="group" aria-label="Filter service menu by audience"><button aria-pressed={selected === "all"} onClick={() => setSelected("all")}>All</button>{audiences.map(audience => <button key={audience.id} aria-pressed={selected === audience.id} onClick={() => setSelected(audience.id)}>{audience.label}</button>)}</div>
    <div className="menu-results" id="menu-results"><span className="sr-only" role="status">Showing {selected === "all" ? "all audiences" : selected}.</span>
      {visibleAudiences.map(audience => {
        const audienceServices = confirmed.filter(service => service.audiences.includes(audience.id));
        return <section className={"menu-audience" + (audience.id === "groom" ? " menu-audience-groom" : "")} key={audience.id} aria-labelledby={`menu-${audience.id}`}><div className="menu-audience-heading"><p className="eyebrow">Service menu</p><h2 id={`menu-${audience.id}`}>{audience.title}</h2></div>
          {audience.id === "groom" ? <div className="menu-groom-package"><GroomPackageCard /></div> : audienceServices.length > 0 ? <div className="menu-categories">{serviceCategories.map(category => {
            const categoryServices = audienceServices.filter(service => service.category === category);
            return categoryServices.length > 0 && <div className="menu-category" key={category}><h3>{category}</h3><dl>{categoryServices.map(service => <div className="service-row" key={service.id}><dt>{service.name}{service.audiences.length === audiences.length && <span>Available for all</span>}</dt><dd>{service.price === null ? <span className="unconfirmed-price">Price to be confirmed</span> : formatPrice(service.price)}</dd></div>)}</dl></div>;
          })}</div> : <div className="menu-pending"><p>Service list & prices<br /><em>to be confirmed.</em></p><span>Details for {audience.label.toLowerCase()} will be added once confirmed by David.</span></div>}
        </section>;
      })}
    </div>
  </div>;
}
