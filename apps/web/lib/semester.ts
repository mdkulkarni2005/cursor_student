import { prisma } from "@studentos/db";
import type { User } from "@studentos/db";

export type SubjectCard = {
  id: string;
  name: string;
  code: string | null;
  fileCount: number;
};

export type DeadlineItem = {
  id: string;
  title: string;
  kind: string;
  dueAt: Date;
  subjectName: string | null;
};

export type SemesterData = {
  workspaceId: string;
  semester: string | null;
  subjects: SubjectCard[];
  deadlines: DeadlineItem[];
};

/**
 * Ensure the user has a Workspace for their current semester, returning it.
 * The Semester Hub maps 1:1 to a Workspace; we lazily create one on first visit.
 */
export async function getOrCreateCurrentWorkspace(user: User) {
  const existing = await prisma.workspace.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });
  if (existing) return existing;
  return prisma.workspace.create({
    data: {
      userId: user.id,
      name: user.semester ? `Semester ${user.semester}` : "My Semester",
      semester: user.semester,
    },
  });
}

/** Read the active semester's real subjects (with file counts) and upcoming deadlines. */
export async function getSemesterData(user: User): Promise<SemesterData> {
  const workspace = await getOrCreateCurrentWorkspace(user);

  const [subjects, deadlines] = await Promise.all([
    prisma.subject.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { name: "asc" },
      include: { _count: { select: { documents: true } } },
    }),
    prisma.deadline.findMany({
      where: { userId: user.id, done: false },
      orderBy: { dueAt: "asc" },
      take: 6,
      include: { subject: { select: { name: true } } },
    }),
  ]);

  return {
    workspaceId: workspace.id,
    semester: workspace.semester,
    subjects: subjects.map((s) => ({
      id: s.id,
      name: s.name,
      code: s.code,
      fileCount: s._count.documents,
    })),
    deadlines: deadlines.map((d) => ({
      id: d.id,
      title: d.title,
      kind: d.kind,
      dueAt: d.dueAt,
      subjectName: d.subject?.name ?? null,
    })),
  };
}

export type SubjectDetail = {
  id: string;
  name: string;
  code: string | null;
  documents: { id: string; title: string; type: string; status: string; createdAt: Date }[];
  deadlines: DeadlineItem[];
};

/** Read one subject (scoped to the user) with its documents and deadlines. */
export async function getSubjectDetail(user: User, subjectId: string): Promise<SubjectDetail | null> {
  const subject = await prisma.subject.findFirst({
    where: { id: subjectId, workspace: { userId: user.id } },
    include: {
      documents: { orderBy: { updatedAt: "desc" }, take: 20 },
      deadlines: { where: { done: false }, orderBy: { dueAt: "asc" }, take: 5 },
    },
  });
  if (!subject) return null;
  return {
    id: subject.id,
    name: subject.name,
    code: subject.code,
    documents: subject.documents.map((d) => ({
      id: d.id,
      title: d.title,
      type: d.type,
      status: d.status,
      createdAt: d.createdAt,
    })),
    deadlines: subject.deadlines.map((d) => ({
      id: d.id,
      title: d.title,
      kind: d.kind,
      dueAt: d.dueAt,
      subjectName: subject.name,
    })),
  };
}
