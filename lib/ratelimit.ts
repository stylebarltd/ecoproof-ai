// Best-effort per-IP limiter (in-memory, per serverless instance). Protects demo credits from casual abuse.
const hits = new Map<string, number[]>();

export function rateLimited(ip: string, max = 15, windowMs = 60 * 60 * 1000): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < windowMs);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > max;
}
