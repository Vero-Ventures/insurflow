/**
 * Run `build` or `build:cloudflare` with `SKIP_ENV_VALIDATION` to skip env validation.
 */
import "./src/env.js";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

// Initialize OpenNext for local development with Cloudflare bindings
if (process.env.NODE_ENV === "development") {
  initOpenNextCloudflareForDev();
}

/** @type {import("next").NextConfig} */
const config = {
  // Turbopack config
  turbopack: {},

  // Production optimizations
  productionBrowserSourceMaps: false,

  // Remove console logs in production
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },

  // Experimental optimizations
  experimental: {
    // Optimize package imports (reduce bundle size)
    optimizePackageImports: [
      "lucide-react",
      "recharts",
      "@radix-ui/react-icons",
    ],
    // Use lightweight polyfills
    serverMinification: true,
  },

  // Webpack optimization for smaller bundles
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Aggressive minification for server
      config.optimization = {
        ...config.optimization,
        minimize: true,
        usedExports: true,
        sideEffects: false,
        providedExports: true,
        // Aggressive code splitting
        splitChunks: {
          chunks: "all",
          minSize: 10000,
          maxSize: 500000,
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: "vendors",
              chunks: "all",
              priority: 10,
              reuseExistingChunk: true,
            },
            common: {
              minChunks: 2,
              chunks: "all",
              enforce: true,
              priority: 5,
              reuseExistingChunk: true,
            },
          },
        },
        // Dead code elimination
        removeAvailableModules: true,
        removeEmptyChunks: true,
        mergeDuplicateChunks: true,
      };

      // Exclude heavy native modules and optional dependencies
      config.externals = [
        ...(config.externals || []),
        "pg-native",
        "sqlite3",
        "better-sqlite3",
        "canvas",
        "sharp",
        // Exclude source map support
        "source-map-support",
        // Exclude prismjs (1.2MB) - pulled in by @react-email/code-block
        // We don't use code syntax highlighting in emails
        "prismjs",
        "@react-email/code-block",
      ];

      // Resolve aliases to reduce bundle size
      config.resolve = {
        ...config.resolve,
        alias: {
          ...config.resolve?.alias,
          // Don't bundle React dev tools in production
          "react-dom$": "react-dom/profiling",
          "scheduler/tracing": "scheduler/tracing-profiling",
        },
      };
    }

    return config;
  },

  // Exclude heavy packages from server bundle
  serverExternalPackages: [
    "postgres",
    "@neondatabase/serverless",
    // Keep better-auth external to reduce bundle (will be bundled separately)
    // "better-auth",
  ],

  // Aggressive tree-shaking excludes
  outputFileTracingExcludes: {
    "*": [
      // All source maps
      "**/*.js.map",
      "**/*.mjs.map",
      "**/*.cjs.map",
      "**/*.ts.map",
      // @vercel/og and heavy WASM
      "**/node_modules/next/dist/compiled/@vercel/og/**/*.wasm",
      "**/node_modules/next/dist/compiled/@vercel/og/**/*.node",
      "**/node_modules/next/dist/compiled/@vercel/og/**/*.js",
      // Canvas and graphics
      "**/node_modules/canvas/**",
      "**/node_modules/@napi-rs/canvas/**",
      "**/node_modules/sharp/**",
      "**/node_modules/@img/**",
      // Test files
      "**/*.test.ts",
      "**/*.test.tsx",
      "**/*.spec.ts",
      "**/*.spec.tsx",
      "**/tests/**",
      "**/__tests__/**",
      "**/__mocks__/**",
      // Development files
      "**/drizzle-kit/**",
      "**/drizzle.config.*",
      "**/.drizzle/**",
      // Source map files
      "**/node_modules/source-map-support/**",
      "**/node_modules/@axiomhq/js/**/*.map",
      // Better-auth source maps and dev files
      "**/node_modules/better-auth/**/*.map",
      "**/node_modules/better-auth/**/*.md",
      "**/node_modules/better-auth/**/*.test.*",
      // React development files
      "**/node_modules/react/cjs/react.development.js",
      "**/node_modules/react-dom/cjs/react-dom.development.js",
      "**/node_modules/scheduler/cjs/scheduler.development.js",
      // TypeScript declarations
      "**/*.d.ts",
    ],
  },

  // Compress responses
  compress: true,

  // Disable powered by header
  poweredByHeader: false,

  // Images optimization - use external loader to reduce bundle
  images: {
    formats: ["image/webp", "image/avif"],
    minimumCacheTTL: 86400,
    // Use unoptimized in Workers to reduce bundle size
    unoptimized: process.env.NODE_ENV === "production",
  },
};

export default config;
