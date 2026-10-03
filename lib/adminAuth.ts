import { timingSafeEqual } from "crypto";
export function isAdmin(req: Request): boolean {
  const token = process.env.ADMIN_TOKEN ?? "";
  const given = req.headers.get("x-admin-token") ?? "";
  return token.length >= 16 && given.length === token.length && timingSafeEqual(Buffer.from(given), Buffer.from(token));
}
