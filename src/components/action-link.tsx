import Link from "next/link";
import { Children, type ReactNode } from "react";

type Props = {
  href: string | null;
  children: ReactNode;
  variant?: "gold" | "dark" | "outline";
  className?: string;
  unavailable?: string;
};

export function ActionLink({ href, children, variant = "dark", className = "", unavailable = "Contact details to be confirmed" }: Props) {
  const classes = `action action--${variant} ${className}`;
  const label = Children.toArray(children).filter(child => typeof child === "string").join(" ").trim();
  if (!href) {
    return <span className={`${classes} action--unavailable`} role="link" aria-disabled="true" tabIndex={0} aria-label={`${label}. ${unavailable}`}>
      {children}<span className="action-tooltip" role="tooltip">{unavailable}</span>
    </span>;
  }
  const external = href.startsWith("https://") || href.startsWith("http://");
  if (external || href.startsWith("tel:") || href.startsWith("sms:")) {
    return <a className={classes} href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{children}</a>;
  }
  return <Link className={classes} href={href}>{children}</Link>;
}
