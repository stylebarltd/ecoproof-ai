=== EcoProof for WooCommerce ===
Contributors: ecoproof
Tags: woocommerce, sustainability, loyalty, nft, solana
Requires at least: 6.5
Tested up to: 7.0
Requires PHP: 7.4
WC requires at least: 8.0
Stable tag: 1.0.0
License: GPLv2 or later

Every paid order earns the customer a verified eco stamp in their EcoProof passport, proven on Solana.

== Description ==

When an order is paid, the plugin tells EcoProof which products were bought, and the customer gets a "Collect your eco stamp" button and QR code. Collecting it adds the order's real impact (single-use plastics avoided, CO2 saved) to their EcoProof passport. Stamps add up to soulbound Bee Guardian NFTs.

Where the customer sees it (each can be switched on or off):

* Inside WooCommerce's own order emails (by default the "Processing order" email, sent when an order is paid).
* A separate short email, for shops whose order emails come from a plugin that doesn't use WooCommerce's emails.
* Email builders that use WooCommerce's email hooks: FunnelKit Automations shows the stamp below its Order Summary block automatically, in any email with that block, once the order is paid.
* The `[ecoproof_stamp]` shortcode, to place it yourself. FunnelKit: an HTML or Text block with `[ecoproof_stamp]`; it finds the order by itself (turn off "Email builders" then, or the stamp shows twice). Other builders: `[ecoproof_stamp order_id="..."]`, or hook `ecoproof_shortcode_order_id`. `part="url"` returns the link, `part="qr"` the QR image URL.
* The order-received page and the order in My account.

Privacy: only the order id, status, product ids, names and quantities are sent. Never customer details or prices. Refunded, cancelled or failed orders void a stamp nobody has collected.

== Installation ==

1. Upload the plugin and activate it.
2. WooCommerce > Settings > EcoProof: enter the place id and secret you got from EcoProof, save, then click "Test connection".
3. Check "Where customers see their stamp" matches how your shop sends order emails.

The connection can also be set in wp-config.php, which keeps the secret out of the database:

    define( 'ECOPROOF_PLACE', 'your-place-id' );
    define( 'ECOPROOF_SECRET', '...' );
    define( 'ECOPROOF_URL', 'https://ecoproof.superbee.me' ); // optional

== Developers ==

* `ecoproof_stamp_html` filter: change the stamp block's HTML.
* `ecoproof_shortcode_order_id` filter: tell the shortcode which order an email builder is rendering.
* `ECOPROOF_API_URL` constant: where the server sends orders, when it reaches EcoProof by another address than customers do (local development).
* Logs: WooCommerce > Status > Logs, source "ecoproof".

== Changelog ==

= 1.0.0 =
* First release.
