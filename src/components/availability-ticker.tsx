"use client";

import { useEffect, useState } from "react";
import { availability } from "@/data/availability";

export function AvailabilityTicker({ initialNotice }: { initialNotice?: string }) {
  const [tickerMessage, setTickerMessage] = useState<string>(initialNotice || availability.message);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/booking/availability", { signal: controller.signal, cache: "no-store" })
      .then(response => (response.ok ? response.json() : null))
      .then(data => {
        if (Array.isArray(data?.announcements) && data.announcements.length > 0) {
          const activeNotice = data.announcements.join(" · ").trim();
          if (activeNotice) {
            setTickerMessage(activeNotice);
            return;
          }
        }
        setTickerMessage(availability.message);
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  const message = tickerMessage.trim();
  const copy = (
    <>
      <span>{message}</span>
      <i aria-hidden="true">✦</i>
    </>
  );

  return (
    <div className="availability-ticker" aria-label={message}>
      <div className="ticker-track" aria-hidden="true">
        <div className="ticker-copy">{copy}{copy}{copy}{copy}</div>
        <div className="ticker-copy">{copy}{copy}{copy}{copy}</div>
      </div>
    </div>
  );
}
