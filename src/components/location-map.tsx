"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as MapLibreMap, Marker } from "maplibre-gl";
import { contactLinks, mapConfig } from "@/data/business";
import "maplibre-gl/dist/maplibre-gl.css";
import "./location-map.css";

export function LocationMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;
    let started = false;
    let loaded = false;
    let map: MapLibreMap | undefined;
    let marker: Marker | undefined;
    let resizeObserver: ResizeObserver | undefined;
    let loadingTimeout: ReturnType<typeof setTimeout> | undefined;

    async function initialize() {
      if (started || disposed) return;
      started = true;
      // Only download/initialize the renderer when this homepage panel approaches view.
      loadingTimeout = setTimeout(() => {
        if (!disposed) setStatus("error");
      }, 20000);

      try {
        const { Map, Marker, NavigationControl, Popup, setWorkerUrl } = await import("maplibre-gl");
        if (disposed) return;
        // Next.js must serve the worker alongside its shared ESM module.
        setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
        map = new Map({
          container: container!,
          style: mapConfig.styleUrl,
          center: mapConfig.center,
          zoom: mapConfig.zoom,
          cooperativeGestures: true,
          attributionControl: { compact: false },
        });
        map.getCanvas().setAttribute("aria-label", `${mapConfig.markerTitle} interactive map. Use arrow keys to pan and plus or minus to zoom.`);
        map.addControl(new NavigationControl({ showCompass: false }), "top-right");

        marker = new Marker({ color: getComputedStyle(container!).getPropertyValue("--gold-text").trim() })
          .setLngLat(mapConfig.center)
          .setPopup(new Popup({ closeButton: false, closeOnClick: false, focusAfterOpen: false, offset: 32 })
            .setText(mapConfig.markerTitle))
          .addTo(map);
        marker.getElement().setAttribute("aria-label", `${mapConfig.markerTitle} location details`);
        marker.togglePopup();

        map.on("load", () => {
          loaded = true;
          clearTimeout(loadingTimeout);
          if (!disposed) setStatus("ready");
        });
        map.on("error", () => {
          // A missing tile must not cover an otherwise usable map.
          if (!disposed && !loaded) setStatus("error");
        });
        resizeObserver = new ResizeObserver(() => map?.resize());
        resizeObserver.observe(container!);
      } catch {
        clearTimeout(loadingTimeout);
        if (!disposed) setStatus("error");
      }
    }

    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        observer.disconnect();
        void initialize();
      }
    }, { rootMargin: "300px" });
    observer.observe(container);

    return () => {
      disposed = true;
      clearTimeout(loadingTimeout);
      observer.disconnect();
      resizeObserver?.disconnect();
      marker?.remove();
      map?.remove();
    };
  }, []);

  return <div className="location-map" role="region" aria-label={`${mapConfig.markerTitle} map`}>
    <div className="location-map-canvas" ref={containerRef} />
    {status !== "ready" && <div className="location-map-status" role="status">
      {status === "loading" ? <p>Loading the studio map…</p> : <p>Map unavailable. <a href={contactLinks.directions} target="_blank" rel="noopener noreferrer">Open Google Maps for directions.</a></p>}
    </div>}
    <noscript><p className="location-map-status">Enable JavaScript to explore the map, or use Get directions.</p></noscript>
  </div>;
}
