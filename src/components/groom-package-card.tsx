import { groomPackage, formatPrice } from "@/data/services";

export function GroomPackageCard({ className = "", compact = false }: { className?: string; compact?: boolean }) {
  return <article className={"groom-package " + className} aria-label="Groom — The Complete Look">
    <header className="groom-package-heading">
      <h3>{groomPackage.title}</h3>
      <p>{groomPackage.subtitle}</p>
    </header>
    <p className="groom-package-description">{groomPackage.description}</p>
    {!compact && <><p className="groom-package-label">Includes</p>
    <ul>{groomPackage.includes.map(item => <li key={item}>{item}</li>)}</ul></>}
    <dl className="groom-package-price"><dt className={compact ? "sr-only" : undefined}>{groomPackage.name}</dt><dd>{formatPrice(groomPackage.price)}</dd></dl>
  </article>;
}
