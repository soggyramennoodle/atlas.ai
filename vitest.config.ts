import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // `server-only` throws under the default export condition used by Vitest.
    // In the real Next.js build it is a no-op (react-server condition).
    // Alias it to an empty module so pure-helper tests can import server files.
    alias: {
      "server-only": require.resolve("./src/lib/__server-only-stub__.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    passWithNoTests: true,
  },
});
