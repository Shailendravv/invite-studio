import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["packages/**/test/**/*.test.ts", "apps/**/test/**/*.test.ts", "video/test/**/*.test.ts"],
    exclude: ["**/node_modules/**", ...(process.env.LIVE_LLM ? [] : ["**/*.live.test.ts"])],
    environment: "node",
    testTimeout: 20_000,
    pool: "forks",
  },
});
