/**
 * Prisma 7 configuration for La Bulle De Vie
 *
 * In Prisma 7, connection URLs are no longer set in schema.prisma.
 * They live here and are passed to the PrismaClient constructor at runtime.
 *
 * - DATABASE_URL: pooled connection (PgBouncer, port 6543) for app queries
 * - DIRECT_URL:   direct connection (port 5432) for migrations
 *
 * The CLI loads .env.local via the loadEnvFile call below.
 */

// Load .env.local for local development (Next.js convention)
// In production (Vercel) env vars are injected by the platform — no file needed
import { loadEnvFile } from "node:process";

try {
  loadEnvFile(".env.local");
} catch {
  // Silently skip if the file doesn't exist (CI / production)
}

import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Prisma 7: no directUrl support — use the direct connection (port 5432) for migrations
    // PrismaClient reads DATABASE_URL from env automatically at runtime
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL!,
  },
});
