import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    css: true,
    globals: true,
    // Helpful defaults; adjust later as needed
    restoreMocks: true,
    clearMocks: true,
    mockReset: true,
  },
});