"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Menu, Phone, X } from "lucide-react";
import { navigation } from "@/data/navigation";
import { business, contactLinks } from "@/data/business";
import { BookVisitTrigger } from "./contact-booking";
import { ActionLink } from "./action-link";

export function Navbar() {
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (!open) return;
    panel.current?.querySelector<HTMLAnchorElement>("a")?.focus();
    function onEscape(event: KeyboardEvent) {
      if (event.key === "Escape") { setOpen(false); toggle.current?.focus(); }
    }
    function onResize() { if (window.innerWidth >= 900) setOpen(false); }
    document.addEventListener("keydown", onEscape);
    window.addEventListener("resize", onResize);
    return () => { document.removeEventListener("keydown", onEscape); window.removeEventListener("resize", onResize); };
  }, [open]);

  function close() { setOpen(false); }

  return <header className="site-header">
    <div className="container nav-inner">
      <Link href="/#top" className="wordmark" aria-label="JIAA Studio home" onClick={close}><span>{business.shortName}</span><small>David / Hair Artist</small></Link>
      <nav className="desktop-nav" aria-label="Main navigation">
        {navigation.map(item => item.booking ? <BookVisitTrigger key={item.label} appearance="text" /> : <Link key={item.label} href={item.href} aria-current={pathname === item.href ? "page" : undefined}>{item.label}</Link>)}
      </nav>
      <div className="nav-actions"><ActionLink href={contactLinks.call} unavailable="Phone number to be confirmed"><Phone size={13} aria-hidden="true" />Call David</ActionLink>
        <button ref={toggle} className="nav-toggle" aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open} aria-controls="mobile-navigation" onClick={() => setOpen(!open)}>{open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}</button>
      </div>
    </div>
    <nav ref={panel} id="mobile-navigation" className="mobile-nav" aria-label="Mobile navigation" hidden={!open}>
      {navigation.map((item, index) => item.booking ? <BookVisitTrigger key={item.label} appearance="text" onOpen={close} returnFocusRef={toggle}><span>0{index + 1}</span>Book a visit</BookVisitTrigger> : <Link href={item.href} key={item.label} onClick={close}><span>0{index + 1}</span>{item.label}</Link>)}
    </nav>
  </header>;
}
