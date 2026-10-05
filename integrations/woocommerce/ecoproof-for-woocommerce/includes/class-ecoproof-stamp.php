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

	/** The shop's name in the explainer ("SuperBee is part of EcoProof"). */
	private static function shop_name() {
		/** Filters the shop name used in the stamp block. */
		return (string) apply_filters( 'ecoproof_shop_name', wp_specialchars_decode( get_bloginfo( 'name' ), ENT_QUOTES ) );
	}

	/**
	 * "Your order replaces about 7 plastic detergent jugs and saves about 3 kg of CO₂." from the numbers EcoProof
	 * sent back for this order (stored when the order was sent), or '' when there are none.
	 */
	public static function impact_sentence( WC_Order $order ) {
		$impact   = (array) $order->get_meta( EcoProof_Orders::META_IMPACT );
		$replaces = (string) ( $impact['replaces'] ?? '' );
		$plastic  = (int) ( $impact['plastic_items'] ?? 0 );
		$co2      = (float) ( $impact['co2_kg'] ?? 0 );
		$co2_txt  = wc_format_decimal( $co2, 1 );
		// What the products replace, by name: the shop's confirmed numbers or EcoProof's estimate for each product.
		if ( '' !== $replaces && $co2 > 0 ) {
			/* translators: 1: what the order replaces, e.g. "7 plastic detergent jugs", 2: kilograms of CO2 */
			return sprintf( __( 'Your order replaces about %1$s. It saves about %2$s kg of CO₂.', 'ecoproof-for-woocommerce' ), $replaces, $co2_txt );
		}
		if ( '' !== $replaces ) {
			/* translators: %s: what the order replaces, e.g. "7 plastic detergent jugs" */
			return sprintf( __( 'Your order replaces about %s.', 'ecoproof-for-woocommerce' ), $replaces );
		}
		if ( $plastic > 0 && $co2 > 0 ) {
			/* translators: 1: number of single-use plastic items, 2: kilograms of CO2 */
			return sprintf( _n( 'Your order avoids about %1$d single-use plastic and %2$s kg of CO₂.', 'Your order avoids about %1$d single-use plastics and %2$s kg of CO₂.', $plastic, 'ecoproof-for-woocommerce' ), $plastic, $co2_txt );
		}
		if ( $co2 > 0 ) {
			/* translators: %s: kilograms of CO2 */
			return sprintf( __( 'Your order saves about %s kg of CO₂.', 'ecoproof-for-woocommerce' ), $co2_txt );
		}
		return '';
	}

	/**
	 * The stamp block for emails and the order pages. The customer has usually never heard of EcoProof, so it says what it
	 * is, what they get and what to do, in that order. Table layout and inline styles only (email clients), max 600px,
	 * and it still makes sense with images blocked (the bee and the QR carry no information of their own).
	 */
	public static function html( WC_Order $order ) {
		$app     = EcoProof_Config::url();
		$impact  = self::impact_sentence( $order );
		$prove   = __( 'Now you can prove it.', 'ecoproof-for-woocommerce' );
		$bullets = array(
			__( 'Your own eco passport with stamps from the eco brands and cafés you support', 'ecoproof-for-woocommerce' ),
			__( 'Bee Guardian collectibles: unlock your first one with this purchase (free wallet sign-in to claim), then rank up from Sentinel to Paragon', 'ecoproof-for-woocommerce' ),
			__( 'A shareable card to show friends you don’t just talk eco, you have proof', 'ecoproof-for-woocommerce' ),
		);
		$font  = "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;";
		$ink   = 'color:#272e1b;';
		$muted = 'color:#56633f;';

		$rows = '';
		foreach ( $bullets as $b ) {
			$rows .= '<tr><td valign="top" width="22" style="' . $font . 'padding:0 0 8px;font-size:15px;line-height:22px;color:#a86f00;font-weight:bold">&#10003;</td>'
				. '<td valign="top" style="' . $font . $ink . 'padding:0 0 8px;font-size:14px;line-height:21px">' . esc_html( $b ) . '</td></tr>';
		}

		$html = '<table role="presentation" class="ecoproof-stamp" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;margin:24px auto;border-collapse:separate">'
			. '<tr><td bgcolor="#f0fae1" style="background:#f0fae1;border-radius:16px;padding:24px 22px;text-align:center">'

			// 1. Bee Guardian
			. '<img src="' . esc_url( $app . '/nft/web/sentinel.png' ) . '" width="120" height="120" alt="' . esc_attr__( 'EcoProof Bee Guardian', 'ecoproof-for-woocommerce' ) . '" style="display:block;margin:0 auto 10px;width:120px;height:120px;border:0;' . $font . 'font-size:12px;' . $muted . '">'

			// 2–3. Headline and this order's impact
			. '<h2 style="' . $font . $ink . 'margin:0 0 6px;font-size:21px;line-height:28px;font-weight:bold">' . esc_html__( 'You just did something good for the planet 🌍', 'ecoproof-for-woocommerce' ) . '</h2>'
			. '<p style="' . $font . $ink . 'margin:0 0 18px;font-size:15px;line-height:22px">' . esc_html( trim( $impact . ' ' . $prove ) ) . '</p>'

			// 4–5. What it is
			. '<h3 style="' . $font . $ink . 'margin:0 0 6px;font-size:18px;line-height:24px;font-weight:bold">' . esc_html__( 'Collect your free eco stamp', 'ecoproof-for-woocommerce' ) . '</h3>'
			/* translators: %s: shop name */
			. '<p style="' . $font . $muted . 'margin:0 0 16px;font-size:14px;line-height:21px">' . esc_html( sprintf( __( '%s is part of EcoProof, a digital eco passport. Every sustainable purchase you make earns a stamp, verified so nobody can fake it.', 'ecoproof-for-woocommerce' ), self::shop_name() ) ) . '</p>'

			// 6. What you get
			. '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:440px;margin:0 auto 18px;text-align:left">'
			. '<tr><td colspan="2" style="' . $font . $ink . 'padding:0 0 8px;font-size:14px;line-height:20px;font-weight:bold">' . esc_html__( 'What you get', 'ecoproof-for-woocommerce' ) . '</td></tr>'
			. $rows . '</table>'

			// 7–8. What to do
			. '<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto"><tr>'
			. '<td bgcolor="#e8a317" style="background:#e8a317;border-radius:999px;text-align:center">'
			. '<a href="' . esc_url( self::claim_url( $order ) ) . '" style="' . $font . 'display:inline-block;padding:13px 26px;font-size:16px;line-height:20px;font-weight:bold;color:#201e1d;text-decoration:none;border-radius:999px">' . esc_html__( 'Collect my stamp', 'ecoproof-for-woocommerce' ) . '</a>'
			. '</td></tr></table>'
			. '<p style="' . $font . $muted . 'margin:8px 0 20px;font-size:13px;line-height:18px">' . esc_html__( 'Takes 10 seconds. No app to download.', 'ecoproof-for-woocommerce' ) . '</p>'

			// 9. QR for desktop readers
			. '<p style="' . $font . $muted . 'margin:0 0 8px;font-size:13px;line-height:18px">' . esc_html__( 'On your computer? Scan this with your phone.', 'ecoproof-for-woocommerce' ) . '</p>'
			. '<img src="' . esc_url( self::qr_url( $order ) ) . '" width="140" height="140" alt="' . esc_attr__( 'QR code to collect your eco stamp', 'ecoproof-for-woocommerce' ) . '" style="display:block;margin:0 auto 18px;width:140px;height:140px;border:0;border-radius:10px;' . $font . 'font-size:12px;' . $muted . '">'

			// 10. Footnote
			. '<p style="' . $font . 'margin:0;font-size:12px;line-height:17px;color:#7a7f72">' . esc_html__( 'Stamps are recorded on the Solana blockchain so they can’t be faked.', 'ecoproof-for-woocommerce' )
			. ' <a href="' . esc_url( $app . '/about' ) . '" style="color:#56633f;text-decoration:underline">' . esc_html__( 'Learn more about EcoProof', 'ecoproof-for-woocommerce' ) . '</a></p>'

			. '</td></tr></table>';

		/** Filters the stamp block HTML (emails, order pages, shortcode). */
		return apply_filters( 'ecoproof_stamp_html', $html, $order );
	}

	public static function plain( WC_Order $order ) {
		$lines = array(
			'',
			__( 'You just did something good for the planet', 'ecoproof-for-woocommerce' ),
			trim( self::impact_sentence( $order ) . ' ' . __( 'Now you can prove it.', 'ecoproof-for-woocommerce' ) ),
			'',
			/* translators: %s: shop name */
			sprintf( __( 'Collect your free eco stamp: %s is part of EcoProof, a digital eco passport. Every sustainable purchase earns a stamp, verified so nobody can fake it.', 'ecoproof-for-woocommerce' ), self::shop_name() ),
			/* translators: %s: claim link */
			sprintf( __( 'Collect my stamp (10 seconds, no app): %s', 'ecoproof-for-woocommerce' ), self::claim_url( $order ) ),
			/* translators: %s: link */
			sprintf( __( 'Learn more about EcoProof: %s', 'ecoproof-for-woocommerce' ), EcoProof_Config::url() . '/about' ),
			'',
		);
		return implode( "\n", $lines );
	}
}
