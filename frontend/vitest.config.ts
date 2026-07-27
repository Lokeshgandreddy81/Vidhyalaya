import { defineConfig } from "vitest/config"
import path from "path"

export default defineConfig({
  test: {
    testTimeout: 15000,
    hookTimeout: 15000,
    environment: "jsdom",
    globals: true,
    alias: {
      "@": path.resolve(__dirname, "./src")
    }
  }
})
