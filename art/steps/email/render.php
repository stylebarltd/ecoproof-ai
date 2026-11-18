<?php
// Renders the plugin's own stamp block (EcoProof_Stamp::html, the part of the order email with the Bee Guardian and the QR) outside
// WordPress, for the landing's "QR in your order email" picture. Usage: php render.php > email.html, then a headless-browser screenshot
// (see CLAUDE.md). The bee and the QR are local files; the order is one reusable wrap (150 g plastic, 450 g CO2 in the factor table).
define( 'ABSPATH', __DIR__ );
function __( $s ) { return $s; }
function esc_html__( $s ) { return htmlspecialchars( $s, ENT_QUOTES ); }
function esc_attr__( $s ) { return htmlspecialchars( $s, ENT_QUOTES ); }
function esc_html( $s ) { return htmlspecialchars( $s, ENT_QUOTES ); }
function esc_url( $s ) { return $s; }
function apply_filters( $tag, $v ) { return $v; }
function get_bloginfo() { return 'Demo Eco Shop'; }
function wp_specialchars_decode( $s ) { return $s; }
function wc_format_decimal( $n, $dp ) { return number_format( $n, $dp, '.', '' ); }
function wc_format_localized_decimal( $s ) { return $s; }
class WC_Order { public function get_id() { return 1042; } public function get_meta() { return array( 'plastic_g' => 150, 'co2_g' => 450 ); } }
class EcoProof_Orders { const META_IMPACT = '_ecoproof_impact'; }
class EcoProof_Config { static function url() { return 'https://ecoproof.app'; } static function place() { return 'demo-eco-shop'; } static function secret() { return 'x'; } }
require __DIR__ . '/../../../integrations/woocommerce/ecoproof-for-woocommerce/includes/class-ecoproof-stamp.php';
$html = EcoProof_Stamp::html( new WC_Order() );
$html = str_replace( 'https://ecoproof.app/nft/web/sentinel.png', '../../../public/nft/web/sentinel.png', $html );
$html = preg_replace( '#https://ecoproof\.app/api/woo/qr/[^"]+#', '../../postcard/qr.png', $html );
echo '<!doctype html><meta charset="utf-8"><body style="margin:0;background:#fff;width:520px"><div style="padding:0 16px">'
	. '<p style="font:14px/21px -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#555;margin:18px 0 0">Demo Eco Shop · Your order #1042 is complete</p>'
	. $html . '</div></body>';
