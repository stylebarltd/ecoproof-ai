"use client";
import { useEffect } from "react";

/** Scroll parallax for the island hero. Every element with data-drift inside .island-hero is translated vertically by
 *  drift × viewport height × progress, where progress runs 0 → 1 over the first viewport of scrolling. Positive drift lags the page (far
 *  things: sky, island), negative drift runs ahead of it (near things: the flower strip). Plain JS rather than CSS scroll-driven animations so
 *  it behaves the same in every browser. Off under prefers-reduced-motion. */
export default function IslandParallax() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const layers = Array.from(document.querySelectorAll<HTMLElement>(".island-hero [data-drift]")).map((el) => ({ el, drift: Number(el.dataset.drift) }));
    if (!layers.length) return;
    let raf = 0;
    const tick = () => {
      raf = 0;
      const t = Math.min(1, Math.max(0, window.scrollY / window.innerHeight));
      for (const { el, drift } of layers) el.style.translate = `0 ${(drift * t * 100).toFixed(2)}vh`;
    };
    const schedule = () => { if (!raf) raf = requestAnimationFrame(tick); };
    tick();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (raf) cancelAnimationFrame(raf);
      for (const { el } of layers) el.style.translate = "";
    };
  }, []);
  return null;
}
