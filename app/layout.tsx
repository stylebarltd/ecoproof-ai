import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EcoProof AI",
  description: "Your verified environmental impact passport",
  manifest: "/manifest.webmanifest",
};
export const viewport: Viewport = { themeColor: "#16a34a", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-emerald-950 text-emerald-50 antialiased">
        <main className="mx-auto max-w-md px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
