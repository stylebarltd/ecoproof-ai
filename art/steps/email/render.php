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
if ( ( $argv[1] ?? '' ) !== 'client' ) {
	echo '<!doctype html><meta charset="utf-8"><body style="margin:0;background:#fff;width:520px"><div style="padding:0 16px">'
		. '<p style="font:14px/21px -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#555;margin:18px 0 0">Demo Eco Shop · Your order #1042 is complete</p>'
		. $html . '</div></body>';
	exit;
}
// `php render.php client > client.html`: the same block inside a plain mail window (no real mail product's look), 1000 x 1000, for the
// landing's square picture. Screenshot it with a headless browser at window size 1000,1000.
$f = "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;";
$row = function ( $from, $subject, $time, $on = false ) use ( $f ) {
	return '<div style="padding:12px 14px;border-bottom:1px solid #ece6dc;' . ( $on ? 'background:#fff6e4;border-left:4px solid #e8a317;padding-left:10px' : '' ) . '">'
		. '<div style="display:flex;justify-content:space-between;' . $f . 'font-size:14px;font-weight:700;color:#2b2622"><span>' . $from . '</span><span style="font-weight:400;color:#8a8076;font-size:12px">' . $time . '</span></div>'
		. '<div style="' . $f . 'font-size:13px;color:#5d554c;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' . $subject . '</div></div>';
};
echo '<!doctype html><meta charset="utf-8"><body style="margin:0;background:#d9b88c;width:1000px;height:1000px;overflow:hidden">'
	. '<div style="position:absolute;left:28px;top:28px;width:944px;height:944px;background:#fff;border-radius:18px;box-shadow:0 14px 40px rgba(58,42,28,.35);overflow:hidden;display:flex;flex-direction:column">'
	// title bar
	. '<div style="height:46px;background:#f3ede3;border-bottom:1px solid #e3dccf;display:flex;align-items:center;padding:0 16px;gap:8px">'
	. '<span style="width:12px;height:12px;border-radius:50%;background:#e0705a"></span><span style="width:12px;height:12px;border-radius:50%;background:#e8b440"></span><span style="width:12px;height:12px;border-radius:50%;background:#7bb661"></span>'
	. '<span style="margin-left:14px;flex:1;height:28px;border-radius:14px;background:#fff;border:1px solid #e3dccf;' . $f . 'font-size:13px;color:#9a9085;line-height:28px;padding:0 14px">Search mail</span></div>'
	. '<div style="flex:1;display:flex;min-height:0">'
	// message list
	. '<div style="width:250px;border-right:1px solid #e3dccf;background:#fbf8f3">'
	. '<div style="' . $f . 'font-size:13px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#8a8076;padding:14px 14px 8px">Inbox</div>'
	. $row( 'Demo Eco Shop', 'Your order #1042 is complete', '09:41', true )
	. $row( 'Demo Eco Shop', 'We received your order #1042', 'Mon' )
	. $row( 'Newsletter', 'Five ways to cut plastic at home', 'Sun' )
	. $row( 'Parcel service', 'Your parcel is on its way', 'Sat' )
	. '</div>'
	// the message
	. '<div style="flex:1;min-width:0;padding:18px 26px 0;overflow:hidden">'
	. '<div style="' . $f . 'font-size:21px;font-weight:700;color:#2b2622">Your order #1042 is complete</div>'
	. '<div style="display:flex;align-items:center;gap:10px;margin:10px 0 4px"><span style="width:34px;height:34px;border-radius:50%;background:#3d6b8c;color:#fff;' . $f . 'font-weight:700;font-size:15px;display:flex;align-items:center;justify-content:center">D</span>'
	. '<span style="' . $f . 'font-size:14px;color:#2b2622"><b>Demo Eco Shop</b><br><span style="color:#8a8076;font-size:12px">to me</span></span></div>'
	. '<div style="zoom:0.8">' . $html . '</div>'
	. '</div></div></div></body>';
