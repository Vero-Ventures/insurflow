import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig({
  // Default caching configuration
  // See https://opennext.js.org/cloudflare/caching for more options
  //
  // Bundle size optimization:
  // The worker is hitting the 3 MiB limit on free plan
  // Consider upgrading to paid plan for 10 MiB limit
  // Or remove heavy dependencies like @vercel/og if not used
});
