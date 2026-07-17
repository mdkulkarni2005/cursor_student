import { clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@studentos/db";
import { requireAdmin } from "@/lib/admin";
import { NotAuthorized } from "@/components/not-authorized";
import { RecruiterRow } from "./recruiter-row";

/** Clerk holds the real email-verification state (not mirrored into our DB) — fetch it per
 * recruiter so admin can see "is that mail ID genuine" before approving. Best-effort: a lookup
 * failure (e.g. deleted Clerk user) shows as unverified rather than blowing up the whole page. */
async function emailVerifiedMap(clerkIds: string[]): Promise<Map<string, boolean>> {
  const client = await clerkClient();
  const entries = await Promise.all(
    clerkIds.map(async (id) => {
      try {
        const user = await client.users.getUser(id);
        const verified = user.emailAddresses.some((e) => e.verification?.status === "verified");
        return [id, verified] as const;
      } catch {
        return [id, false] as const;
      }
    }),
  );
  return new Map(entries);
}

export const metadata = { title: "Recruiters — Admin" };

const STATUS_STYLE: Record<string, string> = {
  PENDING: "text-warning bg-warning/12",
  APPROVED: "text-success bg-success/12",
  REJECTED: "text-danger bg-danger/12",
};

function fmtDateTime(d: Date | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default async function RecruitersPage() {
  const guard = await requireAdmin();
  if (!guard.ok) return <NotAuthorized reason={guard.reason} />;

  const recruiters = await prisma.recruiter.findMany({
    where: { status: { not: "DRAFT" } },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
  });

  const pendingCount = recruiters.filter((r) => r.status === "PENDING").length;
  const verifiedByClerkId = await emailVerifiedMap(recruiters.map((r) => r.clerkId));

  return (
    <>
      <div className="mb-5">
        <h1 className="font-display text-[26px] font-bold text-ink">Recruiters</h1>
        <p className="mt-1 text-[15px] text-muted">
          {pendingCount} pending review. Approving grants apps/recruiter access (sets Clerk role + local status);
          check company email/phone genuineness before approving.
        </p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-line bg-card">
        <table className="w-full text-left text-[14.5px]">
          <thead className="border-b border-line text-[13px] uppercase tracking-wide text-faint">
            <tr>
              {["Name", "Company", "Contact", "Industry", "Status", "Submitted", "Actions"].map((h) => (
                <th key={h} className="px-3 py-2.5 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {recruiters.map((r) => (
              <tr key={r.id} className="border-b border-line/60 last:border-0 align-top hover:bg-surface">
                <td className="px-3 py-2.5 font-medium text-ink">{r.name ?? "—"}</td>
                <td className="px-3 py-2.5 text-soft">{r.companyName ?? "—"}</td>
                <td className="px-3 py-2.5 text-soft">
                  <p>
                    {r.email}{" "}
                    {verifiedByClerkId.get(r.clerkId) ? (
                      <span className="text-[12px] font-semibold text-success">✓ verified</span>
                    ) : (
                      <span className="text-[12px] font-semibold text-danger">unverified</span>
                    )}
                  </p>
                  {r.companyEmail && <p className="text-[13px] text-faint">{r.companyEmail}</p>}
                  <p className="text-[13px] text-faint">{r.phone ?? "—"}</p>
                </td>
                <td className="px-3 py-2.5 text-soft">{r.industry ?? "—"}</td>
                <td className="px-3 py-2.5">
                  <span className={`rounded-full px-2 py-0.5 text-[13px] font-semibold ${STATUS_STYLE[r.status]}`}>{r.status}</span>
                  {r.status === "REJECTED" && r.rejectionNote && <p className="mt-1 text-[13px] text-faint">{r.rejectionNote}</p>}
                </td>
                <td className="px-3 py-2.5 text-soft">{fmtDateTime(r.updatedAt)}</td>
                <td className="px-3 py-2.5">{r.status === "PENDING" ? <RecruiterRow id={r.id} /> : <span className="text-faint">—</span>}</td>
              </tr>
            ))}
            {recruiters.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-faint">
                  No recruiter applications yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
