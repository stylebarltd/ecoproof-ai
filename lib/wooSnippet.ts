/** The theme snippet for the shop's CHILD theme functions.php: puts the signed claim link + QR into the completed-order email only. Generated per brand so it carries the right app URL, place and secret. */
export function wooSnippet(o: { appUrl: string; placeId: string; secret: string }, variant: "email-block" | "own-email" = "email-block"): string {
  return `<?php
/**
 * EcoProof AI: eco stamp QR in the "order completed" email.
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

${variant === "own-email" ? `// Sends its own short email when an order is completed. Use this INSTEAD of the block above when the shop's order emails come from
// another plugin (an email customizer, FunnelKit Automations, ...) that doesn't run WooCommerce's standard email hooks.
add_action( 'woocommerce_order_status_completed', function ( $order_id ) {
	$order = wc_get_order( $order_id );
	if ( ! $order || $order->get_meta( '_ecoproof_stamp_mailed' ) ) return; // once per order
	$to = $order->get_billing_email();
	if ( ! is_email( $to ) ) return;
	$html = ecoproof_block( $order );
	if ( ! $html ) return;
	$body = '<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:16px">' . $html . '</div>';
	$headers = array( 'Content-Type: text/html; charset=UTF-8' );
	$from = get_option( 'woocommerce_email_from_address' ); // same sender as the shop's other order emails
	if ( is_email( $from ) ) $headers[] = 'From: ' . wp_specialchars_decode( (string) get_option( 'woocommerce_email_from_name' ), ENT_QUOTES ) . ' <' . $from . '>';
	if ( wp_mail( $to, 'Collect your eco stamp 🌱 | รับแสตมป์รักษ์โลกของคุณ', $body, $headers ) ) {
		$order->update_meta_data( '_ecoproof_stamp_mailed', time() );
		$order->save();
	}
}, 30 );
` : `// The "order completed" email to the customer: the signed QR + button. (Nothing is added to the shop pages.)
add_action( 'woocommerce_email_after_order_table', function ( $order, $sent_to_admin, $plain_text, $email ) {
	if ( $sent_to_admin || ! $email || 'customer_completed_order' !== $email->id ) return;
	echo ecoproof_block( $order, (bool) $plain_text ); // phpcs:ignore WordPress.Security.EscapeOutput
}, 20, 4 );
`}`;
}
