import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Development only: lets a phone on the home network open the dev server by this machine's address. Without it Next.js answers 403 for its own
  // scripts and styles there, and the page arrives unstyled and dead (Pola, 2026-11-20: "there is no phone template"). Hostnames only, no port.
  allowedDevOrigins: ["192.168.1.41", "192.168.1.*"],
  // Share images read the rank artwork from public/ on disk (lib/beeCardOg.tsx); serverless functions don't ship public/ unless traced in.
  // The help page moved from /about to /help on 2026-11-21. /about stays as a permanent redirect: order emails already sent by the WooCommerce plugin, and
  // every plugin version up to 1.5.0, link to it ("Learn more about EcoProof"). A browser keeps the #anchor across the redirect.
  redirects: async () => [{ source: "/about", destination: "/help", permanent: true }],
  outputFileTracingIncludes: {
    "/api/card/*": ["./public/share/art/*.png", "./public/share/fonts/*.ttf"],
    "/api/passport-card/*": ["./public/share/art/*.png", "./public/share/fonts/*.ttf"],
  },
};

export default nextConfig;
