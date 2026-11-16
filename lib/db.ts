import { PrismaClient } from "@prisma/client";

/**
 * Normalize a connection string coming from env vars. Dashboards/CLI uploads
 * sometimes keep surrounding quotes or whitespace, which breaks Prisma URLs.
 */
export function normalizeDatabaseUrl(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  let value = raw.trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1).trim();
  }
  if (!value) return undefined;
  // Serverless functions open a new connection per instance. Keeping one pooled
  // connection per instance prevents Supabase "max clients reached" errors,
  // which otherwise show up as random "failed to load" messages in the panel.
  if (/^postgres(ql)?:\/\//i.test(value) && !/[?&]connection_limit=/i.test(value)) {
    value += `${value.includes("?") ? "&" : "?"}connection_limit=1&connect_timeout=15`;
  }
  return value;
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    ...(normalizeDatabaseUrl(process.env.DATABASE_URL)
      ? { datasourceUrl: normalizeDatabaseUrl(process.env.DATABASE_URL) }
      : {}),
  });

// Cache globally in all environments (important for serverless/Vercel to reuse connections across warm invocations).
globalForPrisma.prisma = prisma;
