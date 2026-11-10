import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true
  },
  build: {
    target: "es2022",
    sourcemap: false,
    rollupOptions: {
      input: {
        main: "index.html",
        circlePreview: "circle-preview.html",
        stationPreview: "station-preview.html",
        transportPreview: "transport-preview.html",
        greaterAccraTransportPreview: "greater-accra-transport-preview.html"
      }
    }
  }
});
