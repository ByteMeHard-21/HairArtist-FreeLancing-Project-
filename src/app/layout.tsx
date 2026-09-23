import type { Metadata } from "next";
import "@fontsource/playfair-display/400.css";
import "@fontsource/playfair-display/400-italic.css";
import "@fontsource/manrope/400.css";
import "@fontsource/manrope/500.css";
import "@fontsource/manrope/600.css";
import "./globals.css";
import { ContactBookingProvider } from "@/components/contact-booking";
import { PublicChrome } from "@/components/public-chrome";

import { business } from "@/data/business";

const description = "Discover David Siddharth, Hairstylist & Hair Artist at JIAA Studio Unisex Salon in Anand, Gujarat. Explore his portfolio, services and salon location.";

export const metadata: Metadata = {
  title: { default: "David Siddharth | Hairstylist & Hair Artist in Anand", template: "%s | David Siddharth" },
  description,
  ...(business.websiteUrl ? { metadataBase: new URL(business.websiteUrl) } : {}),
  openGraph: { title: "David Siddharth — Hairstylist & Hair Artist", description, locale: "en_IN", type: "website", siteName: "David Siddharth · JIAA Studio" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body id="top"><a className="skip-link" href="#main">Skip to content</a>
    <ContactBookingProvider><PublicChrome />{children}</ContactBookingProvider>
  </body></html>;
}
