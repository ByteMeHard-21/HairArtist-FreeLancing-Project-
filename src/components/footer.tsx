import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { business } from "@/data/business";
import { navigation } from "@/data/navigation";
import { social } from "@/data/social";
import { BookVisitTrigger } from "./contact-booking";
import { ContactActions } from "./contact-actions";

export function Footer() {
  return <><footer className="site-footer"><div className="container"><div className="footer-top"><Link href="/#top" className="wordmark" aria-label="JIAA Studio home"><span>{business.shortName}</span><small>David / Hair Artist</small></Link><nav aria-label="Footer navigation">{navigation.map(item => item.booking ? <BookVisitTrigger key={item.label} appearance="text" /> : <Link href={item.href} key={item.label}>{item.label}</Link>)}{social.instagramUrl && <a href={social.instagramUrl} target="_blank" rel="noopener noreferrer">Instagram <ArrowUpRight size={12} aria-hidden="true" /></a>}</nav></div><div className="footer-bottom"><p>{business.city} <span>·</span> {business.salon}</p><p>© {new Date().getFullYear()} {business.artist}</p><Link className="studio-login-link" href="/admin/login">Studio login →</Link></div></div></footer><div className="mobile-contact-bar" aria-label="Contact David"><ContactActions gold /></div></>;
}
