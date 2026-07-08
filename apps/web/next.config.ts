import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Standalone output for Docker: bundles only the traced deps a container needs to run,
  // instead of requiring the whole monorepo node_modules at runtime.
  output: "standalone",
  // pnpm hoists shared deps to the repo root; without this, tracing misses them and
  // workspace packages (@studentos/*).
  outputFileTracingRoot: path.join(__dirname, "../../"),
  // pdfkit reads its built-in font .afm files from disk at runtime; keep it un-bundled
  // so those data files resolve from node_modules. pdf-parse (resume import) bundles
  // pdfjs-dist and is likewise best kept external to the server bundle.
  serverExternalPackages: ["pdfkit", "pdf-parse", "pdfjs-dist"],
};

export default nextConfig;
