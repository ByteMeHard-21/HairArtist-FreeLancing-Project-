import type { ReactNode } from "react";

export function SectionHeading({ eyebrow, title, description, id, className = "" }: { eyebrow: string; title: ReactNode; description?: string; id?: string; className?: string }) {
  return <div className={`section-heading ${className}`}><p className="eyebrow">{eyebrow}</p><h2 id={id}>{title}</h2>{description && <p className="section-description">{description}</p>}<span className="heading-rule" aria-hidden="true" /></div>;
}
