import { prisma } from "@studentos/db";
import type { User, Workspace } from "@studentos/db";

/**
 * Every student has a workspace per semester (the "Semester Workspace"). Created
 * lazily so generated work always has a home. Documents are attached to the
 * current-semester workspace at generation time.
 */
export async function getOrCreateCurrentWorkspace(user: User): Promise<Workspace> {
  const existing = await prisma.workspace.findFirst({
    where: { userId: user.id, semester: user.semester ?? null },
  });
  if (existing) return existing;

  return prisma.workspace.create({
    data: {
      userId: user.id,
      name: user.semester ? `Semester ${user.semester}` : "My Workspace",
      semester: user.semester,
    },
  });
}
