"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

/** Phones only: a slim bar at the bottom with the join action, because below md the nav keeps "Add place" inside the hamburger and the
 *  page is long. It shows once the visitor has scrolled past the hero, and hides whenever a join button of the page itself (`data-join`, the
 *  honey buttons) is on screen, so there is never a second join action in view (the One Honey Rule). It is an ink button, never honey. */
export default function MobileJoinBar() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const visible = new Set<Element>();
    const update = () => setShow(window.scrollY > 500 && visible.size === 0);
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) { if (e.isIntersecting) visible.add(e.target); else visible.delete(e.target); }
      update();
    });
    document.querySelectorAll("[data-join]").forEach((el) => io.observe(el));
    window.addEventListener("scroll", update, { passive: true });
    update();
    return () => { io.disconnect(); window.removeEventListener("scroll", update); };
  }, []);
  return (
    <div
      inert={!show}
      className={`fixed inset-x-0 bottom-0 z-[1500] border-t border-cocoa/10 bg-paper/[0.97] px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] shadow-[0_-6px_18px_rgba(58,42,28,0.08)] md:hidden motion-safe:transition-transform motion-safe:duration-300 ${show ? "translate-y-0" : "translate-y-full"}`}
    >
      <div className="mx-auto flex max-w-md items-center justify-between gap-3">
        <p className="text-[14px] font-extrabold leading-snug text-cocoa">Free for the first 50 businesses</p>
        <Link href="/join" className="inline-flex h-11 shrink-0 items-center rounded-full bg-cocoa px-5 text-[15px] font-extrabold text-paper hover:bg-honey-ink">Add place</Link>
      </div>
    </div>
  );
}
