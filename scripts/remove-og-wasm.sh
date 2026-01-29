#!/bin/bash
# Remove @vercel/og WASM files to reduce Cloudflare Workers bundle size
#
# The @vercel/og package is included with Next.js for OG image generation,
# but InsurFlow doesn't use this feature. The WASM files (resvg.wasm ~1.3MB, 
# yoga.wasm ~86KB) get bundled by wrangler, pushing the bundle over the 
# 3MB free tier limit.
#
# This script removes these files after install to prevent them from being
# included in the production bundle.

set -e

OG_DIR="node_modules/next/dist/compiled/@vercel/og"

if [ -d "$OG_DIR" ]; then
  # Remove WASM files
  rm -f "$OG_DIR/resvg.wasm" "$OG_DIR/yoga.wasm"
  
  # Create placeholder files that throw if accidentally imported
  echo 'throw new Error("@vercel/og WASM removed to reduce bundle size")' > "$OG_DIR/resvg.wasm"
  echo 'throw new Error("@vercel/og WASM removed to reduce bundle size")' > "$OG_DIR/yoga.wasm"
  
  echo "Removed @vercel/og WASM files to reduce bundle size"
else
  echo "No @vercel/og directory found (this is fine)"
fi
