# SuperBee order integration: Monday plan

Nothing here has been installed on the live shop. Everything below was prepared from public information and the local staging shop.

## What the shop looks like (public, read-only)
- **Headless.** The storefront is `superbee.me`; the WooCommerce back end is **`hive.superbee.me`** (the REST API redirects there). Orders are created in WooCommerce, so the order webhook works as designed. The webhook and the order emails live on **hive**, not on the storefront.
- **Plugins visible in the REST namespaces:** WooCommerce (+ POS), Stripe, **Advanced Shipment Tracking** (`wc-ast`), **FunnelKit Automations** (`autonami` / `woofunnels`), AffiliateWP, Jetpack, and a custom `superbee/v1` plugin (checkout, products, reviews, accounts).
- **57 products, English and Thai twins** (two ids per product). Thai orders carry Thai names, so the catalogue maps by **product id** first (`data/superbee-products.json`, regenerate with `npx tsx scripts/superbee-catalogue.ts`), then by English and Thai name rules, then the AI as a last resort. Bundles count as the products inside them (gift baskets, laundry kit, oral-care kit). Raw fabric by the metre and fire starters are deliberately not counted.

## Already prepared (nothing installed)
- **Install kit** for whoever has the shop admin: `npx tsx scripts/superbee-kit.ts https://ecoproof.superbee.me <ADMIN_TOKEN>` writes `superbee-install-kit/` (git-ignored, contains the webhook secret): step-by-step `README.txt`, webhook settings, snippet A and snippet B. Both snippets are syntax-checked with PHP 8.3.
- **Wiring check from your computer, without touching the shop:** `npx tsx scripts/woo-selftest.ts https://ecoproof.superbee.me <secret> 44229` sends a signed ping, a wrong-secret request (must be refused) and one fake completed order, then prints the customer link it would produce. It stores one harmless, never-claimed `SELFTEST-...` order.
- **Impact review:** `superbee-impact-table.md` lists what every product will claim to customers, so the numbers can be approved before launch (regenerate with `npx tsx scripts/superbee-impact-table.ts`).

## The two things that can go wrong (find out first, 10 minutes in wp-admin)
1. **Which email is the customer's "order completed" mail?** Look at WooCommerce → Settings → Emails, and at FunnelKit → Automations.
   - A plain WooCommerce email (or the Advanced Shipment Tracking version of it): use **snippet A** (the QR block inside that email).
   - Anything sent by FunnelKit or an email customizer that doesn't run WooCommerce's email hooks: use **snippet B**. It sends its own short email ("Collect your eco stamp") when the order is completed, once per order, from the shop's normal sender address. Tested on staging.
2. **Which order status means "done"?** The integration reacts to **`completed`**. If SuperBee ships with a custom status (a "Shipped" or "Delivered" status from the tracking plugin), tell me the status name and I'll accept it.

## Monday checklist
1. Get from SuperBee: the answers above, and a staging copy of `hive.superbee.me` (same plugins) if one exists. If not, we test with one real order of a cheap product on the live shop.
2. Get the production webhook details: `GET https://ecoproof.superbee.me/api/stamp-places/superbee/woo` with the production admin token. It returns the webhook settings, the secret, and both snippets, already filled in.
3. **Staging first:** create the webhook (WooCommerce → Settings → Advanced → Webhooks: topic *Order updated*, delivery URL `https://ecoproof.superbee.me/api/woo/webhook/superbee`, the secret), paste the snippet into the child theme's `functions.php`, complete a test order, check: webhook row arrives, email has the QR, the link opens "Your order: …", the stamp is collected.
4. **Live:** same steps on hive.superbee.me, a real small order, then check the same things end to end.
5. Verify a refunded or cancelled order voids an unclaimed link, and that a Thai-language order gets the right impact (mapped by product id).

## Rollback (nothing to migrate)
Set the webhook to *Paused* (or delete it) and remove the snippet. Links already sent stop working only if the order is refunded; collected stamps and their Solana proofs stay.

## Data note for SuperBee
WooCommerce sends the whole order to the webhook, including customer details. EcoProof keeps only the order id, status, product ids, names and quantities of completed orders and drops everything else on arrival (it never stores prices, names, emails or addresses). The webhook secret is the only credential; keep it out of screenshots and chats.
