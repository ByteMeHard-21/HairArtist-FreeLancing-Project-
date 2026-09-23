export type Audience = "men" | "women" | "children" | "groom";
export type ServiceCategory = "Haircut" | "Beard" | "Hair + Beard" | "Hair Styling" | "Hair Colour" | "Hair" | "Colour" | "Treatments" | "Grooming" | "Occasion styling" | "Hair Treatments" | "Occasion & Grooming";
export type Service = {
  id: string;
  name: string;
  category: ServiceCategory;
  audiences: Audience[];
  price: number | null;
  // Approval of service content only; numeric prices may still be temporary.
  status: "draft" | "confirmed";
};

export const menuPricingNote = "Men’s prices shown are temporary and unconfirmed. Please confirm final pricing with David.";
const priceFormatter = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
export function formatPrice(price: number) { return priceFormatter.format(price); }

// Single source for detailed MENU offerings and prices. Edit each price here.
// These men’s prices are temporary prototype values, not confirmed production prices.
// Booking categories remain separately controlled in booking.ts.
export const services: Service[] = [
  { id: "classic-cut", name: "Classic Haircut", category: "Haircut", audiences: ["men"], price: 100, status: "confirmed" },
  { id: "fade", name: "Fade Haircut", category: "Haircut", audiences: ["men"], price: 150, status: "confirmed" },
  { id: "modern-cut", name: "Modern / Trendy Haircut", category: "Haircut", audiences: ["men"], price: 150, status: "confirmed" },
  { id: "precision-cut", name: "Precision Haircut", category: "Haircut", audiences: ["men"], price: 200, status: "confirmed" },
  { id: "cut-wash", name: "Haircut + Wash", category: "Haircut", audiences: ["men"], price: 200, status: "confirmed" },

  { id: "beard-trim", name: "Beard Trim & Shape", category: "Beard", audiences: ["men"], price: 100, status: "confirmed" },
  { id: "beard-fade", name: "Beard Fade", category: "Beard", audiences: ["men"], price: 150, status: "confirmed" },
  { id: "beard", name: "Italian Beard", category: "Beard", audiences: ["men"], price: 150, status: "confirmed" },
  { id: "beard-styling", name: "Beard Styling", category: "Beard", audiences: ["men"], price: 200, status: "confirmed" },
  { id: "beard-grooming", name: "Beard Grooming", category: "Beard", audiences: ["men"], price: 150, status: "confirmed" },

  { id: "cut-beard-trim", name: "Haircut + Beard Trim", category: "Hair + Beard", audiences: ["men"], price: 150, status: "confirmed" },
  { id: "cut-beard-fade", name: "Haircut + Beard Fade", category: "Hair + Beard", audiences: ["men"], price: 200, status: "confirmed" },
  { id: "cut-italian-beard", name: "Haircut + Italian Beard", category: "Hair + Beard", audiences: ["men"], price: 200, status: "confirmed" },
  { id: "signature-hair-beard", name: "Signature Hair + Beard", category: "Hair + Beard", audiences: ["men"], price: 200, status: "confirmed" },

  { id: "classic-styling", name: "Classic Hair Styling", category: "Hair Styling", audiences: ["men"], price: 100, status: "confirmed" },
  { id: "modern-styling", name: "Modern Hair Styling", category: "Hair Styling", audiences: ["men"], price: 150, status: "confirmed" },
  { id: "blow-dry", name: "Blow-Dry & Finish", category: "Hair Styling", audiences: ["men"], price: 150, status: "confirmed" },
  { id: "occasion-styling", name: "Occasion Styling", category: "Hair Styling", audiences: ["men"], price: 200, status: "confirmed" },
  { id: "groom-styling", name: "Groom Styling", category: "Hair Styling", audiences: ["men"], price: 200, status: "confirmed" },

  { id: "global-colour", name: "Global Hair Colour", category: "Hair Colour", audiences: ["men"], price: 200, status: "confirmed" },
  { id: "root-colour", name: "Root Colour", category: "Hair Colour", audiences: ["men"], price: 150, status: "confirmed" },
  { id: "highlights", name: "Highlights", category: "Hair Colour", audiences: ["men"], price: 200, status: "confirmed" },
  { id: "creative-colour", name: "Creative / Fashion Colour", category: "Hair Colour", audiences: ["men"], price: 200, status: "confirmed" },
  { id: "colour-consultation", name: "Colour Consultation", category: "Hair Colour", audiences: ["men"], price: 100, status: "confirmed" },

  // Women's services and prices supplied by the client.
  {"id":"women-0-0","name":"Classic Haircut","category":"Haircut","audiences":["women"],"price":699,"status":"confirmed"},
  {"id":"women-0-1","name":"Layer Cut","category":"Haircut","audiences":["women"],"price":899,"status":"confirmed"},
  {"id":"women-0-2","name":"Bob / Short Haircut","category":"Haircut","audiences":["women"],"price":899,"status":"confirmed"},
  {"id":"women-0-3","name":"Precision Haircut","category":"Haircut","audiences":["women"],"price":1099,"status":"confirmed"},
  {"id":"women-0-4","name":"Haircut + Wash","category":"Haircut","audiences":["women"],"price":999,"status":"confirmed"},
  {"id":"women-1-0","name":"Hair Wash & Blow Dry","category":"Hair Styling","audiences":["women"],"price":699,"status":"confirmed"},
  {"id":"women-1-1","name":"Classic Hair Styling","category":"Hair Styling","audiences":["women"],"price":799,"status":"confirmed"},
  {"id":"women-1-2","name":"Blow-Dry & Finish","category":"Hair Styling","audiences":["women"],"price":899,"status":"confirmed"},
  {"id":"women-1-3","name":"Ironing / Straight Finish","category":"Hair Styling","audiences":["women"],"price":999,"status":"confirmed"},
  {"id":"women-1-4","name":"Occasion Hair Styling","category":"Hair Styling","audiences":["women"],"price":1499,"status":"confirmed"},
  {"id":"women-2-0","name":"Root Touch-Up","category":"Hair Colour","audiences":["women"],"price":999,"status":"confirmed"},
  {"id":"women-2-1","name":"Global Colour — Short","category":"Hair Colour","audiences":["women"],"price":1799,"status":"confirmed"},
  {"id":"women-2-2","name":"Global Colour — Medium","category":"Hair Colour","audiences":["women"],"price":2499,"status":"confirmed"},
  {"id":"women-2-3","name":"Highlights","category":"Hair Colour","audiences":["women"],"price":3499,"status":"confirmed"},
  {"id":"women-2-4","name":"Creative / Fashion Colour","category":"Hair Colour","audiences":["women"],"price":4999,"status":"confirmed"},
  {"id":"women-3-0","name":"Hair Spa","category":"Hair Treatments","audiences":["women"],"price":999,"status":"confirmed"},
  {"id":"women-3-1","name":"Protein Treatment","category":"Hair Treatments","audiences":["women"],"price":1499,"status":"confirmed"},
  {"id":"women-3-2","name":"Hair Repair Treatment","category":"Hair Treatments","audiences":["women"],"price":1799,"status":"confirmed"},
  {"id":"women-3-3","name":"Smoothening","category":"Hair Treatments","audiences":["women"],"price":4499,"status":"confirmed"},
  {"id":"women-3-4","name":"Keratin Treatment","category":"Hair Treatments","audiences":["women"],"price":5999,"status":"confirmed"},
  {"id":"women-4-0","name":"Basic Occasion Styling","category":"Occasion & Grooming","audiences":["women"],"price":1199,"status":"confirmed"},
  {"id":"women-4-1","name":"Premium Occasion Styling","category":"Occasion & Grooming","audiences":["women"],"price":1799,"status":"confirmed"},
  {"id":"women-4-2","name":"Hair Dressing","category":"Occasion & Grooming","audiences":["women"],"price":1499,"status":"confirmed"},
  {"id":"women-4-3","name":"Facial / Clean-Up","category":"Occasion & Grooming","audiences":["women"],"price":799,"status":"confirmed"},
  {"id":"women-4-4","name":"D-Tan Treatment","category":"Occasion & Grooming","audiences":["women"],"price":699,"status":"confirmed"},

  // Children's services await client confirmation.
  { id: "kids-cut", name: "Kids haircut", category: "Hair", audiences: ["children"], price: null, status: "draft" },
];

export const audiences: { id: Audience; label: string; title: string }[] = [
  { id: "men", label: "Men", title: "Men" },
  { id: "women", label: "Women", title: "Women" },
  { id: "groom", label: "Groom", title: "Groom" },
];

// Approved men’s category order first; existing draft categories remain supported.
export const serviceCategories: ServiceCategory[] = ["Haircut", "Beard", "Hair + Beard", "Hair Styling", "Hair Colour", "Hair Treatments", "Occasion & Grooming", "Hair", "Colour", "Treatments", "Grooming", "Occasion styling"];

// Homepage selections reference the same services and prices as /menu.
// Groom is a complete package, rendered alongside these individual service previews.
export const servicePreview: { audience: Audience; title: string; serviceIds: string[] }[] = [
  { audience: "men", title: "Men", serviceIds: ["classic-cut", "fade", "modern-cut"] },
  { audience: "women", title: "Women", serviceIds: ["women-0-0", "women-0-1", "women-0-2"] },
];

export const groomPackage = {
  title: "Groom",
  subtitle: "The Complete Look",
  description: "A refined grooming experience crafted for the big day.",
  includes: ["Precision Haircut", "Beard Shape & Styling", "Hair Styling", "Hair Wash & Finish"],
  name: "Complete Groom Look",
  price: 2499,
};
