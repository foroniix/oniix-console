import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "server-only": path.resolve(__dirname, "src/test-utils/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["src/app/api/_utils/**/*.test.ts"],
  },
});
