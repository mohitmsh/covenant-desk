import { fileURLToPath } from "node:url"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

const API_ORIGIN = process.env.API_ORIGIN ?? "http://localhost:4310"

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  server: { port: 5173, proxy: { "/api": API_ORIGIN } }
})
