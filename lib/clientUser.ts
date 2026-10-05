const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
let fallback: string | null = null;

/** This device's anonymous passport id. It works like a password for the passport, so it never goes into a link. */
export function getUserId() {
  try {
    let id = localStorage.getItem("ecoproof-user");
    if (!id || !UUID.test(id)) { id = crypto.randomUUID(); localStorage.setItem("ecoproof-user", id); } // the server only accepts UUIDs
    return id;
  } catch { return (fallback ??= crypto.randomUUID()); } // no storage (private mode): a passport for this visit only, never a shared id
}
