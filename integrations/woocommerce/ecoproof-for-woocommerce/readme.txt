=== EcoProof for WooCommerce ===
Contributors: ecoproof
Tags: woocommerce, sustainability, loyalty, nft, solana
Requires at least: 6.5
Tested up to: 7.0
Requires PHP: 7.4
WC requires at least: 8.0
Stable tag: 1.5.0
License: GPLv2 or later

Every paid order earns the customer a verified eco stamp in their EcoProof passport, proven on Solana.

== Description ==

When an order is paid, the plugin tells EcoProof which products were bought, and the customer gets a "Collect your eco stamp" button and QR code. Collecting it adds the order's real impact to their EcoProof passport, for example "230 g plastic avoided, 690 g CO2 saved". Stamps add up to soulbound Bee Guardian NFTs.

Where the numbers come from:

* "Send my products to EcoProof" (WooCommerce > Settings > EcoProof) sends your product names and numbers. EcoProof AI proposes what kind each product is and how many pieces a pack holds; you check them in your EcoProof dashboard ("Plastic-free products") and add them to your list. You never enter a number. New and renamed products are sent again by themselves.
* EcoProof counts a fixed amount of plastic and CO2 avoided for each kind of product and packaging, the same for every shop.
* A product you haven't listed yet is estimated from its name and shown to the customer as an estimate. It then waits in your dashboard ("Confirm these products?") for you to confirm it or say it isn't plastic-free.

Where the customer sees it (each can be switched on or off):

* Inside WooCommerce's own order emails (by default the "Processing order" email, sent when an order is paid).
* A separate short email, for shops whose order emails come from a plugin that doesn't use WooCommerce's emails.
* Email builders that use WooCommerce's email hooks: FunnelKit Automations shows the stamp below its Order Summary block automatically, in any email with that block, once the order is paid.
* The `[ecoproof_stamp]` shortcode, to place it yourself. FunnelKit: an HTML or Text block with `[ecoproof_stamp]`; it finds the order by itself (turn off "Email builders" then, or the stamp shows twice). Other builders: `[ecoproof_stamp order_id="..."]`, or hook `ecoproof_shortcode_order_id`. `part="url"` returns the link, `part="qr"` the QR image URL.
* The order-received page and the order in My account.

Privacy: for orders, only the order id, status, product ids, names and quantities are sent; for the product list, only product numbers, names and variation labels. Never customer details or prices. Refunded, cancelled or failed orders void a stamp nobody has collected.

== Installation ==

1. Upload the plugin and activate it.
2. WooCommerce > Settings > EcoProof: enter the place id and secret you got from EcoProof, save, then click "Test connection".
3. Check "Where customers see their stamp" matches how your shop sends order emails.

The connection can also be set in wp-config.php, which keeps the secret out of the database:

    define( 'ECOPROOF_PLACE', 'your-place-id' );
    define( 'ECOPROOF_SECRET', '...' );

== Developers ==

* `ecoproof_stamp_html` filter: change the stamp block's HTML.
* `ecoproof_main_product_id` filter ( $main_id, WC_Product $product ): which product a translation belongs to, for translation setups other than WPML and Polylang.
* `ecoproof_shortcode_order_id` filter: tell the shortcode which order an email builder is rendering.
* `ECOPROOF_URL` constant: point the plugin at another EcoProof server (local development). There is no settings field; the default is https://ecoproof.app.
* `ECOPROOF_API_URL` constant: where the server sends orders, when it reaches EcoProof by another address than customers do (local development).
* Logs: WooCommerce > Status > Logs, source "ecoproof".

== Changelog ==

= 1.5.0 =
* EcoProof AI is now EcoProof, at https://ecoproof.app: the new address is built in and the wording follows. Links made by earlier versions keep working. EcoProof AI is the name of the part that proposes what your products are.

= 1.4.1 =
* Product names are sent as they read ("5 & 9 Pack", not "5 &amp; 9 Pack").

= 1.4.0 =
* "Send my products to EcoProof": your product list goes to EcoProof with a proposal for each product, so you confirm instead of typing. Translations (WPML, Polylang, or the `ecoproof_main_product_id` filter) follow their main product.
* Orders carry the variation number, so variations with different pack sizes count right.

= 1.3.0 =
* Impact is counted by EcoProof in grams of plastic and CO2, from the products you list in your EcoProof dashboard. The per-product estimates and numbers in WooCommerce (Product data > EcoProof, "Estimate all products", the Products column) are gone: no shop sets its own numbers any more.
* The stamp block says "Your order avoids about 230 g of plastic and 690 g of CO2".

= 1.2.1 =
* EcoProof's address is built in. Wording in the stamp block.

= 1.2.0 =
* Translations use the numbers of the product in the main language (WPML, Polylang, or the `ecoproof_main_product_id` filter).

= 1.1.0 =
* What each product replaces: AI estimates per product, reviewed and confirmed by the shop (Product data > EcoProof), "Estimate all products", and an EcoProof column in the Products list.
* The order email names what the order replaces ("Your order replaces about 7 plastic detergent jugs").

= 1.0.0 =
* First release.
