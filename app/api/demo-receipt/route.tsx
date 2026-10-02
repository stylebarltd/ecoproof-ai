import { ImageResponse } from "next/og";

// Generates a fresh demo receipt (new number, today's date) so the demo can be rehearsed. Not a real receipt.
const MENUS: Record<string, [number, string, number][]> = {
  superbee: [[1, "Beeswax Food Wrap Set", 490], [1, "HexaWash Laundry Pouch", 590], [2, "Dentos Toothpaste Tabs", 380], [1, "Reusable Produce Bags", 290]],
  greenmarket: [[1, "Organic Cotton T-Shirt", 590], [1, "Reusable Cotton Tote Bag", 180], [2, "Bamboo Kitchen Towels", 240], [1, "Stainless Steel Water Bottle", 450], [1, "Reusable Produce Bags", 220], [1, "Organic Cotton Napkins", 290]],
  cafe: [[1, "Iced Latte", 85], [1, "Oat Flat White", 95], [1, "Banana Bread", 70]],
};

export async function GET(req: Request) {
  const u = new URL(req.url);
  const kind = u.searchParams.get("kind") ?? "cafe";
  const name = (u.searchParams.get("name") ?? "DEMO CAFE").slice(0, 40).toUpperCase();
  const rows = MENUS[kind] ?? MENUS.cafe;
  const subtotal = rows.reduce((a, r) => a + r[2], 0);
  const vat = Math.round(subtotal * 7) / 100;
  const d = new Date();
  const date = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  const no = `${name.replace(/[^A-Z]/g, "").slice(0, 2) || "RC"}-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}-${Math.floor(1000 + Math.random() * 9000)}`;
  const line = (l: string, r: string, bold = false) => (
    <div style={{ display: "flex", justifyContent: "space-between", fontWeight: bold ? 700 : 400 }}><span>{l}</span><span>{r}</span></div>
  );
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#000", padding: 24 }}>
        <div style={{ display: "flex", flexDirection: "column", width: "100%", background: "#2f2f2f", borderRadius: 40, padding: 48, color: "#f4f4f4", fontSize: 34, gap: 14 }}>
          <div style={{ fontWeight: 700 }}>{name}</div>
          <div>Chiang Mai, Thailand</div>
          <div>-----------------------------</div>
          <div>{`Date: ${date}`}</div>
          <div>{`Receipt #: ${no}`}</div>
          <div style={{ height: 8 }} />
          {rows.map(([q, n, p]) => line(`${q} x ${n}`, `THB ${p}`))}
          <div>-----------------------------</div>
          {line("SUBTOTAL", `THB ${subtotal}`)}
          {line("VAT 7%", `THB ${vat.toFixed(2)}`)}
          {line("TOTAL", `THB ${(subtotal + vat).toFixed(2)}`, true)}
          <div style={{ height: 8 }} />
          <div>Payment: Visa</div>
          <div>Thank you for choosing plastic-free alternatives!</div>
        </div>
      </div>
    ),
    { width: 1080, height: 760 + rows.length * 58, headers: { "Cache-Control": "no-store" } },
  );
}
