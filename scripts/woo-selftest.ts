// Checks the WooCommerce wiring from outside, in seconds, WITHOUT touching the shop:
// sends signed fake webhooks to EcoProof and shows what the customer's link and impact would be.
// Run: npx tsx scripts/woo-selftest.ts <baseUrl> <webhookSecret> [productId]
//   e.g. npx tsx scripts/woo-selftest.ts https://ecoproof.superbee.me <secret> 91551
// It stores one harmless, never-claimed order named SELFTEST-<time> in EcoProof.
import { createHmac } from "crypto";

const [base, secret, pid] = process.argv.slice(2);
if (!base || !secret) { console.error("usage: npx tsx scripts/woo-selftest.ts <baseUrl> <webhookSecret> [productId]"); process.exit(1); }
const url = `${base.replace(/\/$/, "")}/api/woo/webhook/superbee`;
const sign = (body: string, key = secret) => createHmac("sha256", key).update(body, "utf8").digest("base64");
const send = async (body: string, signature: string, type = "application/json") => { const r = await fetch(url, { method: "POST", headers: { "content-type": type, "x-wc-webhook-signature": signature }, body }); return { status: r.status, text: (await r.text()).slice(0, 200) }; };

async function main() {
  const ping = "webhook_id=1";
  console.log("1. ping (WooCommerce sends this when a webhook is created):", await send(ping, sign(ping), "application/x-www-form-urlencoded"));
  console.log("2. wrong secret is refused (expect 401):", (await send("{}", sign("{}", "wrong-secret"))).status);
  const id = `SELFTEST-${Date.now()}`;
  const body = JSON.stringify({ id, status: "completed", billing: { email: "never-stored@example.com" }, line_items: [{ name: "Hexawash – Reusable Laundry Washing Pouch", quantity: 1, product_id: Number(pid) || 44229 }] });
  const r = await send(body, sign(body));
  console.log(`3. completed order ${id}:`, r);
  const sig = createHmac("sha256", secret).update(`ecoproof:order-link:v1:superbee:${id}`).digest("base64url").slice(0, 22);
  console.log(`\nThe customer link for this order would be:\n  ${base.replace(/\/$/, "")}/o/superbee/${id}.${sig}\nOpen it: it should show "Your order: ..." with the impact. DON'T collect it with your own passport unless you want a test stamp in it.`);
}
main().catch((e) => { console.error(e); process.exit(1); });
