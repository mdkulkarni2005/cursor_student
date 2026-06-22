import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdfkit reads its built-in font .afm files from disk at runtime; keep it un-bundled
  // so those data files resolve from node_modules. pdf-parse (resume import) bundles
  // pdfjs-dist and is likewise best kept external to the server bundle.
  serverExternalPackages: ["pdfkit", "pdf-parse", "pdfjs-dist"],
};

export default nextConfig;
