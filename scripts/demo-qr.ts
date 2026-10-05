// Regenerates the demo QR codes in docs/demo-qr/ (shown in the README). Each one opens a demo place ready to collect.
// Demo places have no GPS check, so they work from anywhere. Run: npx tsx scripts/demo-qr.ts [baseUrl]
import QRCode from "qrcode";

const base = (process.argv[2] ?? "https://ecoproof.superbee.me").replace(/\/$/, "");
const demos = [
  { id: "demo-cafe", file: "1-demo-cafe" },
  { id: "demo-restaurant", file: "2-demo-restaurant" },
  { id: "demo-coffee", file: "3-demo-coffee-roasters" },
];
async function main() {
  for (const d of demos) {
    const url = `${base}/c/${d.id}?src=qr`;
    await QRCode.toFile(`docs/demo-qr/${d.file}.png`, url, { width: 480, margin: 3, errorCorrectionLevel: "M", color: { dark: "#272e1b", light: "#ffffff" } });
    console.log(url);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
