import type { Metadata } from "next";
import "../booking.css";
import "./admin.css";
export const metadata:Metadata={ title:"Studio dashboard",robots:{index:false,follow:false} };
export default function AdminLayout({children}:{children:React.ReactNode}) { return children; }
