import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Keep Turbopack scoped to this portfolio folder when parent directories also contain lockfiles.
    root: process.cwd(),
  },
};

export default nextConfig;
