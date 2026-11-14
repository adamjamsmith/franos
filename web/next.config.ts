import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The local database (PGlite) ships its own binary files and must not be bundled.
  serverExternalPackages: ["@electric-sql/pglite"],
  // Lets franOS be opened at 127.0.0.1 as well as localhost while it runs on this computer (used for testing).
  allowedDevOrigins: ["127.0.0.1"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
