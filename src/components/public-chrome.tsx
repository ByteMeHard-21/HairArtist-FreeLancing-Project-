"use client";
import { usePathname } from "next/navigation";
import { Navbar } from "./navbar";

export function PublicChrome() {
  const pathname = usePathname();
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return null;
  return (
    <>
      <div className="concierge-strip">
        <div className="container concierge-inner">
          <span>✦ Hair artistry · Iconic confidence</span>
          <span>JIAA Studio Unisex Salon</span>
        </div>
      </div>
      <Navbar />
    </>
  );
}
