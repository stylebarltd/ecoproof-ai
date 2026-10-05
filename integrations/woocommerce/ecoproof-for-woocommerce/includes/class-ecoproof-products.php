<?php
/**
 * What each product replaces: the real proof behind a verified purchase.
 *
 * EcoProof's AI reads the product's public details (name, descriptions, attributes such as pack size or number of washes,
 * categories, weight; never prices or customer data) and estimates what ONE unit replaces, e.g. "7 plastic detergent jugs",
 * and the CO2 it saves, with a one-line reason. The shop reviews it on the product (Product data > EcoProof): confirm it,
 * correct it, or mark the product as not an eco product. Orders then use these numbers, and customers see them in their
 * order email, on their stamp and on their Bee Guardian. Until the shop confirms, EcoProof shows them as an estimate.
 *
 * Estimates run in the background (Action Scheduler), when a product is saved with new details and from
 * "Estimate all products" on the settings page, so saving a product never waits for the AI.
 *
 * Translations: a product in another language follows its main-language product (WPML and Polylang are recognised; any
 * other setup can say which product is the main one with the `ecoproof_main_product_id` filter). It isn't estimated itself;
 * orders for it use the main product's numbers, which are edited on the main product.
 *
 * @package EcoProof_WooCommerce
 */

defined( 'ABSPATH' ) || exit;

class EcoProof_Products {

	const META_IMPACT = '_ecoproof_product_impact'; // the latest impact EcoProof returned for the product
	const META_HASH   = '_ecoproof_details_hash';    // the details it was estimated from, to notice changes
	const ESTIMATE    = 'ecoproof_estimate_product';
	const MAX_ROWS    = 4;

	public static function register() {
		add_action( self::ESTIMATE, array( __CLASS__, 'run_estimate' ), 10, 2 );
		if ( ! is_admin() ) {
			return;
		}
		add_filter( 'woocommerce_product_data_tabs', array( __CLASS__, 'tab' ) );
		add_action( 'woocommerce_product_data_panels', array( __CLASS__, 'panel' ) );
		add_action( 'woocommerce_admin_process_product_object', array( __CLASS__, 'save' ) );
		add_filter( 'manage_edit-product_columns', array( __CLASS__, 'column' ), 20 );
		add_action( 'manage_product_posts_custom_column', array( __CLASS__, 'column_value' ), 10, 2 );
		add_action( 'admin_post_ecoproof_estimate_all', array( __CLASS__, 'estimate_all' ) );
	}

	/* ---------------------------------------------------------------- EcoProof requests */

	/** The product's public details, the only thing EcoProof sees of it. */
	public static function details( WC_Product $product ) {
		$attributes = array();
		foreach ( $product->get_attributes() as $attribute ) {
			if ( ! $attribute instanceof WC_Product_Attribute ) {
				continue;
			}
			$values = $attribute->is_taxonomy()
				? wc_get_product_terms( $product->get_id(), $attribute->get_name(), array( 'fields' => 'names' ) )
				: $attribute->get_options();
			$attributes[ wc_attribute_label( $attribute->get_name(), $product ) ] = implode( ', ', array_map( 'strval', (array) $values ) );
		}
		$categories = wp_get_post_terms( $product->get_id(), 'product_cat', array( 'fields' => 'names' ) );
		$text       = fn( $s ) => trim( html_entity_decode( wp_strip_all_tags( (string) $s ), ENT_QUOTES | ENT_HTML5, 'UTF-8' ) ); // WordPress stores "&" as "&amp;"
		return array(
			'id'               => $product->get_id(),
			'name'             => $text( $product->get_name() ),
			'shortDescription' => $text( $product->get_short_description() ),
			'description'      => $text( $product->get_description() ),
			'attributes'       => (object) array_combine( array_map( $text, array_keys( $attributes ) ), array_map( $text, array_values( $attributes ) ) ),
			'categories'       => is_wp_error( $categories ) ? array() : array_map( $text, $categories ),
			'weight'           => $product->get_weight() ? $product->get_weight() . ' ' . get_option( 'woocommerce_weight_unit' ) : '',
		);
	}

	/**
	 * The product whose numbers this one uses: itself, or for a translation its main-language product.
	 * Filter `ecoproof_main_product_id` ( $main_id, WC_Product $product ) for translation setups other than WPML and Polylang.
	 */
	public static function main_id( WC_Product $product ) {
		$id   = $product->get_id();
		$main = $id;
		if ( has_filter( 'wpml_object_id' ) ) {
			$found = apply_filters( 'wpml_object_id', $id, 'product', true, apply_filters( 'wpml_default_language', null ) );
			$main  = $found ? (int) $found : $id;
		} elseif ( function_exists( 'pll_get_post' ) && function_exists( 'pll_default_language' ) ) {
			$found = pll_get_post( $id, pll_default_language() );
			$main  = $found ? (int) $found : $id;
		}
		$main = (int) apply_filters( 'ecoproof_main_product_id', $main, $product );
		return $main > 0 && $main !== $id && wc_get_product( $main ) ? $main : $id;
	}

	/** The stored impact, or an empty array (unset meta comes back as '', and (array) '' is not empty). */
	private static function impact_of( $product ) {
		$impact = $product ? $product->get_meta( self::META_IMPACT ) : '';
		return is_array( $impact ) ? $impact : array();
	}

	private static function hash( array $details ) {
		return md5( wp_json_encode( $details ) );
	}

	/** A signed request to EcoProof's product endpoint. Returns the decoded reply, or a WP_Error. */
	private static function request( array $body, $timeout = 60 ) {
		$response = EcoProof_Orders::signed_post( '/api/woo/products/', wp_json_encode( $body ), $timeout );
		if ( is_wp_error( $response ) ) {
			return $response;
		}
		$code = (int) wp_remote_retrieve_response_code( $response );
		$data = json_decode( wp_remote_retrieve_body( $response ), true );
		if ( $code < 200 || $code >= 300 || ! is_array( $data ) ) {
			/* translators: %d: HTTP status */
			return new WP_Error( 'ecoproof_http', is_array( $data ) && ! empty( $data['error'] ) ? (string) $data['error'] : sprintf( __( 'EcoProof answered HTTP %d', 'ecoproof-for-woocommerce' ), $code ) );
		}
		return $data;
	}

	private static function store( WC_Product $product, array $impact, $hash = null ) {
		$product->update_meta_data( self::META_IMPACT, $impact );
		if ( null !== $hash ) {
			$product->update_meta_data( self::META_HASH, $hash );
		}
		$product->save_meta_data();
	}

	/** Queues an estimate. Several saves in a row queue it once. */
	public static function queue( $product_id, $force = false, $delay = 0 ) {
		if ( function_exists( 'as_has_scheduled_action' ) && as_has_scheduled_action( self::ESTIMATE, array( (int) $product_id, (bool) $force ), 'ecoproof' ) ) {
			return;
		}
		if ( function_exists( 'as_schedule_single_action' ) ) {
			as_schedule_single_action( time() + $delay, self::ESTIMATE, array( (int) $product_id, (bool) $force ), 'ecoproof' );
		}
	}

	/** Action Scheduler: estimate one product (EcoProof answers from its cache when the details haven't changed). */
	public static function run_estimate( $product_id, $force = false ) {
		$product = wc_get_product( $product_id );
		if ( ! $product || ! EcoProof_Config::connected() || $product->get_parent_id() ) {
			return;
		}
		$main = self::main_id( $product );
		if ( $main !== $product->get_id() ) { // a translation: follow the main product, and make sure that one is estimated
			$reply = self::request( array( 'action' => 'follow', 'productId' => $product->get_id(), 'name' => self::details( $product )['name'], 'mainProductId' => $main ), 15 );
			if ( is_wp_error( $reply ) ) {
				throw new Exception( esc_html( $reply->get_error_message() ) );
			}
			self::store( $product, array( 'follows' => $main ), '' );
			if ( ! self::impact_of( wc_get_product( $main ) ) ) {
				self::queue( $main );
			}
			return;
		}
		$details = self::details( $product );
		$reply   = self::request( array( 'action' => 'estimate', 'product' => $details, 'force' => (bool) $force ) );
		if ( is_wp_error( $reply ) ) {
			EcoProof_Orders::log( sprintf( 'Product %d not estimated: %s', $product_id, $reply->get_error_message() ), 'warning' );
			throw new Exception( esc_html( $reply->get_error_message() ) ); // Action Scheduler records the failure; the next save or "Estimate all" tries again
		}
		self::store( $product, (array) $reply['impact'], self::hash( $details ) );
	}

	/* ---------------------------------------------------------------- Product data > EcoProof */

	public static function tab( $tabs ) {
		$tabs['ecoproof'] = array(
			'label'    => __( 'EcoProof', 'ecoproof-for-woocommerce' ),
			'target'   => 'ecoproof_product_data',
			'class'    => array(),
			'priority' => 75,
		);
		return $tabs;
	}

	public static function panel() {
		global $post;
		$product = wc_get_product( $post->ID );
		if ( $product && EcoProof_Config::connected() && self::main_id( $product ) !== $product->get_id() ) {
			self::follower_panel( $product, wc_get_product( self::main_id( $product ) ) );
			return;
		}
		$impact  = self::impact_of( $product );
		$ai      = isset( $impact['ai'] ) && is_array( $impact['ai'] ) ? $impact['ai'] : null;
		$shop    = isset( $impact['shop'] ) && is_array( $impact['shop'] ) ? $impact['shop'] : null;
		$shown   = $shop ? $shop : $ai; // the form starts from the confirmed numbers, else the estimate
		$rows    = $shown && ! empty( $shown['replaces'] ) ? array_values( (array) $shown['replaces'] ) : array();
		wp_nonce_field( 'ecoproof_product', 'ecoproof_product_nonce' );
		?>
		<div id="ecoproof_product_data" class="panel woocommerce_options_panel" style="padding:0 12px 12px">
			<p><?php esc_html_e( 'What one unit of this product replaces. Customers see it in their order email, on their verified stamp and on their Bee Guardian.', 'ecoproof-for-woocommerce' ); ?></p>
			<?php if ( ! EcoProof_Config::connected() ) : ?>
				<p><em><?php esc_html_e( 'Connect EcoProof first (WooCommerce > Settings > EcoProof).', 'ecoproof-for-woocommerce' ); ?></em></p>
			<?php elseif ( ! $ai && ! $shop ) : ?>
				<p><em><?php esc_html_e( 'No estimate yet. Save the product and EcoProof\'s AI estimates it in the background (about a minute).', 'ecoproof-for-woocommerce' ); ?></em></p>
			<?php else : ?>
				<p>
					<strong><?php echo $shop ? esc_html__( 'Confirmed by you', 'ecoproof-for-woocommerce' ) : esc_html__( 'AI estimate, not confirmed yet', 'ecoproof-for-woocommerce' ); ?></strong>
					<?php if ( $ai ) : ?>
						<br><?php esc_html_e( 'AI estimate:', 'ecoproof-for-woocommerce' ); ?> <?php echo esc_html( self::summary( $ai ) ); ?>
						<?php if ( ! empty( $ai['reason'] ) ) : ?>
							<br><em><?php echo esc_html( $ai['reason'] ); ?></em>
						<?php endif; ?>
					<?php endif; ?>
				</p>
			<?php endif; ?>

			<?php if ( EcoProof_Config::connected() && ( $ai || $shop ) ) : ?>
				<table class="widefat striped" style="max-width:640px;margin:8px 0">
					<thead><tr>
						<th style="width:90px"><?php esc_html_e( 'How many', 'ecoproof-for-woocommerce' ); ?></th>
						<th><?php esc_html_e( 'Item (one)', 'ecoproof-for-woocommerce' ); ?></th>
						<th><?php esc_html_e( 'Items (many)', 'ecoproof-for-woocommerce' ); ?></th>
					</tr></thead>
					<tbody>
					<?php for ( $i = 0; $i < self::MAX_ROWS; $i++ ) : $r = $rows[ $i ] ?? array( 'count' => '', 'one' => '', 'many' => '' ); ?>
						<tr>
							<td><input type="number" min="0" max="1000" step="1" name="ecoproof_rows[<?php echo (int) $i; ?>][count]" value="<?php echo esc_attr( $r['count'] ); ?>" style="width:80px"></td>
							<td><input type="text" maxlength="60" name="ecoproof_rows[<?php echo (int) $i; ?>][one]" value="<?php echo esc_attr( $r['one'] ); ?>" placeholder="<?php esc_attr_e( 'plastic detergent jug', 'ecoproof-for-woocommerce' ); ?>" style="width:100%"></td>
							<td><input type="text" maxlength="60" name="ecoproof_rows[<?php echo (int) $i; ?>][many]" value="<?php echo esc_attr( $r['many'] ); ?>" placeholder="<?php esc_attr_e( 'plastic detergent jugs', 'ecoproof-for-woocommerce' ); ?>" style="width:100%"></td>
						</tr>
					<?php endfor; ?>
					</tbody>
				</table>
				<?php
				woocommerce_wp_text_input(
					array(
						'id'                => 'ecoproof_co2',
						'label'             => __( 'CO₂ saved per unit (kg)', 'ecoproof-for-woocommerce' ),
						'type'              => 'number',
						'value'             => $shown ? (string) ( $shown['co2PerUnit'] ?? '' ) : '',
						'custom_attributes' => array( 'step' => '0.01', 'min' => '0', 'max' => '30' ),
					)
				);
				woocommerce_wp_checkbox(
					array(
						'id'          => 'ecoproof_excluded',
						'label'       => __( 'Not an eco product', 'ecoproof-for-woocommerce' ),
						'description' => __( 'It doesn\'t replace anything disposable: orders don\'t count it.', 'ecoproof-for-woocommerce' ),
						'value'       => $shown && ! empty( $shown['excluded'] ) ? 'yes' : 'no',
					)
				);
				woocommerce_wp_checkbox(
					array(
						'id'          => 'ecoproof_confirm',
						'label'       => __( 'Confirm these numbers', 'ecoproof-for-woocommerce' ),
						'description' => __( 'They are right for this product. Untick to go back to the AI estimate.', 'ecoproof-for-woocommerce' ),
						'value'       => $shop ? 'yes' : 'no',
					)
				);
				?>
				<input type="hidden" name="ecoproof_category" value="<?php echo esc_attr( $shown['category'] ?? '' ); ?>">
			<?php endif; ?>
			<?php if ( EcoProof_Config::connected() ) : ?>
				<?php
				woocommerce_wp_checkbox(
					array(
						'id'          => 'ecoproof_reestimate',
						'label'       => __( 'New AI estimate', 'ecoproof-for-woocommerce' ),
						'description' => __( 'Ask the AI again when you save (in the background).', 'ecoproof-for-woocommerce' ),
						'value'       => 'no',
					)
				);
				?>
			<?php endif; ?>
		</div>
		<?php
	}

	/** A translation's tab: the main product's numbers, read-only, with a link to edit them there. */
	private static function follower_panel( WC_Product $product, WC_Product $main ) {
		$impact  = self::impact_of( $main );
		$numbers = ! empty( $impact['shop'] ) ? $impact['shop'] : ( $impact['ai'] ?? null );
		?>
		<div id="ecoproof_product_data" class="panel woocommerce_options_panel" style="padding:0 12px 12px">
			<p>
				<?php
				printf(
					/* translators: %s: link to the main-language product */
					esc_html__( 'This is a translation. It uses the numbers of %s, the product in your main language. Edit them there.', 'ecoproof-for-woocommerce' ),
					'<a href="' . esc_url( get_edit_post_link( $main->get_id() ) ) . '">' . esc_html( $main->get_name() ) . '</a>'
				);
				?>
			</p>
			<p><strong><?php echo $numbers ? esc_html( ! empty( $impact['shop'] ) ? __( 'Confirmed', 'ecoproof-for-woocommerce' ) : __( 'AI estimate, not confirmed yet', 'ecoproof-for-woocommerce' ) ) : esc_html__( 'Not estimated yet', 'ecoproof-for-woocommerce' ); ?></strong>
			<?php if ( $numbers ) : ?><br><?php echo esc_html( self::summary( $numbers ) ); ?><?php endif; ?></p>
		</div>
		<?php
	}

	/** Saving the product: confirm/withdraw the shop's numbers, and queue an estimate when it's new or its details changed. */
	public static function save( WC_Product $product ) {
		if ( ! EcoProof_Config::connected() || ! isset( $_POST['ecoproof_product_nonce'] ) || ! wp_verify_nonce( sanitize_key( wp_unslash( $_POST['ecoproof_product_nonce'] ) ), 'ecoproof_product' ) ) {
			return;
		}
		$main = self::main_id( $product );
		if ( $main !== $product->get_id() ) {
			if ( (int) ( self::impact_of( $product )['follows'] ?? 0 ) !== $main ) {
				self::queue( $product->get_id() );
			}
			return;
		}
		$impact     = self::impact_of( $product );
		$was_shop   = ! empty( $impact['shop'] );
		$confirm    = isset( $_POST['ecoproof_confirm'] );
		$has_fields = isset( $_POST['ecoproof_category'] );

		if ( $has_fields && ( $confirm || $was_shop ) ) {
			$numbers = null;
			if ( $confirm ) {
				$rows = array();
				foreach ( (array) wp_unslash( $_POST['ecoproof_rows'] ?? array() ) as $row ) { // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- each field is sanitised below
					$count = absint( $row['count'] ?? 0 );
					$one   = sanitize_text_field( (string) ( $row['one'] ?? '' ) );
					$many  = sanitize_text_field( (string) ( $row['many'] ?? '' ) );
					if ( $count > 0 && '' !== $one && '' !== $many ) {
						$rows[] = array( 'count' => $count, 'one' => $one, 'many' => $many );
					}
				}
				$numbers = array(
					'category'   => sanitize_key( wp_unslash( $_POST['ecoproof_category'] ) ),
					'replaces'   => $rows,
					'co2PerUnit' => (float) wc_format_decimal( sanitize_text_field( wp_unslash( $_POST['ecoproof_co2'] ?? '0' ) ) ),
					'excluded'   => isset( $_POST['ecoproof_excluded'] ),
				);
			}
			$reply = self::request( array( 'action' => 'confirm', 'productId' => $product->get_id(), 'name' => $product->get_name(), 'numbers' => $numbers ), 15 );
			if ( is_wp_error( $reply ) ) {
				WC_Admin_Meta_Boxes::add_error( __( 'EcoProof could not save the confirmed numbers:', 'ecoproof-for-woocommerce' ) . ' ' . $reply->get_error_message() );
			} else {
				$product->update_meta_data( self::META_IMPACT, (array) $reply['impact'] );
			}
		}

		$force = isset( $_POST['ecoproof_reestimate'] );
		if ( $force || ! $impact || self::hash( self::details( $product ) ) !== $product->get_meta( self::META_HASH ) ) {
			self::queue( $product->get_id(), $force );
		}
	}

	/* ---------------------------------------------------------------- Products list column */

	public static function column( $columns ) {
		$columns['ecoproof'] = __( 'EcoProof', 'ecoproof-for-woocommerce' );
		return $columns;
	}

	public static function column_value( $column, $post_id ) {
		if ( 'ecoproof' !== $column ) {
			return;
		}
		$product = wc_get_product( $post_id );
		$impact  = self::impact_of( $product );
		if ( ! empty( $impact['follows'] ) && ( $main = wc_get_product( (int) $impact['follows'] ) ) ) {
			/* translators: %s: main-language product name */
			echo '<span style="color:#666">' . esc_html( sprintf( __( 'Uses %s', 'ecoproof-for-woocommerce' ), $main->get_name() ) ) . '</span><br>';
			$impact = self::impact_of( $main );
		}
		$numbers = ! empty( $impact['shop'] ) ? $impact['shop'] : ( $impact['ai'] ?? null );
		if ( ! $numbers ) {
			echo '<span style="color:#888">' . esc_html__( 'Not estimated yet', 'ecoproof-for-woocommerce' ) . '</span>';
			return;
		}
		$badge = ! empty( $impact['shop'] ) ? array( '#1d6b2f', __( 'Confirmed', 'ecoproof-for-woocommerce' ) ) : array( '#a86f00', __( 'AI estimate', 'ecoproof-for-woocommerce' ) );
		printf( '<span style="color:%s;font-weight:600">%s</span><br>%s', esc_attr( $badge[0] ), esc_html( $badge[1] ), esc_html( self::summary( $numbers ) ) );
	}

	/** "7 plastic detergent jugs, 300 disposable dryer sheets · 3.8 kg CO₂" per unit, or "Not counted". */
	public static function summary( array $n ) {
		if ( ! empty( $n['excluded'] ) ) {
			return __( 'Not counted (not an eco product)', 'ecoproof-for-woocommerce' );
		}
		$parts = array_map( fn( $r ) => (int) $r['count'] . ' ' . ( 1 === (int) $r['count'] ? $r['one'] : $r['many'] ), (array) ( $n['replaces'] ?? array() ) );
		$text  = $parts ? implode( ', ', $parts ) : __( 'nothing replaced', 'ecoproof-for-woocommerce' );
		return ! empty( $n['co2PerUnit'] ) ? $text . ' · ' . wc_format_decimal( $n['co2PerUnit'], 2 ) . ' kg CO₂' : $text;
	}

	/* ---------------------------------------------------------------- Estimate all products */

	/** Counts for the settings page: products, estimated, confirmed. */
	public static function counts() {
		$ids       = self::product_ids();
		$estimated = 0;
		$confirmed = 0;
		foreach ( $ids as $id ) {
			$impact = get_post_meta( $id, self::META_IMPACT, true );
			$impact = is_array( $impact ) ? $impact : array();
			if ( ! empty( $impact['follows'] ) ) {
				$impact = get_post_meta( (int) $impact['follows'], self::META_IMPACT, true );
				$impact = is_array( $impact ) ? $impact : array();
			}
			if ( ! empty( $impact['shop'] ) ) {
				++$confirmed;
			}
			if ( ! empty( $impact['ai'] ) || ! empty( $impact['shop'] ) ) {
				++$estimated;
			}
		}
		return array( 'products' => count( $ids ), 'estimated' => $estimated, 'confirmed' => $confirmed );
	}

	private static function product_ids() {
		return wc_get_products( array( 'status' => array( 'publish', 'private' ), 'limit' => -1, 'return' => 'ids', 'type' => array_keys( wc_get_product_types() ) ) );
	}

	/** admin-post: queue an estimate for every product, a few seconds apart (each one is an AI call). */
	public static function estimate_all() {
		if ( ! current_user_can( 'manage_woocommerce' ) ) {
			wp_die( esc_html__( 'Sorry, you are not allowed to do that.', 'ecoproof-for-woocommerce' ) );
		}
		check_admin_referer( 'ecoproof_estimate_all' );
		$queued = 0;
		foreach ( self::product_ids() as $i => $id ) {
			self::queue( $id, false, $i * 4 );
			++$queued;
		}
		/* translators: %d: number of products */
		set_transient( 'ecoproof_test_' . get_current_user_id(), array( 'success', sprintf( __( 'Estimating %d products in the background. Each takes a few seconds; refresh this page or the Products list to see them arrive.', 'ecoproof-for-woocommerce' ), $queued ) ), 60 );
		wp_safe_redirect( admin_url( 'admin.php?page=wc-settings&tab=ecoproof' ) );
		exit;
	}
}
