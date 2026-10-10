<?php
/**
 * WooCommerce > Settings > EcoProof.
 *
 * Connection (place id, secret), which statuses mean "paid",
 * and where the stamp shows. Fields set by a wp-config.php constant are
 * locked. "Test connection" sends a signed ping, so a wrong secret or place
 * shows up here instead of in a customer's inbox.
 *
 * @package EcoProof_WooCommerce
 */

defined( 'ABSPATH' ) || exit;

class EcoProof_Settings {

	const TAB = 'ecoproof';

	public static function register() {
		add_filter( 'woocommerce_settings_tabs_array', array( __CLASS__, 'add_tab' ), 50 );
		add_action( 'woocommerce_settings_' . self::TAB, array( __CLASS__, 'output' ) );
		add_action( 'woocommerce_update_options_' . self::TAB, array( __CLASS__, 'save' ) );
		add_action( 'admin_post_ecoproof_test', array( __CLASS__, 'test_connection' ) );
		add_action( 'admin_notices', array( __CLASS__, 'notices' ) );
	}

	public static function add_tab( $tabs ) {
		$tabs[ self::TAB ] = __( 'EcoProof', 'ecoproof-for-woocommerce' );
		return $tabs;
	}

	private static function fields() {
		$p        = EcoProof_Config::OPTION_PREFIX;
		$locked   = fn( $key ) => EcoProof_Config::locked( $key ) ? array( 'disabled' => 'disabled' ) : array();
		$from_cfg = fn( $key, $desc ) => EcoProof_Config::locked( $key )
			/* translators: %s: constant name */
			? sprintf( __( 'Set by the %s setting in your site\'s configuration (wp-config.php or the server environment). Remove it there to edit this field.', 'ecoproof-for-woocommerce' ), '<code>' . EcoProof_Config::CONSTANTS[ $key ] . '</code>' )
			: $desc;

		$statuses = array();
		foreach ( wc_get_order_statuses() as $key => $label ) {
			$statuses[ preg_replace( '/^wc-/', '', $key ) ] = $label;
		}
		$emails = array();
		foreach ( WC()->mailer()->get_emails() as $email ) {
			if ( $email->is_customer_email() ) {
				$emails[ $email->id ] = $email->get_title();
			}
		}

		return array(
			array(
				'title' => __( 'Connection', 'ecoproof-for-woocommerce' ),
				'type'  => 'title',
				'desc'  => __( 'Your shop\'s place on EcoProof. You get the place id and secret from EcoProof when your shop joins.', 'ecoproof-for-woocommerce' ),
				'id'    => 'ecoproof_connection',
			),
			array(
				'title'             => __( 'Place id', 'ecoproof-for-woocommerce' ),
				'id'                => $p . 'place',
				'type'              => 'text',
				'value'             => EcoProof_Config::get( 'place' ),
				'desc'              => $from_cfg( 'place', '' ),
				'custom_attributes' => $locked( 'place' ),
			),
			array(
				'title'             => __( 'Secret', 'ecoproof-for-woocommerce' ),
				'id'                => $p . 'secret',
				'type'              => 'password',
				'value'             => EcoProof_Config::locked( 'secret' ) ? '••••••••' : EcoProof_Config::get( 'secret' ),
				'desc'              => $from_cfg( 'secret', __( 'Signs every order you send and every claim link. Keep it private.', 'ecoproof-for-woocommerce' ) ),
				'custom_attributes' => $locked( 'secret' ) + array( 'autocomplete' => 'new-password' ),
			),
			array(
				'type' => 'sectionend',
				'id'   => 'ecoproof_connection',
			),
			array(
				'title' => __( 'Orders', 'ecoproof-for-woocommerce' ),
				'type'  => 'title',
				'desc'  => __( 'An order earns its stamp when it reaches one of these statuses. Only product names, quantities and ids are sent to EcoProof, never customer details or prices. Refunded, cancelled or failed orders void a stamp that hasn\'t been collected.', 'ecoproof-for-woocommerce' ),
				'id'    => 'ecoproof_orders',
			),
			array(
				'title'   => __( 'Paid statuses', 'ecoproof-for-woocommerce' ),
				'id'      => $p . 'paid_statuses',
				'type'    => 'multiselect',
				'class'   => 'wc-enhanced-select',
				'options' => $statuses,
				'default' => EcoProof_Config::DEFAULTS['paid_statuses'],
			),
			array(
				'type' => 'sectionend',
				'id'   => 'ecoproof_orders',
			),
			array(
				'title' => __( 'Where customers see their stamp', 'ecoproof-for-woocommerce' ),
				'type'  => 'title',
				/* translators: %s: shortcode */
				'desc'  => sprintf( __( 'Using FunnelKit? Its emails replace WooCommerce\'s: the stamp appears below the Order Summary block automatically (see "Email builders"), or place it yourself with the %s shortcode in an HTML or Text block. In other builders, pass the order: <code>[ecoproof_stamp order_id="…"]</code>, or turn on the separate email.', 'ecoproof-for-woocommerce' ), '<code>[ecoproof_stamp]</code>' ),
				'id'    => 'ecoproof_display',
			),
			array(
				'title'   => __( 'In WooCommerce emails', 'ecoproof-for-woocommerce' ),
				'id'      => $p . 'email_ids',
				'type'    => 'multiselect',
				'class'   => 'wc-enhanced-select',
				'options' => $emails,
				'default' => EcoProof_Config::DEFAULTS['email_ids'],
				'desc'    => __( 'The block is added to these emails when the order is paid.', 'ecoproof-for-woocommerce' ),
			),
			array(
				'title'   => __( 'Email builders', 'ecoproof-for-woocommerce' ),
				'id'      => $p . 'builder_summary',
				'type'    => 'checkbox',
				'default' => EcoProof_Config::DEFAULTS['builder_summary'],
				'desc'    => __( 'Add the stamp below the order summary in email builders that use WooCommerce\'s email hooks (FunnelKit\'s Order Summary block). Shown only once the order is paid.', 'ecoproof-for-woocommerce' ),
			),
			array(
				'title'   => __( 'Separate email', 'ecoproof-for-woocommerce' ),
				'id'      => $p . 'own_email',
				'type'    => 'checkbox',
				'default' => EcoProof_Config::DEFAULTS['own_email'],
				'desc'    => __( 'Also send a short "Collect your eco stamp" email when the order is paid (once per order)', 'ecoproof-for-woocommerce' ),
			),
			array(
				'title'   => __( 'Separate email subject', 'ecoproof-for-woocommerce' ),
				'id'      => $p . 'own_subject',
				'type'    => 'text',
				'default' => EcoProof_Config::DEFAULTS['own_subject'],
			),
			array(
				'title'   => __( 'Order pages', 'ecoproof-for-woocommerce' ),
				'id'      => $p . 'order_pages',
				'type'    => 'checkbox',
				'default' => EcoProof_Config::DEFAULTS['order_pages'],
				'desc'    => __( 'Show the stamp on the order-received page and on the order in My account', 'ecoproof-for-woocommerce' ),
			),
			array(
				'type' => 'sectionend',
				'id'   => 'ecoproof_display',
			),
		);
	}

	public static function output() {
		WC_Admin_Settings::output_fields( self::fields() );
		if ( EcoProof_Config::connected() ) {
			$c   = EcoProof_Products::counts();
			$all = wp_nonce_url( admin_url( 'admin-post.php?action=ecoproof_estimate_all' ), 'ecoproof_estimate_all' );
			echo '<h2>' . esc_html__( 'What your products replace', 'ecoproof-for-woocommerce' ) . '</h2>';
			echo '<p>' . esc_html__( 'EcoProof\'s AI estimates what one unit of each product replaces (for example "7 plastic detergent jugs") from its name, description and attributes. Review each one on the product (Product data > EcoProof): confirm it or correct it. Until you confirm, customers see it as an estimate.', 'ecoproof-for-woocommerce' ) . '</p>';
			/* translators: 1: products, 2: estimated, 3: confirmed */
			echo '<p><strong>' . esc_html( sprintf( __( '%1$d products · %2$d estimated · %3$d confirmed', 'ecoproof-for-woocommerce' ), $c['products'], $c['estimated'], $c['confirmed'] ) ) . '</strong> · <a href="' . esc_url( admin_url( 'edit.php?post_type=product' ) ) . '">' . esc_html__( 'Review in the Products list', 'ecoproof-for-woocommerce' ) . '</a></p>';
			echo '<p><a class="button" href="' . esc_url( $all ) . '">' . esc_html__( 'Estimate all products', 'ecoproof-for-woocommerce' ) . '</a> ';
			esc_html_e( 'Runs in the background, a few seconds per product. Products already estimated are only redone when their details changed.', 'ecoproof-for-woocommerce' );
			echo '</p>';
		}
		if ( EcoProof_Config::connected() ) {
			$url = wp_nonce_url( admin_url( 'admin-post.php?action=ecoproof_test' ), 'ecoproof_test' );
			echo '<p><a class="button" href="' . esc_url( $url ) . '">' . esc_html__( 'Test connection', 'ecoproof-for-woocommerce' ) . '</a> ';
			esc_html_e( 'Sends a signed test message to EcoProof (save your changes first).', 'ecoproof-for-woocommerce' );
			echo '</p>';
		}
	}

	public static function save() {
		$fields = array_filter( self::fields(), fn( $f ) => isset( $f['id'] ) && empty( $f['custom_attributes']['disabled'] ) && ! in_array( $f['type'], array( 'title', 'sectionend' ), true ) );
		WC_Admin_Settings::save_fields( $fields );
	}

	/** Sends a signed, non-order message: EcoProof answers 200 only if the place exists and the signature is right. */
	public static function test_connection() {
		if ( ! current_user_can( 'manage_woocommerce' ) ) {
			wp_die( esc_html__( 'Sorry, you are not allowed to do that.', 'ecoproof-for-woocommerce' ) );
		}
		check_admin_referer( 'ecoproof_test' );

		$response = EcoProof_Orders::post( 'ecoproof-connection-test' );
		$code     = is_wp_error( $response ) ? 0 : (int) wp_remote_retrieve_response_code( $response );
		if ( 200 === $code ) {
			$result = array( 'success', __( 'EcoProof is connected: the place and secret are right.', 'ecoproof-for-woocommerce' ) );
		} elseif ( 401 === $code ) {
			$result = array( 'error', __( 'EcoProof refused the secret. Check that it matches your place.', 'ecoproof-for-woocommerce' ) );
		} elseif ( 404 === $code ) {
			$result = array( 'error', __( 'EcoProof doesn\'t know this place id.', 'ecoproof-for-woocommerce' ) );
		} else {
			/* translators: %s: error message or HTTP status */
			$result = array( 'error', sprintf( __( 'Could not reach EcoProof (%s).', 'ecoproof-for-woocommerce' ), is_wp_error( $response ) ? $response->get_error_message() : 'HTTP ' . $code ) );
		}
		set_transient( 'ecoproof_test_' . get_current_user_id(), $result, 60 );
		wp_safe_redirect( admin_url( 'admin.php?page=wc-settings&tab=' . self::TAB ) );
		exit;
	}

	public static function notices() {
		$key    = 'ecoproof_test_' . get_current_user_id();
		$result = get_transient( $key );
		if ( $result ) {
			delete_transient( $key );
			printf( '<div class="notice notice-%s is-dismissible"><p>%s</p></div>', esc_attr( $result[0] ), esc_html( $result[1] ) );
		}
		$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
		if ( ! EcoProof_Config::connected() && $screen && 'plugins' === $screen->id && current_user_can( 'manage_woocommerce' ) ) {
			printf(
				'<div class="notice notice-info"><p>%s <a href="%s">%s</a></p></div>',
				esc_html__( 'EcoProof for WooCommerce is installed but not connected yet.', 'ecoproof-for-woocommerce' ),
				esc_url( admin_url( 'admin.php?page=wc-settings&tab=' . self::TAB ) ),
				esc_html__( 'Connect your shop', 'ecoproof-for-woocommerce' )
			);
		}
	}
}
