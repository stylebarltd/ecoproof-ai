export function getUserId() {
  try {
    let id = localStorage.getItem("ecoproof-user");
    if (!id) { id = crypto.randomUUID(); localStorage.setItem("ecoproof-user", id); }
    return id;
  } catch { return "demo-user"; }
}
