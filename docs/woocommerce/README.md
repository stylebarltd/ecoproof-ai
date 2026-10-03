# WooCommerce connection (premium door)

Orders flow shop -> EcoProof through WooCommerce's **built-in webhook**; the customer claims the stamp from a **signed link / QR** in the order email. No dedicated plugin: only a small snippet in the child theme.

Get both pieces (webhook settings + a ready-to-paste snippet carrying the secret) from the admin endpoint:

```
curl -H "x-admin-token: $ADMIN_TOKEN" https://<app>/api/stamp-places/superbee/woo
```

## 1. Webhook (WooCommerce > Settings > Advanced > Webhooks > Add webhook)
- Name: EcoProof · Status: Active · Topic: **Order updated**
- Delivery URL: `https://<app>/api/woo/webhook/superbee`
- Secret: the `secret` from the endpoint above · API version: WP REST API Integration v3

EcoProof keeps only the order id, status, product names and quantities of **completed** orders. Prices and every customer field are discarded on arrival. Refunded or cancelled orders that were not yet claimed become invalid.

## 2. Theme snippet
Paste `themeSnippet` into the **child theme's functions.php**. It adds a "Collect your eco stamp" block (button + QR) to the *order completed* email, the thank-you page and the order view in My Account, but only for completed orders.

## How the link is signed
`token = <orderId>.<first 22 chars of base64url(HMAC-SHA256(secret, "ecoproof:order-link:v1:<place>:<orderId>"))>`.
Without the brand secret a link can't be forged, and each order can be claimed once (database and on-chain).

## Rollout order
Nothing is installed on the live shop until it's been reviewed. Test first on a staging copy of the shop, then the live shop.
