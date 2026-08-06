import { fileURLToPath } from "node:url";
import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

const migrationsPath = fileURLToPath(
  new URL("../../packages/database/migrations", import.meta.url),
);

export default defineConfig({
  plugins: [
    cloudflareTest(async () => ({
      wrangler: { configPath: "./wrangler.jsonc" },
      miniflare: {
        bindings: { TEST_MIGRATIONS: await readD1Migrations(migrationsPath) },
      },
    })),
  ],
  test: {
    include: ["tests/**/*.integration.test.ts"],
    setupFiles: ["./tests/apply-migrations.ts"],
  },
});
