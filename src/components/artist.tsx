import Image from "next/image";
import { business } from "@/data/business";
import { artistContent, expertise } from "@/data/artist";
import { ContactActions } from "./contact-actions";
import { SectionHeading } from "./section-heading";

export function Artist() {
  return <section id="artist" className="artist section-space" aria-labelledby="artist-title"><div className="container artist-grid">
    <figure className="artist-photo"><Image src="/images/david.png" alt="David Siddharth, hairstylist and hair artist, holding scissors in the salon" fill sizes="(max-width: 599px) calc(100vw - 60px), (max-width: 1376px) 44vw, 580px" /><figcaption><span>{business.artist}</span><small>{business.title}</small></figcaption></figure>

    <div className="artist-copy">
      <p className="eyebrow">The artist</p>
      <h2 id="artist-title">Meet David.</h2>
      <p>{artistContent.introduction}</p>
      {artistContent.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
      <blockquote className="artist-quote">{artistContent.quote}</blockquote>
      <ContactActions />
    </div>
  </div>
  </section>;
}

export function Expertise() {
  return <section className="expertise" aria-labelledby="expertise-title"><div className="container"><SectionHeading eyebrow="Expertise" id="expertise-title" title="The David experience" /><div className="expertise-grid">{expertise.map(item => <article key={item.number}><span>{item.number}</span><h3>{item.title}</h3><p>{item.description}</p></article>)}</div></div></section>;
}
