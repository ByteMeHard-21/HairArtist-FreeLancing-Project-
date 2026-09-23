"use client";

import Image from "next/image";
import { ArrowUpRight, Minus, Plus } from "lucide-react";
import { useRef, useState } from "react";
import { featuredPortfolio, publishedPortfolio, type PortfolioAudience, type PortfolioItem } from "@/data/portfolio";
import { social } from "@/data/social";
import { ActionLink } from "./action-link";
import { SectionHeading } from "./section-heading";

const imageSizes = "(max-width: 599px) calc(100vw - 52px), (max-width: 899px) 44vw, (max-width: 1376px) 29vw, 410px";
function PortfolioCard({ item, extra = false }: { item: PortfolioItem & { image: string }; extra?: boolean }) {
  const [revealed, setRevealed] = useState(false);
  const transformation = Boolean(item.beforeImage && item.afterImage);
  return <figure className={"portfolio-card " + (extra ? "portfolio-card--extra" : "")} data-project={item.audience + "-" + item.id}>
    {transformation ? <button type="button" className="portfolio-photo portfolio-photo--transformation"
      aria-label={"Reveal after image: " + item.title} aria-pressed={revealed}
      onPointerEnter={event => { if (event.pointerType === "mouse" && window.matchMedia("(hover: hover)").matches) setRevealed(true); }}
      onPointerLeave={event => { if (event.pointerType === "mouse") setRevealed(false); }}
      onClick={() => setRevealed(value => !value)} onBlur={() => setRevealed(false)}>
      <Image src={item.beforeImage!} alt={item.alt} aria-hidden={revealed} fill sizes={imageSizes} style={{ objectPosition: item.position }} />
      <span className="transformation-after" aria-hidden={!revealed}>
        <Image src={item.afterImage!} alt={item.afterAlt || "After the hair transformation"} fill sizes={imageSizes} loading="eager" style={{ objectPosition: item.position }} />
      </span>
      <span className="photo-category">{item.audience}</span>
      <span className="transformation-label" aria-hidden="true">{revealed ? "After" : "Before"}</span>
    </button> : <div className={"portfolio-photo " + (item.fit === "contain" ? "portfolio-photo--uncropped" : "")}>
      <Image src={item.image} alt={item.alt} fill sizes={imageSizes} style={{ objectPosition: item.position, objectFit: item.fit }} />
      <span className="photo-category">{item.audience}</span>
    </div>}
    <figcaption><span className="work-number">{item.id} /</span><h3>{item.title}</h3><span className="work-label">{item.audience}</span></figcaption>
  </figure>;
}

export function Portfolio() {
  const [filter, setFilter] = useState<"all" | PortfolioAudience>("all");
  const [expanded, setExpanded] = useState(false);
  const grid = useRef<HTMLDivElement>(null);
  const filtered = filter === "all" ? featuredPortfolio : publishedPortfolio.filter(item => item.audience === filter);

  function changeFilter(value: "all" | PortfolioAudience) { setFilter(value); setExpanded(false); }
  function toggleExpansion() {
    if (expanded) {
      // Return to the start of the gallery instead of leaving the user below collapsed content.
      grid.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
    }
    setExpanded(!expanded);
  }

  return <section id="work" className="portfolio section-space" aria-labelledby="work-title"><div className="container">
    <SectionHeading eyebrow="Portfolio showcase" id="work-title" title={<>A portfolio of<br />transformations</>} description="Cuts, colour and styling — real work, individual expression." />
    <div className="filters portfolio-filters" role="group" aria-label="Filter portfolio by audience">
      {(["all", "men", "women"] as const).map(category => <button key={category} aria-pressed={filter === category} aria-controls="portfolio-grid" onClick={() => changeFilter(category)}>{category}</button>)}
    </div>
    <div key={filter} ref={grid} id="portfolio-grid" className={"portfolio-grid " + (expanded ? "is-expanded" : "")}>
      {filtered.slice(0, 3).map(item => <PortfolioCard key={item.audience + "-" + item.id} item={item} />)}
      <div id="additional-work" className="additional-work">{filtered.slice(3).map(item => <PortfolioCard key={item.audience + "-" + item.id} item={item} extra />)}</div>
    </div>
    <span className="sr-only" role="status">{filtered.length} portfolio works in {filter === "all" ? "all categories" : filter}.</span>
    {filtered.length > 3 && <button className="portfolio-expand action action--outline" aria-expanded={expanded} aria-controls="additional-work" onClick={toggleExpansion}>{expanded ? "See less" : "See more work"}{expanded ? <Minus size={14} aria-hidden="true" /> : <Plus size={14} aria-hidden="true" />}</button>}
    <div className="portfolio-cta"><ActionLink href={social.instagramUrl} unavailable="Instagram link to be confirmed">View more work <ArrowUpRight size={14} aria-hidden="true" /></ActionLink><p className="content-note">{social.instagramUrl ? "Follow David’s work on Instagram." : "Instagram link to be confirmed."}</p></div>
  </div></section>;
}