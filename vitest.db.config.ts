import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["src/**/*.db.test.ts", "supabase/tests/**/*.db.test.ts"],
    exclude: ["**/node_modules/**", ".next/**", "e2e/**"],
    env: { TZ: "UTC" },
    // Only the DB layer may pass with zero tests: today the schema is empty,
    // so the RLS harness registers nothing until E03 adds a table (#87 AC6).
    passWithNoTests: true,
  },
});
