/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

// Initialize OpenNext for local development with Cloudflare bindings
// This allows getCloudflareContext() to work during `next dev`
if (process.env.NODE_ENV === "development") {
  initOpenNextCloudflareForDev();
}

/** @type {import("next").NextConfig} */
const config = {
  // Empty turbopack config to silence Next.js 16 warning about webpack config
  // Next.js 16 uses Turbopack by default, this tells it we're aware
  turbopack: {},

  // Bundle size optimizations for Cloudflare Workers
  // Exclude heavy packages from server bundle
  serverExternalPackages: ["postgres"],

  // Exclude source maps and heavy optional dependencies from bundle
  outputFileTracingExcludes: {
    "*": [
      // Source maps
      "./**/*.js.map",
      "./**/*.mjs.map",
      "./**/*.cjs.map",
      // @vercel/og WASM files (not needed if not using OG image generation)
      "node_modules/next/dist/compiled/@vercel/og/**",
      // Canvas (optional dependency)
      "node_modules/canvas/**",
    ],
  },
};

export default config;
