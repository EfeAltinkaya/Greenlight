import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Supabase public settings (URL and anon key are safe in the browser; row-level security protects the data).
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? "",
  },
  // Transformers.js is lazy-loaded in a worker; keep native/onnx out of the server bundle.
  serverExternalPackages: ["@huggingface/transformers", "onnxruntime-node", "onnxruntime-web"],
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
