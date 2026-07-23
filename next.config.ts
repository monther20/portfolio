import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Render runs the traced production server from the Docker image.
  output: "standalone",
  turbopack: {
    // Keep Turbopack scoped to this portfolio folder when parent directories also contain lockfiles.
    root: process.cwd(),
  },
};

export default nextConfig;
