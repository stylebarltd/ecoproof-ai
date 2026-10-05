<?php
/**
 * Plugin Name:          EcoProof for WooCommerce
 * Plugin URI:           https://github.com/stylebarltd/ecoproof-ai
 * Description:          Gives every paid order a verified EcoProof eco stamp: the order's real impact goes into the customer's eco passport, proven on Solana. Adds a "Collect your eco stamp" button and QR to your order emails.
 * Version:              1.1.0
 * Requires at least:    6.5
 * Requires PHP:         7.4
 * Requires Plugins:     woocommerce
 * WC requires at least: 8.0
 * Author:               EcoProof
 * License:              GPL-2.0-or-later
 * Text Domain:          ecoproof-for-woocommerce
 *
 * @package EcoProof_WooCommerce
 */

defined( 'ABSPATH' ) || exit;

define( 'ECOPROOF_WC_VERSION', '1.1.0' );
define( 'ECOPROOF_WC_FILE', __FILE__ );
define( 'ECOPROOF_WC_DIR', plugin_dir_path( __FILE__ ) );

// Order data lives in WooCommerce's own tables (HPOS) or posts; the plugin only uses the order API, so both work.
add_action(
	'before_woocommerce_init',
	function () {
		if ( class_exists( \Automattic\WooCommerce\Utilities\FeaturesUtil::class ) ) {
			\Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility( 'custom_order_tables', __FILE__, true );
		}
	}
);

add_action(
	'plugins_loaded',
	function () {
		if ( ! class_exists( 'WooCommerce' ) ) {
			return;
		}
		require_once ECOPROOF_WC_DIR . 'includes/class-ecoproof-config.php';
		require_once ECOPROOF_WC_DIR . 'includes/class-ecoproof-stamp.php';
		require_once ECOPROOF_WC_DIR . 'includes/class-ecoproof-orders.php';
		require_once ECOPROOF_WC_DIR . 'includes/class-ecoproof-display.php';
		require_once ECOPROOF_WC_DIR . 'includes/class-ecoproof-products.php';

		EcoProof_Orders::register();
		EcoProof_Display::register();
		EcoProof_Products::register();

		if ( is_admin() ) {
			require_once ECOPROOF_WC_DIR . 'includes/class-ecoproof-settings.php';
			EcoProof_Settings::register();
		}
	}
);

add_filter(
	'plugin_action_links_' . plugin_basename( __FILE__ ),
	function ( $links ) {
		array_unshift( $links, '<a href="' . esc_url( admin_url( 'admin.php?page=wc-settings&tab=ecoproof' ) ) . '">' . esc_html__( 'Settings', 'ecoproof-for-woocommerce' ) . '</a>' );
		return $links;
	}
);
