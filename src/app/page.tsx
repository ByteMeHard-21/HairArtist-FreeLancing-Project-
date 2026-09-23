import type { Metadata } from "next";
import { AvailabilityTicker } from "@/components/availability-ticker";
import { Hero } from "@/components/hero";
import { business } from "@/data/business";
import { Portfolio } from "@/components/portfolio";
import { ServicePreview } from "@/components/service-preview";
import { Artist, Expertise } from "@/components/artist";
import { Location } from "@/components/location";
import { Testimonials } from "@/components/testimonials";
import { ContactSection } from "@/components/contact-section";
import { Footer } from "@/components/footer";
import { database } from "@/lib/booking-server";
import { indiaToday } from "@/data/booking";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { ...(business.websiteUrl ? { alternates: { canonical: "/" } } : {}) };

async function getActiveAnnouncement(): Promise<string | undefined> {
  try {
    const today = indiaToday();
    const { data, error } = await database()
      .from("public_announcements")
      .select("message")
      .eq("active", true)
      .lte("start_date", today)
      .gte("end_date", today);
    if (!error && data && data.length > 0) {
      const text = data.map(d => d.message).join(" · ").trim();
      if (text) return text;
    }
  } catch {
    // Graceful fallback to default availability message
  }
  return undefined;
}

export default async function HomePage() {
  const initialNotice = await getActiveAnnouncement();
  return (
    <>
      <main id="main">
        <AvailabilityTicker initialNotice={initialNotice} />
        <Hero />
        <Portfolio />
        <ServicePreview />
        <Artist />
        <Expertise />
        <Location />
        <Testimonials />
        <ContactSection />
      </main>
      <Footer />
    </>
  );
}
