<?php
/**
 * Sends orders to EcoProof.
 *
 * When an order is paid (a "paid" status from the settings; processing and
 * completed by default) it goes to EcoProof straight away, inside the status
 * change, so the stamp link is live before the order email leaves. Later
 * statuses that matter are sent too: a refund, cancellation or failure voids
 * a stamp nobody has collected yet.
 *
 * The request uses WooCommerce's webhook format and signature
 * (X-WC-Webhook-Signature = base64 HMAC-SHA256 of the body with the shop's
 * EcoProof secret), but carries only the order id, status and line items:
 * no customer data, no prices. A failed send retries through Action
 * Scheduler; until it lands, the claim page asks the customer to try again.
 *
 * @package EcoProof_WooCommerce
 */

defined( 'ABSPATH' ) || exit;

class EcoProof_Orders {

	const RETRY_HOOK   = 'ecoproof_send_order';
	const MAX_ATTEMPTS = 6;
	const META_SENT    = '_ecoproof_sent_status';
	const META_IMPACT  = '_ecoproof_impact';

	/** Statuses that void an uncollected stamp. */
	const VOID_STATUSES = array( 'refunded', 'cancelled', 'failed' );

	public static function register() {
		// Early priority: before email plugins that send from the same transition.
		add_action( 'woocommerce_order_status_changed', array( __CLASS__, 'on_status_changed' ), 5, 4 );
		add_action( self::RETRY_HOOK, array( __CLASS__, 'retry' ), 10, 2 );
	}

	/** What EcoProof is told: "processing"/"completed" for paid orders (a custom paid status counts as processing), or the void status. */
	private static function status_for( $status ) {
		if ( in_array( $status, EcoProof_Config::paid_statuses(), true ) ) {
			return in_array( $status, array( 'processing', 'completed' ), true ) ? $status : 'processing';
		}
		return in_array( $status, self::VOID_STATUSES, true ) ? $status : null;
	}

	public static function on_status_changed( $order_id, $from, $to, $order ) {
		if ( ! EcoProof_Config::connected() || ! $order instanceof WC_Order || null === self::status_for( $to ) ) {
			return;
		}
		if ( ! self::send( $order ) ) {
			self::schedule_retry( $order_id, 1 );
		}
	}

	/** Action Scheduler retry: sends the order's current status again. */
	public static function retry( $order_id, $attempt = 1 ) {
		$order = wc_get_order( $order_id );
		if ( ! $order instanceof WC_Order || ! EcoProof_Config::connected() || null === self::status_for( $order->get_status() ) ) {
			return;
		}
		if ( ! self::send( $order ) ) {
			self::schedule_retry( $order_id, (int) $attempt + 1 );
		}
	}

	private static function schedule_retry( $order_id, $attempt ) {
		if ( $attempt > self::MAX_ATTEMPTS || ! function_exists( 'as_schedule_single_action' ) ) {
			self::log( sprintf( 'Gave up sending order %d to EcoProof.', $order_id ), 'error' );
			return;
		}
		// 1, 2, 4, 8, 16, 32 minutes.
		as_schedule_single_action( time() + 60 * ( 2 ** ( $attempt - 1 ) ), self::RETRY_HOOK, array( $order_id, $attempt ), 'ecoproof' );
	}

	/** Sends the order. True when EcoProof took it, or refused it for a reason a retry won't fix. */
	public static function send( WC_Order $order ) {
		$status = self::status_for( $order->get_status() );
		$items  = array();
		foreach ( $order->get_items() as $item ) {
			if ( $item instanceof WC_Order_Item_Product ) {
				$items[] = array(
					'name'       => $item->get_name(),
					'quantity'   => (int) $item->get_quantity(),
					'product_id' => (int) $item->get_product_id(),
				);
			}
		}
		$body = wp_json_encode(
			array(
				'id'         => $order->get_id(),
				'status'     => $status,
				'line_items' => $items,
			)
		);

		$response = self::post( $body );
		if ( is_wp_error( $response ) ) {
			self::log( sprintf( 'Order %d (%s) not sent: %s', $order->get_id(), $status, $response->get_error_message() ), 'warning' );
			return false;
		}

		$code   = (int) wp_remote_retrieve_response_code( $response );
		$result = json_decode( wp_remote_retrieve_body( $response ), true );
		if ( $code < 200 || $code >= 300 ) {
			self::log( sprintf( 'Order %d (%s) refused by EcoProof: HTTP %d', $order->get_id(), $status, $code ), 'error' );
			return $code < 500; // a 4xx (wrong secret, unknown place) won't get better by retrying
		}

		$outcome = is_array( $result ) && isset( $result['result'] ) ? (string) $result['result'] : 'ok';
		self::log( sprintf( 'Order %d (%s): %s', $order->get_id(), $status, $outcome ) );
		// EcoProof's estimate of what the order avoids, for the stamp block ("Your order avoids about ...").
		if ( 'stored' === $outcome && isset( $result['impact'] ) && is_array( $result['impact'] ) ) {
			$order->update_meta_data(
				self::META_IMPACT,
				array(
					'plastic_items' => max( 0, (int) ( $result['impact']['plasticItems'] ?? 0 ) ),
					'co2_kg'        => max( 0, (float) ( $result['impact']['co2Kg'] ?? 0 ) ),
					'replaces'      => sanitize_text_field( (string) ( $result['impact']['replaces'] ?? '' ) ), // "7 plastic detergent jugs and 300 disposable dryer sheets"
				)
			);
			$order->save();
		}
		if ( $order->get_meta( self::META_SENT ) !== $status ) {
			$order->update_meta_data( self::META_SENT, $status );
			if ( 'stored' === $outcome ) {
				$order->add_order_note( __( 'EcoProof: eco stamp ready for the customer to collect.', 'ecoproof-for-woocommerce' ) );
			} elseif ( 'voided' === $outcome ) {
				$order->add_order_note( __( 'EcoProof: uncollected eco stamp voided.', 'ecoproof-for-woocommerce' ) );
			}
			$order->save();
		}
		return true;
	}

	/** A signed POST of a raw body to the shop's EcoProof webhook. Also used by the settings page's connection test. */
	public static function post( $body ) {
		return self::signed_post( '/api/woo/webhook/', $body, 8 );
	}

	/** A signed POST to one of EcoProof's shop endpoints (<path><place>). The signature is the same as the webhook's. */
	public static function signed_post( $path, $body, $timeout ) {
		return wp_remote_post(
			EcoProof_Config::api_url() . $path . rawurlencode( EcoProof_Config::place() ),
			array(
				'timeout' => $timeout,
				'headers' => array(
					'Content-Type'           => 'application/json',
					'X-WC-Webhook-Signature' => base64_encode( hash_hmac( 'sha256', $body, EcoProof_Config::secret(), true ) ),
					'X-WC-Webhook-Topic'     => 'order.updated',
					'User-Agent'             => 'EcoProof-for-WooCommerce/' . ECOPROOF_WC_VERSION,
				),
				'body'    => $body,
			)
		);
	}

	public static function log( $message, $level = 'info' ) {
		if ( function_exists( 'wc_get_logger' ) ) {
			wc_get_logger()->log( $level, $message, array( 'source' => 'ecoproof' ) );
		}
	}
}
