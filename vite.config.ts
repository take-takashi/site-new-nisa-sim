import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  base: "/site-new-nisa-sim/",
  plugins: [react(), tailwindcss()],
});
