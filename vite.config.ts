import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import tailwindcss from "@tailwindcss/vite";

const enableCrossOriginIsolation = process.env.VITE_CROSS_ORIGIN_ISOLATION === 'true';

export default defineConfig({
  // .env files live outside the repo (real secrets — Stripe, PayPal,
  // HubSpot, WhatsApp token, Turnstile — shouldn't sit in a project
  // directory that could end up in version control or get shared).
  /* This deployment's env lives outside the repo, under the ucaas.in name --
     the same path `/root/deploy-web.sh` documents and where `.env.ucaas` and
     `.env.production` actually sit. The old `/etc/mycountrymobile-web` does
     not exist on this box, so pointing there silently loaded no variables at
     all: the bundle came out with no VITE_API_BASE_URL and the deploy script's
     own guard rejected it for not referencing https://api.ucaas.in. */
  envDir: '/etc/ucaas-india',
  define: {
    global: 'globalThis',
    Lame: {},
    Presets: {},
    GainAnalysis: {},
    QuantizePVT: {},
    Quantize: {},
    Takehiro: {},
    Reservoir: {},
    MPEGMode: {},
    BitStream: {},
    assetsInclude: ['**/*.wasm'],
  },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    headers: enableCrossOriginIsolation
      ? {
          'Cross-Origin-Embedder-Policy': 'require-corp',
          'Cross-Origin-Opener-Policy': 'same-origin',
        }
      : undefined,
  },
  build: {
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith('.wasm')) {
            return 'assets/[name]-[hash][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        },
      },
    },
  },
});
