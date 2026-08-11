import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ships `.next/standalone` with a `server.js` and only the `node_modules` the
  // app actually reaches, so the runtime image needs no install step. `public`
  // and `.next/static` are not copied in by the build and are placed by hand in
  // the Dockerfile.
  output: "standalone",
};

export default nextConfig;
