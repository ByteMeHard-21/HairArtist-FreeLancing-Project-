import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { menuPricingNote } from "@/data/services";
import { business } from "@/data/business";
import { MenuCatalogue } from "@/components/menu-catalogue";
import { ContactActions } from "@/components/contact-actions";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  title: "Service Menu",
  description: "Explore men's and women's haircuts, styling, colour and treatments at JIAA Studio Unisex Salon in Anand. Men's prices are temporary and unconfirmed.",
  ...(business.websiteUrl ? { alternates: { canonical: "/menu" } } : {}),
  openGraph: { title: "Service Menu | David Siddharth", description: "Hair, beard, colour, treatments and grooming at JIAA Studio Unisex Salon, Anand." },
};

export default function MenuPage() {
  return <><main id="main" className="menu-page"><div className="container"><Link href="/" className="back-link"><ArrowLeft size={14} aria-hidden="true" />Back to the portfolio</Link><header className="menu-intro"><p className="eyebrow">JIAA Studio Unisex Salon</p><h1>The service <em>menu.</em></h1><p>Hair. Beard. Colour. Treatments. Grooming.</p><span className="heading-rule" aria-hidden="true" /><p className="menu-intro-note">Services for men and women. A complete look for the groom.<br />{menuPricingNote}</p></header><MenuCatalogue /><section className="menu-help" aria-labelledby="menu-help-title"><p className="eyebrow">A little guidance</p><h2 id="menu-help-title">Not sure what&apos;s right for you?</h2><p>Speak with David about your next look.</p><ContactActions />{(!business.phone || !business.whatsappUrl) && <p className="content-note">Contact details to be confirmed.</p>}</section></div></main><Footer /></>;
}
