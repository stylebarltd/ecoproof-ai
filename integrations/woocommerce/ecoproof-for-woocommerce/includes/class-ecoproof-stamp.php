<?php
/**
 * An order's stamp: its signed claim link, its QR, and the block that shows
 * them (HTML for emails and pages, plain text for plain-text emails).
 *
 * The link is <app>/o/<place>/<order id>.<sig>, where sig is the first 22
 * characters of base64url(HMAC-SHA256(secret, "ecoproof:order-link:v1:<place>:<order id>")).
 * Without the secret a link can't be made up, and EcoProof lets each order be
 * collected once.
 *
 * @package EcoProof_WooCommerce
 */

defined( 'ABSPATH' ) || exit;

class EcoProof_Stamp {

	public static function token( $order_id ) {
		$mac = hash_hmac( 'sha256', 'ecoproof:order-link:v1:' . EcoProof_Config::place() . ':' . $order_id, EcoProof_Config::secret(), true );
		return $order_id . '.' . substr( rtrim( strtr( base64_encode( $mac ), '+/', '-_' ), '=' ), 0, 22 );
	}

	public static function claim_url( WC_Order $order ) {
		return EcoProof_Config::url() . '/o/' . rawurlencode( EcoProof_Config::place() ) . '/' . self::token( $order->get_id() );
	}

	public static function qr_url( WC_Order $order ) {
		return EcoProof_Config::url() . '/api/woo/qr/' . rawurlencode( EcoProof_Config::place() ) . '/' . self::token( $order->get_id() );
	}

	/** Has a stamp: connected, paid, and has products. */
	public static function eligible( $order ) {
		return EcoProof_Config::connected()
			&& $order instanceof WC_Order
			&& $order->has_status( EcoProof_Config::paid_statuses() )
			&& count( $order->get_items() ) > 0;
	}

	/** The "Collect your eco stamp" block. Inline styles only, so it survives email clients. */
	public static function html( WC_Order $order ) {
		$heading = __( 'Collect your eco stamp 🌱', 'ecoproof-for-woocommerce' );
		$text    = __( 'Thank you for choosing sustainable. Tap the button or scan the code: your order’s real impact goes into your EcoProof passport, verified on Solana.', 'ecoproof-for-woocommerce' );
		$button  = __( 'Collect my stamp', 'ecoproof-for-woocommerce' );
		$alt     = __( 'Scan to collect your eco stamp', 'ecoproof-for-woocommerce' );

		$html = '<div class="ecoproof-stamp" style="margin:24px 0;padding:20px;border-radius:16px;background:#f0fae1;text-align:center;font-family:sans-serif">'
			. '<h2 style="margin:0 0 6px;color:#272e1b;font-size:20px">' . esc_html( $heading ) . '</h2>'
			. '<p style="margin:0 0 14px;color:#56633f;font-size:14px;line-height:1.5">' . esc_html( $text ) . '</p>'
			. '<p style="margin:0 0 14px"><a href="' . esc_url( self::claim_url( $order ) ) . '" style="display:inline-block;padding:12px 22px;border-radius:999px;background:#e8a317;color:#201e1d;font-weight:bold;text-decoration:none">' . esc_html( $button ) . '</a></p>'
			. '<p style="margin:0"><img src="' . esc_url( self::qr_url( $order ) ) . '" width="160" height="160" alt="' . esc_attr( $alt ) . '" style="border-radius:12px"></p>'
			. '</div>';

		/** Filters the stamp block HTML (emails, order pages, shortcode). */
		return apply_filters( 'ecoproof_stamp_html', $html, $order );
	}

	public static function plain( WC_Order $order ) {
		/* translators: %s: claim link */
		return "\n" . sprintf( __( 'Collect your eco stamp: %s', 'ecoproof-for-woocommerce' ), self::claim_url( $order ) ) . "\n";
	}
}
