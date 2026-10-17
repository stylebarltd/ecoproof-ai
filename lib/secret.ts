import { createHmac } from "crypto";

export function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 32) return s;
  if (process.env.NODE_ENV !== "production") return "dev-only-session-secret-change-me-0123456789";
  throw new Error("SESSION_SECRET is not set");
}

export const hmac = (scope: string, data: string) => createHmac("sha256", secret()).update(`${scope}:${data}`).digest("base64url");
