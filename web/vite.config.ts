import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const https =
    env.VITE_HTTPS_KEY_PATH && env.VITE_HTTPS_CERT_PATH
      ? {
          key: readFileSync(resolve(env.VITE_HTTPS_KEY_PATH)),
          cert: readFileSync(resolve(env.VITE_HTTPS_CERT_PATH)),
        }
      : undefined;

  return {
    server: {
      host: "0.0.0.0",
      https,
      watch: {
        usePolling: true,
        interval: 100,
      },
    },
    preview: {
      host: "0.0.0.0",
      https,
    },
    plugins: [
      react(),
      VitePWA({
        registerType: "autoUpdate",
        devOptions: {
          enabled: true,
        },
        includeAssets: ["images/logo.png"],
        workbox: {
          importScripts: ["push-notifications.js"],
        },
        manifest: {
          id: "/",
          name: "Floofs",
          short_name: "Floofs",
          description: "Fogadj örökbe egy életet!",
          theme_color: "#fec8e9",
          background_color: "#ffffff",
          display: "standalone",
          start_url: "/",
          scope: "/",
          icons: [
            {
              src: "/images/logo.png",
              sizes: "192x192",
              type: "image/png",
            },
            {
              src: "/images/logo.png",
              sizes: "512x512",
              type: "image/png",
            },
          ],
        },
      }),
    ],
  };
});
