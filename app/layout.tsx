import type { Metadata, Viewport } from "next";
import { Caprasimo, Figtree } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import TopNav from "@/components/TopNav";

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${caprasimo.variable} ${figtree.variable}`}>
      <body className="min-h-screen bg-sage-100 text-ink antialiased">
        <TopNav />
        {/* Phones: one narrow column above the bottom tabs. Tablet: a little wider. Desktop: a 1280px container under the top navbar. */}
        <main className="mx-auto max-w-md px-5 pt-5 pb-24 md:max-w-2xl md:px-8 lg:max-w-[1280px] lg:px-10 lg:pt-8 lg:pb-16">{children}</main>
        <BottomNav />
      </body>
    </html>
  );
}
