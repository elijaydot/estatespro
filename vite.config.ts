import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return;
          }

          if (id.includes("@supabase")) {
            return "vendor-supabase";
          }

          if (id.includes("@radix-ui") || id.includes("cmdk") || id.includes("vaul")) {
            return "vendor-radix";
          }

          if (id.includes("react-router") || id.includes("@remix-run")) {
            return "vendor-router";
          }

          if (id.includes("@tanstack")) {
            return "vendor-query";
          }

          if (id.includes("recharts")) {
            return "vendor-charts";
          }

          if (id.includes("react-hook-form") || id.includes("@hookform") || id.includes("zod")) {
            return "vendor-forms";
          }

          if (id.includes("date-fns")) {
            return "vendor-date";
          }

          if (id.includes("sonner")) {
            return "vendor-sonner";
          }

          if (id.includes("react") || id.includes("scheduler")) {
            return "vendor-react";
          }

          if (id.includes("react-markdown") || id.includes("remark") || id.includes("rehype")) {
            return "vendor-markdown";
          }

          if (id.includes("lucide-react")) {
            return "vendor-icons";
          }

          return "vendor";
        },
      },
    },
  },
}));
