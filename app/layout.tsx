import type { Metadata, Viewport } from "next";
import { Caprasimo, Figtree } from "next/font/google";
import "./globals.css";

const caprasimo = Caprasimo({ weight: "400", subsets: ["latin"], variable: "--font-caprasimo", display: "swap" });
const figtree = Figtree({ subsets: ["latin"], variable: "--font-figtree", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "https://ecoproof-ai.vercel.app"), // link-preview images must come from the host that serves them
  title: "EcoProof AI",
  description: "Your verified environmental impact passport",
  manifest: "/manifest.webmanifest",
  icons: { icon: [{ url: "/logo.svg", type: "image/svg+xml" }, { url: "/icons/192", type: "image/png" }], apple: "/icons/180" },
  appleWebApp: { capable: true, title: "EcoProof", statusBarStyle: "black-translucent" },
};
export const viewport: Viewport = { themeColor: "#f0fae1", width: "device-width", initialScale: 1 };

/** Fonts, metadata and the body only. The app's navbars and column live in components/AppShell.tsx (app/(app)/layout.tsx); the signed-out
 *  landing page at "/" has its own chrome. */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${caprasimo.variable} ${figtree.variable}`}>
      <body className="min-h-screen bg-sage-100 text-ink antialiased">{children}</body>
    </html>
  );
}
