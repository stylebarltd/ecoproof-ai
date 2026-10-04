// Builds a local install kit for the SuperBee shop admin from the live setup endpoint.
// Run: npx tsx scripts/superbee-kit.ts <baseUrl> <ADMIN_TOKEN>
// Output: ./superbee-install-kit/ (git-ignored: it contains the webhook secret). Share it only with whoever installs it.
import fs from "fs";

const [base, token] = process.argv.slice(2);
if (!base || !token) { console.error("usage: npx tsx scripts/superbee-kit.ts <baseUrl> <ADMIN_TOKEN>"); process.exit(1); }
async function main() {
  const r = await fetch(`${base.replace(/\/$/, "")}/api/stamp-places/superbee/woo`, { headers: { "x-admin-token": token } });
  if (!r.ok) throw new Error(`setup endpoint answered ${r.status}`);
  const d = (await r.json()) as { webhook: { deliveryUrl: string; secret: string; topic: string }; themeSnippet: string; themeSnippetOwnEmail: string };
  fs.mkdirSync("superbee-install-kit", { recursive: true });
  fs.writeFileSync("superbee-install-kit/snippet-A-email-block.php", d.themeSnippet);
  fs.writeFileSync("superbee-install-kit/snippet-B-own-email.php", d.themeSnippetOwnEmail);
  fs.writeFileSync("superbee-install-kit/README.txt", `ECOPROOF x SUPERBEE: install kit (contains a secret: do not post it anywhere public)

The WooCommerce shop is hive.superbee.me. Do this there, first on a staging copy if you have one.

1) WEBHOOK  (WooCommerce > Settings > Advanced > Webhooks > Add webhook)
   Name:          EcoProof
   Status:        Active
   Topic:         ${d.webhook.topic}
   Delivery URL:  ${d.webhook.deliveryUrl}
   Secret:        ${d.webhook.secret}
   API version:   WP REST API Integration v3
   Save. WooCommerce sends a test ping; the webhook should stay Active.

2) THE EMAIL QR  (paste ONE of these into the CHILD theme's functions.php)
   snippet-A-email-block.php : adds the QR + button inside WooCommerce's "order completed" customer email.
   snippet-B-own-email.php   : sends its own short email when an order is completed. Use B if A's QR doesn't show up
                               (an email plugin or FunnelKit sends the completed email instead).
   Never use both.

3) TEST: complete a test order, check the customer email has "Collect your eco stamp" and the QR, open the link, collect.
   Then a real small order on the live shop.

4) UNDO: set the webhook to Paused/delete it and remove the snippet. Nothing else to clean up.

Check the wiring from your computer at any time (stores one harmless, unclaimed test order):
   npx tsx scripts/woo-selftest.ts ${base} <the secret above> 44229
`);
  console.log("wrote ./superbee-install-kit/ (webhook secret inside, git-ignored)");
}
main().catch((e) => { console.error(e); process.exit(1); });
