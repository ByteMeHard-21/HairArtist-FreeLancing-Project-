import { studioHours } from "./booking";

// Authoritative client values. Phone and WhatsApp currently share one number.
// Keep the supplied value here; only URI formatting removes spaces/adds "+".
const clientNumber = "91 8238108943";

export const siteConfig = {
  bookingMode: "contact" as "contact" | "online",
  contact: {
    phone: clientNumber,
    bookingMessage: "Hi David, I found your website and would like to book a visit. Please let me know your availability.",
    whatsapp: clientNumber,
    whatsappMessage: "Hi David, I found your website and would like to know about an appointment.",
  },
  social: { instagram: "https://www.instagram.com/davidsid_24/" },
  location: {
    coordinates: [72.9386134, 22.5483464] as [number, number],
    mapsUrl: "https://www.google.com/maps/place/Jiaa+Studio+Unisex+Salon+-+Bridal+makeup+artist+in+anand+-+Unisex+salon+in+anand+-+make+up+artist+in+anand/@22.5483513,72.9360385,17z/data=!3m1!4b1!4m6!3m5!1s0x395e4d177a3ddefb:0x90dc3ef0fc503db3!8m2!3d22.5483464!4d72.9386134!16s%2Fg%2F11lf6hx94r?entry=ttu&g_ep=EgoyMDI2MDkwOS4wIKXMDSoASAFQAw%3D%3D",
  },
};

const phoneDigits = siteConfig.contact.phone.replace(/\D/g, "");
const whatsappDigits = siteConfig.contact.whatsapp.replace(/\D/g, "");
const whatsappMessage = encodeURIComponent(siteConfig.contact.whatsappMessage);

export const business = {
  artist: "David Siddharth",
  title: "Hairstylist & Hair Artist",
  salon: "JIAA Studio Unisex Salon",
  shortName: "JIAA STUDIO",
  city: "Anand, Gujarat",
  address: ["FF/109, Radhasoami Sukun,", "New Rajpath Marg, A.V. Road,", "Anand, Gujarat"],
  phone: `+${phoneDigits}`,
  whatsappUrl: `https://wa.me/${whatsappDigits}?text=${whatsappMessage}`,
  directionsUrl: siteConfig.location.mapsUrl,
  websiteUrl: null as string | null,
  hours: studioHours(),
};

export const contactLinks = {
  call: `tel:${business.phone}`,
  whatsapp: business.whatsappUrl,
  directions: business.directionsUrl,
};

export const mapConfig = {
  styleUrl: "https://tiles.openfreemap.org/styles/liberty",
  center: siteConfig.location.coordinates,
  zoom: 16.5,
  markerTitle: business.salon,
};
