<?php
/**
 * Sends the shop's product list to EcoProof AI, so the owner doesn't type it there.
 *
 * Only what identifies a product: its number, its name, the labels of its variations, and for a translation the number of the
 * product in the shop's main language. Never prices, stock, descriptions or customer data. EcoProof AI proposes what kind each
 * product is and how many pieces a pack holds; the owner confirms, corrects or leaves out each one in their EcoProof AI dashboard
 * ("Plastic-free products"). Sending the list declares nothing.
 *
 * Sent when the owner clicks "Send my products to EcoProof AI" on the settings page, and again in the background a minute after a
 * product is published or renamed (Action Scheduler; several saves become one send).
 *
 * Translations: WPML and Polylang are recognised; any other setup can say which product is the main one with the
 * `ecoproof_main_product_id` filter ( $main_id, WC_Product $product ).
 *
 * @package EcoProof_WooCommerce
 */

defined( 'ABSPATH' ) || exit;

class EcoProof_Catalogue {

	const SYNC_HOOK = 'ecoproof_send_catalogue';
	const MAX       = 1000;

	public static function register() {
		add_action( self::SYNC_HOOK, array( __CLASS__, 'send' ) );
		add_action( 'woocommerce_new_product', array( __CLASS__, 'queue' ) );
		add_action( 'woocommerce_update_product', array( __CLASS__, 'queue' ) );
	}

	/** A product was saved: send the list once, a minute from now. */
	public static function queue() {
		if ( ! EcoProof_Config::connected() || ! function_exists( 'as_schedule_single_action' ) || ! function_exists( 'as_has_scheduled_action' ) ) {
			return;
		}
		if ( ! as_has_scheduled_action( self::SYNC_HOOK, array(), 'ecoproof' ) ) {
			as_schedule_single_action( time() + 60, self::SYNC_HOOK, array(), 'ecoproof' );
		}
	}

	/** The product in the shop's main language that this one is a translation of, or its own id. */
	public static function main_id( WC_Product $product ) {
		$id   = $product->get_id();
		$main = $id;
		if ( has_filter( 'wpml_object_id' ) ) {
			$default = apply_filters( 'wpml_default_language', null );
			$main    = (int) apply_filters( 'wpml_object_id', $id, 'product', true, $default );
		} elseif ( function_exists( 'pll_get_post' ) && function_exists( 'pll_default_language' ) ) {
			$main = (int) pll_get_post( $id, pll_default_language() );
		}
		/** Filters which product a translation belongs to, for translation setups other than WPML and Polylang. */
		$main = (int) apply_filters( 'ecoproof_main_product_id', $main ? $main : $id, $product );
		return $main > 0 ? $main : $id;
	}

	/** The published products as EcoProof AI takes them. */
	public static function products() {
		$out = array();
		$ids = wc_get_products(
			array(
				'status' => 'publish',
				'limit'  => self::MAX,
				'return' => 'ids',
				'type'   => array( 'simple', 'variable' ),
			)
		);
		foreach ( $ids as $id ) {
			$product = wc_get_product( $id );
			if ( ! $product instanceof WC_Product ) {
				continue;
			}
			$row  = array(
				'id'   => (int) $id,
				'name' => wp_strip_all_tags( $product->get_name() ),
			);
			$main = self::main_id( $product );
			if ( $main !== (int) $id ) {
				$row['main'] = $main;
			}
			if ( $product->is_type( 'variable' ) ) {
				$variations = array();
				foreach ( $product->get_children() as $variation_id ) {
					$variation = wc_get_product( $variation_id );
					if ( $variation instanceof WC_Product_Variation && 'publish' === $variation->get_status() ) {
						$label = implode( ', ', array_filter( array_map( 'strval', $variation->get_attributes() ) ) );
						$term  = wc_get_formatted_variation( $variation, true, false, false );
						$variations[] = array(
							'id'    => (int) $variation_id,
							'label' => wp_strip_all_tags( '' !== $term ? $term : $label ),
						);
					}
				}
				if ( $variations ) {
					$row['variations'] = $variations;
				}
			}
			$out[] = $row;
		}
		return $out;
	}

	/**
	 * Sends the list. Returns array( 'received' => n, 'open' => n ) from EcoProof AI, or a WP_Error.
	 *
	 * @return array|WP_Error
	 */
	public static function send() {
		if ( ! EcoProof_Config::connected() ) {
			return new WP_Error( 'ecoproof_not_connected', __( 'Connect to EcoProof AI first.', 'ecoproof-for-woocommerce' ) );
		}
		$body     = wp_json_encode( array( 'products' => self::products() ) );
		$response = EcoProof_Orders::signed_post( '/api/woo/catalogue/', $body, 120 );
		if ( is_wp_error( $response ) ) {
			EcoProof_Orders::log( 'Product list not sent: ' . $response->get_error_message(), 'warning' );
			return $response;
		}
		$code   = (int) wp_remote_retrieve_response_code( $response );
		$result = json_decode( wp_remote_retrieve_body( $response ), true );
		if ( 200 !== $code || ! is_array( $result ) ) {
			EcoProof_Orders::log( 'Product list refused by EcoProof AI: HTTP ' . $code, 'error' );
			return new WP_Error( 'ecoproof_refused', 'HTTP ' . $code );
		}
		EcoProof_Orders::log( sprintf( 'Product list sent: %d products, %d to check in EcoProof AI.', (int) ( $result['received'] ?? 0 ), (int) ( $result['open'] ?? 0 ) ) );
		return $result;
	}
}
