import { PrismaClient } from "@prisma/client";

// Reuse one client across hot-reloads / Fluid Compute instances to avoid
// exhausting Neon connections.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Prisma's query engine doesn't understand the libpq `channel_binding` param that
// Neon includes by default; strip it so runtime connections don't fail.
function runtimeDbUrl(): string | undefined {
  const raw = process.env.DATABASE_URL;
  if (!raw) return undefined;
  try {
    const u = new URL(raw);
    u.searchParams.delete("channel_binding");
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
