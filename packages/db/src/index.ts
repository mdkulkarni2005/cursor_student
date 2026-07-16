import { PrismaClient } from "@prisma/client";

// Reuse one client across hot-reloads / Fluid Compute instances to avoid
// exhausting Neon connections.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Prisma's query engine doesn't understand the libpq `channel_binding` param that
// Neon includes by default; strip it so runtime connections don't fail.
//
// Also caps Prisma's per-instance connection pool (default would be `num_cpus * 2 + 1`).
// Safe on a single long-lived dev/VM process, but on Cloud Run each container instance opens
// its own pool — 10 instances x an uncapped pool can exhaust Neon's connection limit. Only
// applied if the URL doesn't already specify one, so an explicit DATABASE_URL value always wins.
function runtimeDbUrl(): string | undefined {
  const raw = process.env.DATABASE_URL;
  if (!raw) return undefined;
  try {
    const u = new URL(raw);
    u.searchParams.delete("channel_binding");
    if (!u.searchParams.has("connection_limit")) {
      u.searchParams.set("connection_limit", process.env.PRISMA_CONNECTION_LIMIT || "3");
    }
    return u.toString();
  } catch {
    return raw;
  }
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: runtimeDbUrl(),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// Re-export generated types and enums so app code imports everything from `@studentos/db`.
export * from "@prisma/client";
export * from "./phone";
export * from "./plan-limits";
export * from "./payments";
