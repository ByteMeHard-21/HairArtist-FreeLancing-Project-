export type Testimonial = { id: string; quote: string; attribution: string; service: string };
// Client-supplied reviews and approved attribution.
export const testimonials: Testimonial[] = [
  { id: "rahul", quote: "I showed David a reference photo and he understood exactly what I wanted. The cut was clean, the fade was blended really well, and the finish looked great without feeling over-styled.", attribution: "Rahul P.", service: "Haircut · JIAA Studio" },
  { id: "priya", quote: "I wanted something soft and polished for an event, and David understood the look immediately. The waves came out really natural and lasted beautifully through the evening.", attribution: "Priya S.", service: "Hair Styling · JIAA Studio" },
  { id: "mansi", quote: "David took the time to understand the colour I wanted instead of rushing into the service. The highlights looked subtle and blended, which was exactly what I was hoping for.", attribution: "Mansi. S.", service: "Hair Colour · JIAA Studio" },
  { id: "amit", quote: "The whole experience felt very personal. David suggested small changes that suited me better, and the final haircut and beard shape looked sharp without feeling forced.", attribution: "Amit R.", service: "Hair + Beard · JIAA Studio" },
];