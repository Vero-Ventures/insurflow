#!/bin/bash
# Replace @vercel/og WASM files with minimal stubs
# This is needed because the WASM files (~1.4MB) push the Cloudflare Workers
# bundle over the 3MB free tier limit, even when we don't use OG image generation.
#
# The files are still required to exist for wrangler bundling to succeed,
# but we replace them with minimal valid WASM files (8 bytes each).

set -e

WASM_DIR="node_modules/next/dist/compiled/@vercel/og"

if [ -d "$WASM_DIR" ]; then
  echo "Replacing @vercel/og WASM files with stubs..."
  
  # Minimal valid WASM file: magic bytes (0x00 0x61 0x73 0x6D) + version (0x01 0x00 0x00 0x00)
  for wasm_file in "$WASM_DIR"/*.wasm; do
    if [ -f "$wasm_file" ]; then
      original_size=$(stat -c%s "$wasm_file" 2>/dev/null || stat -f%z "$wasm_file" 2>/dev/null)
      printf '\x00asm\x01\x00\x00\x00' > "$wasm_file"
      new_size=$(stat -c%s "$wasm_file" 2>/dev/null || stat -f%z "$wasm_file" 2>/dev/null)
      echo "  Replaced $(basename "$wasm_file"): ${original_size} bytes -> ${new_size} bytes"
    fi
  done
  
  echo "Done! WASM stubs created."
else
  echo "WASM directory not found: $WASM_DIR"
  echo "This is normal if @vercel/og is not installed."
fi
