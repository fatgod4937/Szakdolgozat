import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["images/logo.png"],
      manifest: {
        name: "Szakdolgozat",
        short_name: "Szakdolgozat",
        description: "Örökbefogadási landing oldal React Routerral és PWA támogatással.",
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
});
