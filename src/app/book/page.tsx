import type { Metadata } from "next";
import { BookingFlow } from "@/components/booking-flow";
import { Footer } from "@/components/footer";
import { indiaToday } from "@/data/booking";
import "../booking.css";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Book a Visit", description: "Reserve an hourly appointment with David Siddharth at JIAA Studio Unisex Salon, Anand." };
export default function BookPage() { return <><BookingFlow initialDate={indiaToday()} /><Footer /></>; }
