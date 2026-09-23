"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useRef, type ReactNode, type RefObject } from "react";
import { ArrowUpRight, MessageSquare, Phone, X } from "lucide-react";
import { contactLinks, siteConfig } from "@/data/business";
import { getBookingWhatsAppHref } from "@/lib/contact-booking";
import "./contact-booking.css";

const BookingDialogContext = createContext<((trigger: HTMLElement) => void) | null>(null);

export function ContactBookingProvider({ children }: { children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const restore = useRef<(() => void) | null>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const outsidePress = useRef(false);
  const whatsappHref = getBookingWhatsAppHref();

  const restorePage = useCallback(() => {
    restore.current?.();
    restore.current = null;
    trigger.current?.focus({ preventScroll: true });
    trigger.current = null;
  }, []);

  useEffect(() => () => { restore.current?.(); }, []);

  const open = useCallback((source: HTMLElement) => {
    if (!dialog.current || dialog.current.open) return;
    trigger.current = source;
    const body = document.body, root = document.documentElement;
    const x = window.scrollX, y = window.scrollY;
    const bodyStyle = { position: body.style.position, top: body.style.top, left: body.style.left, width: body.style.width, paddingRight: body.style.paddingRight };
    const overflow = root.style.overflow;
    const gap = window.innerWidth - root.clientWidth;
    const padding = Number.parseFloat(getComputedStyle(body).paddingRight) || 0;
    body.style.position = "fixed";
    body.style.top = -y + "px";
    body.style.left = -x + "px";
    body.style.width = "100%";
    body.style.paddingRight = padding + gap + "px";
    root.style.overflow = "hidden";
    restore.current = () => {
      Object.assign(body.style, bodyStyle);
      root.style.overflow = overflow;
      window.scrollTo({ left: x, top: y, behavior: "instant" });
    };
    dialog.current.showModal();
  }, []);

  function close() { dialog.current?.close(); restorePage(); }
  function outside(event: { clientX: number; clientY: number }) {
    const rect = dialog.current!.getBoundingClientRect();
    return event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
  }

  return <BookingDialogContext.Provider value={open}>
    {children}
    <dialog ref={dialog} id="contact-booking-dialog" className="contact-booking-dialog" aria-labelledby="contact-booking-title" aria-describedby="contact-booking-description"
      onCancel={event => { event.preventDefault(); close(); }}
      onClose={() => { if (!dialog.current?.open) restorePage(); }}
      onKeyDown={event => {
        if (event.key !== "Tab") return;
        const elements = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("button:not([disabled]), a[href]"));
        const first = elements[0], last = elements[elements.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }}
      onPointerDown={event => { outsidePress.current = event.target === event.currentTarget && outside(event); }}
      onClick={event => { if (outsidePress.current && event.target === event.currentTarget && outside(event)) close(); outsidePress.current = false; }}>
      <div className="contact-booking-heading">
        <h2 id="contact-booking-title">Book a visit</h2>
        <button type="button" className="contact-booking-close" aria-label="Close booking options" onClick={close}><X size={20} aria-hidden="true" /></button>
      </div>
      <p id="contact-booking-description">How would you like to book your appointment?</p>
      <div className="contact-booking-options">
        <a href={contactLinks.call} className="contact-booking-option contact-booking-option--call" onClick={close}>
          <span><Phone size={16} aria-hidden="true" />Call David<ArrowUpRight size={16} aria-hidden="true" /></span>
          <small>Speak directly with David about availability.</small>
        </a>
        <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="contact-booking-option contact-booking-option--message" onClick={close}>
          <span><MessageSquare size={16} aria-hidden="true" />Message David<ArrowUpRight size={16} aria-hidden="true" /></span>
          <small>Send your preferred visit details.</small>
        </a>
      </div>
      <p className="contact-booking-note">David confirms availability personally.</p>
    </dialog>
  </BookingDialogContext.Provider>;
}

type TriggerProps = {
  children?: ReactNode;
  appearance?: "action" | "text";
  variant?: "gold" | "dark" | "outline";
  onOpen?: () => void;
  returnFocusRef?: RefObject<HTMLElement | null>;
};

export function BookVisitTrigger({ children = "Book a visit", appearance = "action", variant = "gold", onOpen, returnFocusRef }: TriggerProps) {
  const open = useContext(BookingDialogContext);
  const className = "book-visit-trigger " + (appearance === "action" ? "action action--" + variant : "book-visit-trigger--text");
  if (siteConfig.bookingMode === "online") return <Link href="/book" className={className} onClick={onOpen}>{children}</Link>;
  return <button type="button" className={className} aria-haspopup="dialog" aria-controls="contact-booking-dialog"
    onClick={event => { open?.(returnFocusRef?.current || event.currentTarget); onOpen?.(); }}>{children}</button>;
}