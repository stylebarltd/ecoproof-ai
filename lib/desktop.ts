"use client";
import { useEffect, useState } from "react";

/** Same breakpoint as Tailwind's `lg`. */
const QUERY = "(min-width: 64rem)";

/** True on desktop layouts. False on the server and the first render, so the phone layout is what hydrates. */
export function useDesktop() {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(QUERY);
    const on = () => setDesktop(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return desktop;
}

/** On desktop the wallet chip lives in the top navbar; it fires this so the page underneath can reload what depends on the account. */
const ACCOUNT_EVENT = "ecoproof:account";
export const announceAccountChange = () => window.dispatchEvent(new Event(ACCOUNT_EVENT));
export function useAccountChange(cb: (() => void) | undefined) {
  useEffect(() => {
    if (!cb) return;
    window.addEventListener(ACCOUNT_EVENT, cb);
    return () => window.removeEventListener(ACCOUNT_EVENT, cb);
  }, [cb]);
}
