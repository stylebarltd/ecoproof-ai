# WooCommerce connection (verified-purchase stamps)

Shops connect with the **EcoProof for WooCommerce** plugin: `integrations/woocommerce/ecoproof-for-woocommerce/`.
When an order is paid (processing, or any status the shop marks as paid), the plugin sends it to EcoProof and the customer
gets a "Collect your eco stamp" button and QR. Collecting it gives a **verified purchase** stamp with the order's real impact.

## Install

```bash
cd integrations/woocommerce && zip -r ecoproof-for-woocommerce.zip ecoproof-for-woocommerce
```

Upload the zip in wp-admin (Plugins > Add New > Upload), activate, then **WooCommerce > Settings > EcoProof**: enter the place id
and secret, save, click **Test connection**. The place id and secret come from:

```
curl -H "x-admin-token: $ADMIN_TOKEN" https://<app>/api/stamp-places/<place>/woo
```

The connection can also be set in `wp-config.php` (`ECOPROOF_PLACE`, `ECOPROOF_SECRET`, optional `ECOPROOF_URL`), which keeps the
secret out of the database. `ECOPROOF_API_URL` is only for local development, where the shop's server reaches EcoProof by another
address than customers do (DDEV: `http://host.docker.internal:3000`).

## Where the customer sees the stamp

Shops send order emails in different ways, so each of these can be switched on or off in the settings:

| Shop setup | Use |
|---|---|
| WooCommerce's own emails | On by default: the block goes into the **Processing order** email (pick others in the settings). |
| FunnelKit Automations transactional emails | Put `[ecoproof_stamp]` in FunnelKit's **processing_order** email. FunnelKit replaces WooCommerce's emails, so the default above never shows. |
| Another email builder | `[ecoproof_stamp order_id="..."]`, or the `ecoproof_shortcode_order_id` filter; or switch on the **separate email**. |
| Any shop | The order-received page and My account > order (on by default). |

`[ecoproof_stamp part="url"]` gives only the link (for a button), `part="qr"` the QR image URL.

## What is sent

The order id, status, product ids, names and quantities: nothing else (no customer details, no prices). The request uses
WooCommerce's webhook format and signature, so it arrives at `/api/woo/webhook/<place>`. A failed send retries (Action Scheduler,
up to ~1 hour). Refunded, cancelled or failed orders void a stamp nobody has collected; collected stamps stay.

## How the link is signed
`token = <orderId>.<first 22 chars of base64url(HMAC-SHA256(secret, "ecoproof:order-link:v1:<place>:<orderId>"))>`.
Without the secret a link can't be forged, and each order can be claimed once (database and on-chain).

## Older setup
Before the plugin, shops used WooCommerce's built-in webhook plus a theme snippet (`themeSnippet` / `themeSnippetOwnEmail` from the
endpoint above, `scripts/superbee-kit.ts`). That still works, but only reacts to what the webhook sends and needs both pieces set up
by hand; new shops should use the plugin.
