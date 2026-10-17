import { createHash, randomBytes } from "crypto";
import { query } from "./db";
import { isAccountKey, looksLikeWallet, userIdOfKey } from "./ids";
import { isPlaceholderEmail } from "./solanaAuth";
import { getSession, type Session } from "./session";
import type { StampPlace } from "./stampPlaces";

// Who runs which place (table place_members). Owners can do everything; staff print QR codes and cards and see customer activity.

export type Role = "owner" | "staff";
export const INVITE_DAYS = 7;

/** The signed-in person's role at a place, or null. */
export async function roleAt(placeId: string, keys: string[]): Promise<Role | null> {
  const rows = await query<{ role: Role }>("SELECT role FROM place_members WHERE place_id=$1 AND member_key = ANY($2)", [placeId, keys]);
  return rows.some((r) => r.role === "owner") ? "owner" : rows.length ? "staff" : null;
}

export async function myPlaces(keys: string[]): Promise<(StampPlace & { role: Role })[]> {
  return query<StampPlace & { role: Role }>(
    `SELECT p.*, CASE WHEN bool_or(m.role = 'owner') THEN 'owner' ELSE 'staff' END AS role
       FROM stamp_places p JOIN place_members m ON m.place_id = p.id
      WHERE m.member_key = ANY($1) GROUP BY p.id ORDER BY p.created_at`,
    [keys],
  );
}

/** For a route: the session and role, or the error response to send. `need: "owner"` refuses staff. */
export async function memberOf(req: Request, placeId: string, need: Role = "staff"): Promise<{ s: Session; role: Role } | Response> {
  const s = await getSession(req);
  if (!s) return Response.json({ error: "Sign in first" }, { status: 401 });
  const role = await roleAt(placeId, s.keys);
  if (!role || (need === "owner" && role !== "owner")) return Response.json({ error: need === "owner" ? "Only the place's owner can do this." : "Not your place" }, { status: 404 });
  return { s, role };
}

export type Member = { key: string; role: Role; label: string; detail: string | null; you: boolean; addedAt: string };

/** How to show a member: their name and email for an account, the short wallet address otherwise. */
async function labelFor(key: string): Promise<{ label: string; detail: string | null }> {
  const short = (a: string) => `${a.slice(0, 4)}…${a.slice(-4)}`;
  const userId = isAccountKey(key)
    ? userIdOfKey(key)
    : (await query<{ user_id: string }>("SELECT user_id FROM auth_account WHERE provider_id='solana' AND account_id=$1", [key]))[0]?.user_id;
  const u = userId ? (await query<{ name: string; email: string }>("SELECT name, email FROM auth_user WHERE id=$1", [userId]))[0] : undefined;
  const email = u && !isPlaceholderEmail(u.email) ? u.email : null;
  if (looksLikeWallet(key)) return { label: email ? u!.name : short(key), detail: email ?? "Solana wallet" };
  return { label: u?.name || "Account", detail: email };
}

export async function team(placeId: string, you: string[]): Promise<{ members: Member[]; invites: { role: Role; expiresAt: string }[] }> {
  const rows = await query<{ member_key: string; role: Role; added_at: string }>("SELECT member_key, role, added_at FROM place_members WHERE place_id=$1 ORDER BY role, added_at", [placeId]);
  const members = await Promise.all(rows.map(async (r) => ({ key: r.member_key, role: r.role, ...(await labelFor(r.member_key)), you: you.includes(r.member_key), addedAt: new Date(r.added_at).toISOString() })));
  const invites = await query<{ role: Role; expires_at: string }>("SELECT role, expires_at FROM place_invites WHERE place_id=$1 AND accepted_at IS NULL AND expires_at > now() ORDER BY created_at", [placeId]);
  return { members, invites: invites.map((i) => ({ role: i.role, expiresAt: new Date(i.expires_at).toISOString() })) };
}

const hash = (token: string) => createHash("sha256").update(token).digest("hex");

/** A one-time link that adds someone as staff, or (role owner) hands the place over to them. */
export async function createInvite(placeId: string, role: Role, by: string): Promise<string> {
  const token = randomBytes(18).toString("base64url");
  await query(`INSERT INTO place_invites (token_hash, place_id, role, created_by, expires_at) VALUES ($1,$2,$3,$4, now() + interval '${INVITE_DAYS} days')`, [hash(token), placeId, role, by]);
  return token;
}

export type InviteInfo = { placeId: string; placeName: string; role: Role; status: "open" | "used" | "expired" };
export async function readInvite(token: string): Promise<InviteInfo | null> {
  const r = (await query<{ place_id: string; name: string; role: Role; accepted_at: string | null; expired: boolean }>(
    "SELECT i.place_id, p.name, i.role, i.accepted_at, i.expires_at < now() AS expired FROM place_invites i JOIN stamp_places p ON p.id = i.place_id WHERE i.token_hash=$1",
    [hash(token)],
  ))[0];
  return r ? { placeId: r.place_id, placeName: r.name, role: r.role, status: r.accepted_at ? "used" : r.expired ? "expired" : "open" } : null;
}

export class InviteError extends Error {}

/**
 * Accept an invite (once). Staff: joins the team. Owner: becomes the owner, and the previous owners stay on as staff (they can leave
 * from the team list). Someone already on the team keeps their role unless the invite raises it.
 */
export async function acceptInvite(token: string, s: Session): Promise<{ placeId: string; role: Role }> {
  const taken = (await query<{ place_id: string; role: Role }>(
    "UPDATE place_invites SET accepted_at=now(), accepted_by=$2 WHERE token_hash=$1 AND accepted_at IS NULL AND expires_at > now() RETURNING place_id, role",
    [hash(token), s.key],
  ))[0];
  if (!taken) throw new InviteError("This invite link has expired or was already used. Ask for a new one.");
  const current = await roleAt(taken.place_id, s.keys);
  if (taken.role === "owner") {
    await query("UPDATE place_members SET role='staff' WHERE place_id=$1 AND role='owner' AND NOT (member_key = ANY($2))", [taken.place_id, s.keys]);
    await query("DELETE FROM place_members WHERE place_id=$1 AND member_key = ANY($2)", [taken.place_id, s.keys]);
    await query("INSERT INTO place_members (place_id, member_key, role, added_by) VALUES ($1,$2,'owner','invite')", [taken.place_id, s.key]);
    await query("UPDATE stamp_places SET owner=$2 WHERE id=$1", [taken.place_id, s.key]);
    return { placeId: taken.place_id, role: "owner" };
  }
  if (!current) await query("INSERT INTO place_members (place_id, member_key, role, added_by) VALUES ($1,$2,'staff','invite') ON CONFLICT DO NOTHING", [taken.place_id, s.key]);
  return { placeId: taken.place_id, role: current ?? "staff" };
}

/** Remove a member. Owners can remove anyone except the last owner; anyone can remove themselves (leave), except the last owner. */
export async function removeMember(placeId: string, key: string, by: { role: Role; keys: string[] }) {
  const self = by.keys.includes(key);
  if (!self && by.role !== "owner") throw new InviteError("Only the owner can remove people.");
  const target = (await query<{ role: Role }>("SELECT role FROM place_members WHERE place_id=$1 AND member_key=$2", [placeId, key]))[0];
  if (!target) return;
  if (target.role === "owner") {
    const [{ n }] = await query<{ n: number }>("SELECT COUNT(*)::int n FROM place_members WHERE place_id=$1 AND role='owner'", [placeId]);
    if (n <= 1) throw new InviteError("A place needs an owner. Hand it over to someone first.");
  }
  await query("DELETE FROM place_members WHERE place_id=$1 AND member_key=$2", [placeId, key]);
}
