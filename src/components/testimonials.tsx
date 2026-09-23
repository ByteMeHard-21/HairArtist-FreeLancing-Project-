"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ArrowLeft, ArrowRight, Pause, Play } from "lucide-react";
import { testimonials } from "@/data/testimonials";

const count = testimonials.length;
const slides = [testimonials[count - 1], ...testimonials, testimonials[0]];
function subscribeMotion(callback: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}
function subscribeVisibility(callback: () => void) {
  document.addEventListener("visibilitychange", callback);
  return () => document.removeEventListener("visibilitychange", callback);
}

export function Testimonials() {
  const [position, setPosition] = useState(1);
  const [moving, setMoving] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [paused, setPaused] = useState(false);
  const busy = useRef(false);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const reducedMotion = useSyncExternalStore(subscribeMotion, () => window.matchMedia("(prefers-reduced-motion: reduce)").matches, () => true);
  const hidden = useSyncExternalStore(subscribeVisibility, () => document.hidden, () => false);
  const active = (position - 1 + count) % count;
  const stopped = paused || hovered || focused || reducedMotion || hidden;

  const finish = useCallback(() => {
    if (!busy.current) return;
    busy.current = false;
    setMoving(false);
    // Edge clones are visually identical: normalize without a transition after arriving.
    setPosition(current => current === 0 ? count : current === count + 1 ? 1 : current);
  }, []);

  const advance = useCallback((direction: number) => {
    if (busy.current) return;
    if (reducedMotion) {
      setPosition(current => (current - 1 + direction + count) % count + 1);
      return;
    }
    busy.current = true;
    setMoving(true);
    setPosition(current => current + direction);
  }, [reducedMotion]);

  useEffect(() => {
    if (stopped || moving) return;
    const timer = window.setTimeout(() => advance(1), 5500);
    return () => window.clearTimeout(timer);
  }, [position, moving, stopped, advance]);

  useEffect(() => {
    if (!moving) return;
    // Also settles an interrupted transition (e.g. a changed motion preference).
    const fallback = window.setTimeout(finish, 750);
    return () => window.clearTimeout(fallback);
  }, [moving, finish]);

  return <section className="testimonials section-space" aria-labelledby="testimonials-title"><div className="container">
    <p className="eyebrow" id="testimonials-title">What our clients are saying</p>
    <div className="testimonial-carousel" role="region" aria-roledescription="carousel" aria-label="Client reviews"
      onPointerEnter={event => { if (event.pointerType === "mouse") setHovered(true); }}
      onPointerLeave={event => { if (event.pointerType === "mouse") setHovered(false); }}
      onFocusCapture={event => { if (event.target.matches(":focus-visible")) setFocused(true); }}
      onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
      <div className="testimonial-window"
        onPointerDown={event => {
          if (event.pointerType === "mouse") return;
          touch.current = { x: event.clientX, y: event.clientY };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerCancel={() => { touch.current = null; }}
        onPointerUp={event => {
          const start = touch.current;
          touch.current = null;
          if (!start) return;
          const dx = event.clientX - start.x, dy = event.clientY - start.y;
          if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.3) advance(dx < 0 ? 1 : -1);
        }}>
        <div className="testimonial-track" data-moving={moving} style={{ transform: "translateX(" + (-position * 100) + "%)" }}
          onTransitionEnd={event => { if (event.target === event.currentTarget && event.propertyName === "transform") finish(); }}>
          {slides.map((item, index) => <figure key={index + "-" + item.id} className="testimonial-card"
            role="group" aria-roledescription="slide" aria-label={((index - 1 + count) % count + 1) + " of " + count} aria-hidden={index !== position}>
            <span className="quote-mark" aria-hidden="true">“</span>
            <blockquote>{item.quote}</blockquote>
            <figcaption><strong>{item.attribution}</strong><span>{item.service}</span></figcaption>
          </figure>)}
        </div>
      </div>
      <button type="button" className="testimonial-arrow testimonial-previous" aria-label="Previous testimonial" aria-disabled={moving} onClick={() => advance(-1)}><ArrowLeft size={20} aria-hidden="true" /></button>
      <button type="button" className="testimonial-arrow testimonial-next" aria-label="Next testimonial" aria-disabled={moving} onClick={() => advance(1)}><ArrowRight size={20} aria-hidden="true" /></button>
      <div className="testimonial-controls">
        <span className="testimonial-count" aria-live={stopped ? "polite" : "off"} aria-atomic="true"><span className="sr-only">Testimonial </span>{active + 1} / {count}</span>
        {!reducedMotion && <button type="button" className="testimonial-play" aria-label={paused ? "Resume automatic testimonials" : "Pause automatic testimonials"} onClick={() => setPaused(value => !value)}>{paused ? <Play size={14} aria-hidden="true" /> : <Pause size={14} aria-hidden="true" />}</button>}
      </div>
    </div>
  </div></section>;
}