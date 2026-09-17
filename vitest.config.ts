import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  // Tests only: the real `server-only` package throws outside the React Server
  // condition, which would make server modules untestable. The app build is
  // unaffected because this alias lives in the Vitest config, not Next.js.
  resolve: {
    alias: {
      "server-only": fileURLToPath(
        new URL("./test/stubs/server-only.ts", import.meta.url),
      ),
    },
  },
  test: {
    environment: "node",
    include: [
      "src/**/*.test.{ts,tsx}",
      "scripts/**/*.test.ts",
      "eval/**/*.test.ts",
      "test/**/*.test.ts",
    ],
    exclude: ["**/node_modules/**", "**/*.db.test.ts", "e2e/**", ".next/**"],
    setupFiles: ["test/setup.ts"],
    env: { TZ: "UTC" },
    passWithNoTests: false,
  },
});
