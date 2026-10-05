import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Share images read the rank artwork from public/ on disk (lib/beeCardOg.tsx); serverless functions don't ship public/ unless traced in.
  outputFileTracingIncludes: {
    "/api/card/*": ["./public/nft/web/*.png"],
    "/api/passport-card/*": ["./public/nft/web/*.png"],
  },
};

export default nextConfig;
