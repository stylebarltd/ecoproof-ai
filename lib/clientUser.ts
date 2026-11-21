const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
let fallback: string | null = null;

/** A random UUID (version 4). `crypto.randomUUID` only exists on secure pages (https, or localhost): a phone that opens the dev server by this machine's
 *  network address (http://192.168.1.41:3000) has no such function and the passport crashed there (Pola, 2026-11-21). `crypto.getRandomValues` works on
 *  any page and is just as random, so the id is built from it when the short way is missing. */
function uuid(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80; // version 4, variant 1
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/** This device's anonymous passport id. It works like a password for the passport, so it never goes into a link. */
export function getUserId() {
  try {
    let id = localStorage.getItem("ecoproof-user");
    if (!id || !UUID.test(id)) { id = uuid(); localStorage.setItem("ecoproof-user", id); } // the server only accepts UUIDs
    return id;
  } catch { return (fallback ??= uuid()); } // no storage (private mode): a passport for this visit only, never a shared id
}
