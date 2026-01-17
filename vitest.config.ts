import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/app/api/_utils/**/*.test.ts"],
  },
});
