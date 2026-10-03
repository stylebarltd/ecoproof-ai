import { randomUUID } from "crypto";
import { query } from "./db";
import { identityGroup } from "./users";
import { REPORT_WINDOW_DAYS, REVIEW_THRESHOLD, isReason, type PlaceStatus } from "./ecoRules";

export class ReportError extends Error { constructor(message: string, public status = 400) { super(message); } }

/**
 * A customer reports a place that doesn't keep the eco rules.
 * - One report per person per place per 30 days (a linked wallet and its device ids count as one person).
 * - A report from someone who has a stamp from that place is a "verified visitor" report. Only those can pause a place.
 * - When enough different verified visitors report, the place is paused (hidden, no new stamps) until we review it.
 */
export async function reportPlace(placeId: string, passportId: string, reason: string, details: string): Promise<{ underReview: boolean }> {
  if (!isReason(reason)) throw new ReportError("Pick a reason.");
  const place = (await query<{ id: string; status: PlaceStatus; owner: string | null }>("SELECT id, status, owner FROM stamp_places WHERE id=$1", [placeId]))[0];
  if (!place) throw new ReportError("Unknown place", 404);
  const group = await identityGroup(passportId);
  if (place.owner && group.includes(place.owner)) throw new ReportError("You can't report your own place.", 403);
  const person = group[0];

  const recent = await query("SELECT 1 FROM place_reports WHERE place_id=$1 AND reporter = ANY($2) AND created_at > now() - ($3 || ' days')::interval", [placeId, group, String(REPORT_WINDOW_DAYS)]);
  if (recent.length) throw new ReportError("You've already reported this place recently. Thank you, we're looking at it.", 409);

  const visited = await query("SELECT 1 FROM records WHERE place_id=$1 AND user_id = ANY($2) LIMIT 1", [placeId, group]);
  await query("INSERT INTO place_reports (id, place_id, reporter, reason, details, verified_visitor) VALUES ($1,$2,$3,$4,$5,$6)", [randomUUID(), placeId, person, reason, details.slice(0, 400) || null, visited.length > 0]);

  let underReview = place.status === "under_review";
  if (place.status === "active") {
    const [{ n }] = await query<{ n: number }>(
      "SELECT COUNT(DISTINCT reporter)::int n FROM place_reports WHERE place_id=$1 AND verified_visitor AND resolved_at IS NULL AND created_at > now() - ($2 || ' days')::interval",
      [placeId, String(REPORT_WINDOW_DAYS)],
    );
    if (n >= REVIEW_THRESHOLD) {
      await query("UPDATE stamp_places SET status='under_review', status_note='Paused after reports from customers. Under review.', status_at=now() WHERE id=$1 AND status='active'", [placeId]);
      underReview = true;
    }
  }
  return { underReview };
}

export type ModerationAction = "suspend" | "restore" | "review";

/** Our decision. `restore` clears the place and closes its open reports; `suspend` removes it (history and proofs stay). */
export async function moderate(placeId: string, action: ModerationAction, note: string): Promise<PlaceStatus> {
  const status: PlaceStatus = action === "suspend" ? "suspended" : action === "review" ? "under_review" : "active";
  const rows = await query("UPDATE stamp_places SET status=$2, status_note=$3, status_at=now() WHERE id=$1 RETURNING id", [placeId, status, note.slice(0, 300) || null]);
  if (!rows.length) throw new ReportError("Unknown place", 404);
  if (action !== "review") await query("UPDATE place_reports SET resolved_at=now(), resolution=$2 WHERE place_id=$1 AND resolved_at IS NULL", [placeId, action === "suspend" ? "suspended" : "dismissed"]);
  return status;
}

export type OpenReports = {
  placeId: string; name: string; kind: string; status: PlaceStatus; statusNote: string | null; owner: string | null;
  verified: number; total: number;
  reports: { id: string; reason: string; details: string | null; verifiedVisitor: boolean; createdAt: string }[];
};

export async function listReports(): Promise<OpenReports[]> {
  const places = await query<{ id: string; name: string; kind: string; status: PlaceStatus; status_note: string | null; owner: string | null }>(
    "SELECT id,name,kind,status,status_note,owner FROM stamp_places WHERE status <> 'active' OR id IN (SELECT place_id FROM place_reports WHERE resolved_at IS NULL) ORDER BY status_at DESC NULLS LAST, name",
  );
  const reports = await query<{ id: string; place_id: string; reason: string; details: string | null; verified_visitor: boolean; created_at: string }>(
    "SELECT id,place_id,reason,details,verified_visitor,created_at FROM place_reports WHERE resolved_at IS NULL ORDER BY created_at DESC",
  );
  return places.map((p) => {
    const rs = reports.filter((r) => r.place_id === p.id);
    return { placeId: p.id, name: p.name, kind: p.kind, status: p.status, statusNote: p.status_note, owner: p.owner, verified: rs.filter((r) => r.verified_visitor).length, total: rs.length,
      reports: rs.map((r) => ({ id: r.id, reason: r.reason, details: r.details, verifiedVisitor: r.verified_visitor, createdAt: new Date(r.created_at).toISOString() })) };
  });
}
