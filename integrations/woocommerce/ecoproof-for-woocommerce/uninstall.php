<?php
/**
 * Removes the plugin's settings. Order notes and order meta stay: they are part of the order history.
 *
 * @package EcoProof_WooCommerce
 */

defined( 'WP_UNINSTALL_PLUGIN' ) || exit;

foreach ( array( 'url', 'place', 'secret', 'api_url', 'paid_statuses', 'email_ids', 'own_email', 'own_subject', 'order_pages', 'builder_summary' ) as $ecoproof_key ) {
	delete_option( 'ecoproof_' . $ecoproof_key );
}
