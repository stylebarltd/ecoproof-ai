<?php
/**
 * Where the customer sees the stamp. Shops send order emails in different
 * ways, so there are several doors, each switched in the settings:
 *
 *   1. WooCommerce's own order emails: the block is added to the emails
 *      chosen in the settings (by default "Processing order", the paid one).
 *      Email builders that draw the order through WooCommerce's email hooks
 *      get it too, below their order summary: FunnelKit's Order Summary
 *      block calls woocommerce_email_after_order_table without an email
 *      object, so any FunnelKit email with that block shows the stamp for a
 *      paid order, with no template editing.
 *   2. A separate short email, sent once when the order is paid. For shops
 *      whose order emails come from a plugin that doesn't run WooCommerce's
 *      email hooks.
 *   3. The [ecoproof_stamp] shortcode, for email builders and pages:
 *      FunnelKit (it finds the email's order by itself), or anywhere with
 *      order_id="…". part="url" gives the link, part="qr" the QR image URL.
 *   4. The order-received page and the order in My account.
 *
 * Every door shows the stamp only for a paid order with products.
 *
 * @package EcoProof_WooCommerce
 */

defined( 'ABSPATH' ) || exit;

class EcoProof_Display {

	const META_MAILED = '_ecoproof_stamp_mailed';

	public static function register() {
		add_action( 'woocommerce_email_after_order_table', array( __CLASS__, 'in_woocommerce_email' ), 20, 4 );
		// After the order is sent to EcoProof (priority 5), so the link works when the email arrives.
		add_action( 'woocommerce_order_status_changed', array( __CLASS__, 'maybe_send_own_email' ), 30, 4 );
		add_shortcode( 'ecoproof_stamp', array( __CLASS__, 'shortcode' ) );
		add_action( 'woocommerce_thankyou', array( __CLASS__, 'on_order_page' ), 5 );
		add_action( 'woocommerce_view_order', array( __CLASS__, 'on_order_page' ), 5 );
		// Some email plugins (FunnelKit) skip links to hosts WordPress treats as internal; trust EcoProof's.
		add_filter( 'http_request_host_is_external', array( __CLASS__, 'trust_ecoproof_host' ), 10, 2 );
	}

	/** Door 1: inside the WooCommerce emails chosen in the settings, or an email builder's order summary. */
	public static function in_woocommerce_email( $order, $sent_to_admin, $plain_text, $email = null ) {
		if ( $sent_to_admin || ! EcoProof_Stamp::eligible( $order ) ) {
			return;
		}
		if ( $email instanceof WC_Email ? ! in_array( $email->id, EcoProof_Config::email_ids(), true ) : ! EcoProof_Config::enabled( 'builder_summary' ) ) {
			return;
		}
		echo $plain_text ? esc_html( EcoProof_Stamp::plain( $order ) ) : EcoProof_Stamp::html( $order ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built from escaped parts
	}

	/** Door 2: a separate email, once per order, when it is paid. Sent through WooCommerce's mailer, so it wears the shop's email template and sender. */
	public static function maybe_send_own_email( $order_id, $from, $to, $order ) {
		if ( ! EcoProof_Config::enabled( 'own_email' ) || ! in_array( $to, EcoProof_Config::paid_statuses(), true ) || ! EcoProof_Stamp::eligible( $order ) || $order->get_meta( self::META_MAILED ) ) {
			return;
		}
		$recipient = $order->get_billing_email();
		if ( ! is_email( $recipient ) ) {
			return;
		}
		$subject = (string) EcoProof_Config::get( 'own_subject' );
		$mailer  = WC()->mailer();
		$message = $mailer->wrap_message( $subject, EcoProof_Stamp::html( $order ) );
		if ( $mailer->send( $recipient, $subject, $message ) ) {
			$order->update_meta_data( self::META_MAILED, time() );
			$order->save();
		}
	}

	/** Door 3: [ecoproof_stamp part="block|url|qr" order_id=""]. */
	public static function shortcode( $atts = array() ) {
		$atts  = shortcode_atts( array( 'part' => 'block', 'order_id' => '' ), $atts, 'ecoproof_stamp' );
		$order = wc_get_order( $atts['order_id'] ? absint( $atts['order_id'] ) : self::context_order_id() );
		if ( ! EcoProof_Stamp::eligible( $order ) ) {
			return '';
		}
		if ( 'url' === $atts['part'] ) {
			return esc_url( EcoProof_Stamp::claim_url( $order ) );
		}
		if ( 'qr' === $atts['part'] ) {
			return esc_url( EcoProof_Stamp::qr_url( $order ) );
		}
		return EcoProof_Stamp::html( $order );
	}

	/** The order an email builder is rendering, when it says. */
	private static function context_order_id() {
		$id = 0;
		if ( class_exists( 'BWFAN_Merge_Tag_Loader' ) ) { // FunnelKit Automations
			$id = (int) BWFAN_Merge_Tag_Loader::get_data( 'order_id' );
		}
		/** Filters the order id the [ecoproof_stamp] shortcode uses when none is given (for other email builders). */
		return (int) apply_filters( 'ecoproof_shortcode_order_id', $id );
	}

	/** Door 4: order-received page and My account > order. */
	public static function on_order_page( $order_id ) {
		if ( ! EcoProof_Config::enabled( 'order_pages' ) ) {
			return;
		}
		$order = wc_get_order( $order_id );
		if ( EcoProof_Stamp::eligible( $order ) ) {
			echo EcoProof_Stamp::html( $order ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built from escaped parts
		}
	}

	public static function trust_ecoproof_host( $external, $host ) {
		if ( $external || ! EcoProof_Config::connected() ) {
			return $external;
		}
		return strtolower( (string) $host ) === strtolower( (string) wp_parse_url( EcoProof_Config::url(), PHP_URL_HOST ) );
	}
}
