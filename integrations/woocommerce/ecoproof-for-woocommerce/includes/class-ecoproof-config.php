<?php
/**
 * Settings, resolved in one place.
 *
 * Every setting is saved in wp-admin (WooCommerce > Settings > EcoProof), and
 * the connection settings can instead be defined as constants in
 * wp-config.php (ECOPROOF_PLACE, ECOPROOF_SECRET, ECOPROOF_API_URL). A
 * constant always wins and its field is locked in the settings page, so a
 * secret can live outside the database.
 *
 * The EcoProof URL has no settings field: it is the hosted service, and only
 * a wp-config.php constant (ECOPROOF_URL, for local development) overrides it.
 *
 * @package EcoProof_WooCommerce
 */

defined( 'ABSPATH' ) || exit;

class EcoProof_Config {

	const OPTION_PREFIX = 'ecoproof_';

	/** Defaults for the saved settings. */
	const DEFAULTS = array(
		'url'             => 'https://ecoproof.superbee.me',
		'place'           => '',
		'secret'          => '',
		'api_url'         => '',
		'paid_statuses'   => array( 'processing', 'completed' ),
		'email_ids'       => array( 'customer_processing_order' ),
		'own_email'       => 'no',
		'own_subject'     => 'Collect your eco stamp 🌱',
		'order_pages'     => 'yes',
		'builder_summary' => 'yes',
	);

	/** Connection settings that a wp-config.php constant can override. */
	const CONSTANTS = array(
		'url'     => 'ECOPROOF_URL',
		'place'   => 'ECOPROOF_PLACE',
		'secret'  => 'ECOPROOF_SECRET',
		'api_url' => 'ECOPROOF_API_URL',
	);

	public static function get( $key ) {
		if ( isset( self::CONSTANTS[ $key ] ) && defined( self::CONSTANTS[ $key ] ) && '' !== (string) constant( self::CONSTANTS[ $key ] ) ) {
			return constant( self::CONSTANTS[ $key ] );
		}
		if ( 'url' === $key ) {
			return self::DEFAULTS['url'];
		}
		return get_option( self::OPTION_PREFIX . $key, self::DEFAULTS[ $key ] );
	}

	public static function locked( $key ) {
		return isset( self::CONSTANTS[ $key ] ) && defined( self::CONSTANTS[ $key ] ) && '' !== (string) constant( self::CONSTANTS[ $key ] );
	}

	/** Connected = a URL, a place id and a secret. Without them the plugin does nothing. */
	public static function connected() {
		return '' !== self::url() && '' !== self::place() && '' !== self::secret();
	}

	/** Public EcoProof URL: claim links and QR codes. */
	public static function url() {
		return untrailingslashit( trim( (string) self::get( 'url' ) ) );
	}

	/** Where this server sends orders. Same as the public URL unless the shop reaches EcoProof by another address (local dev). */
	public static function api_url() {
		$api = untrailingslashit( trim( (string) self::get( 'api_url' ) ) );
		return '' !== $api ? $api : self::url();
	}

	public static function place() {
		return trim( (string) self::get( 'place' ) );
	}

	public static function secret() {
		return trim( (string) self::get( 'secret' ) );
	}

	/** Order statuses (without "wc-") that mean the order is paid and earns a stamp. */
	public static function paid_statuses() {
		$statuses = (array) self::get( 'paid_statuses' );
		$statuses = array_map( fn( $s ) => preg_replace( '/^wc-/', '', (string) $s ), $statuses );
		return $statuses ? array_values( $statuses ) : self::DEFAULTS['paid_statuses'];
	}

	public static function email_ids() {
		return array_values( array_filter( (array) self::get( 'email_ids' ) ) );
	}

	public static function enabled( $key ) {
		return 'yes' === self::get( $key );
	}
}
