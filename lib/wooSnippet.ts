/** The theme snippet for the shop's CHILD theme functions.php: puts the signed claim link + QR into the completed-order email,
 *  the thank-you page and the order view. Generated per brand so it carries the right app URL, place and secret. */
export function wooSnippet(o: { appUrl: string; placeId: string; secret: string }): string {
  return `<?php
/**
 * EcoProof AI: eco stamp for completed orders.
 * Add to the CHILD theme's functions.php (never the parent theme). Remove this block to switch it off.
 * The secret signs each order's claim link so it can't be guessed. Keep it private (better: define it in wp-config.php).
 */
if ( ! defined( 'ECOPROOF_APP' ) )    define( 'ECOPROOF_APP', '${o.appUrl}' );
if ( ! defined( 'ECOPROOF_PLACE' ) )  define( 'ECOPROOF_PLACE', '${o.placeId}' );
if ( ! defined( 'ECOPROOF_SECRET' ) ) define( 'ECOPROOF_SECRET', '${o.secret}' );

function ecoproof_token( $order_id ) {
	$mac = hash_hmac( 'sha256', 'ecoproof:order-link:v1:' . ECOPROOF_PLACE . ':' . $order_id, ECOPROOF_SECRET, true );
	$sig = substr( rtrim( strtr( base64_encode( $mac ), '+/', '-_' ), '=' ), 0, 22 );
	return $order_id . '.' . $sig;
}

function ecoproof_block( $order, $plain = false ) {
	if ( ! $order || ! $order->has_status( 'completed' ) ) return '';
	$token = ecoproof_token( $order->get_id() );
	$link  = ECOPROOF_APP . '/o/' . ECOPROOF_PLACE . '/' . $token;
	if ( $plain ) {
		return "\\n" . 'Collect your eco stamp: ' . $link . "\\n";
	}
	$qr = ECOPROOF_APP . '/api/woo/qr/' . ECOPROOF_PLACE . '/' . $token;
	return '<div style="margin:24px 0;padding:20px;border-radius:16px;background:#f0fae1;text-align:center;font-family:sans-serif">'
		. '<h2 style="margin:0 0 6px;color:#272e1b">Collect your eco stamp 🌱</h2>'
		. '<p style="margin:0 0 14px;color:#56633f">Tap the button or scan the code. Your order\\'s real impact goes into your EcoProof passport, verified on Solana.</p>'
		. '<p><a href="' . esc_url( $link ) . '" style="display:inline-block;padding:12px 22px;border-radius:999px;background:#e8a317;color:#201e1d;font-weight:bold;text-decoration:none">Collect my stamp</a></p>'
		. '<p><img src="' . esc_url( $qr ) . '" width="160" height="160" alt="Scan to collect your eco stamp" style="border-radius:12px"></p>'
		. '</div>';
}

// 1. The "order completed" email to the customer.
add_action( 'woocommerce_email_after_order_table', function ( $order, $sent_to_admin, $plain_text, $email ) {
	if ( $sent_to_admin || ! $email || 'customer_completed_order' !== $email->id ) return;
	echo ecoproof_block( $order, (bool) $plain_text ); // phpcs:ignore WordPress.Security.EscapeOutput
}, 20, 4 );

// 2. Thank-you page and 3. the order view in My Account (only shows once the order is completed).
add_action( 'woocommerce_thankyou', function ( $order_id ) {
	echo ecoproof_block( wc_get_order( $order_id ) ); // phpcs:ignore WordPress.Security.EscapeOutput
}, 20 );
add_action( 'woocommerce_order_details_after_order_table', function ( $order ) {
	echo ecoproof_block( $order ); // phpcs:ignore WordPress.Security.EscapeOutput
}, 20 );
`;
}
