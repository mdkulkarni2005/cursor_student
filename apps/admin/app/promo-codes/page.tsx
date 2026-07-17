import { prisma } from "@studentos/db";
import { requireAdmin } from "@/lib/admin";
import { NotAuthorized } from "@/components/not-authorized";
import { AdminShell } from "@/components/shell";
import { createPromoCode } from "./actions";
import { PromoCodeToggle } from "./promo-code-toggle";

export const metadata = { title: "Promo Codes — Admin" };

function fmtValue(discountType: string, value: number): string {
  if (discountType === "FREE_TRIAL_EXTENSION") return `+${value}d trial`;
  if (discountType === "PERCENT_OFF") return `${value}% off`;
  return `₹${(value / 100).toFixed(2)} off`;
}

export default async function PromoCodesPage() {
  const guard = await requireAdmin();
  if (!guard.ok) return <NotAuthorized reason={guard.reason} />;

  const [codes, tiers] = await Promise.all([
    prisma.promoCode.findMany({
      orderBy: { createdAt: "desc" },
      include: { planTier: { select: { name: true } } },
    }),
    prisma.planTier.findMany({ orderBy: [{ audience: "asc" }, { sortOrder: "asc" }], select: { id: true, name: true, audience: true } }),
  ]);

  return (
    <AdminShell>
      <div className="mb-5">
        <h1 className="font-display text-[24px] font-bold text-ink">Promo codes</h1>
        <p className="mt-1 text-[13px] text-muted">
          Redeemable once per account (student or recruiter) — see apps/web/lib/actions/promo.ts.
        </p>
      </div>

      <form action={createPromoCode} className="mb-6 grid gap-2 rounded-2xl border border-line bg-card p-4 sm:grid-cols-3 lg:grid-cols-6">
        <input
          name="code"
          placeholder="CODE2026"
          required
          className="rounded-lg border border-line bg-input px-2.5 py-2 text-[13px] uppercase text-ink placeholder:text-faint placeholder:normal-case"
        />
        <select name="discountType" required className="rounded-lg border border-line bg-input px-2.5 py-2 text-[13px] text-ink">
          <option value="FREE_TRIAL_EXTENSION">Free trial extension (days)</option>
          <option value="PERCENT_OFF">Percent off (0-100)</option>
          <option value="AMOUNT_OFF">Amount off (cents)</option>
        </select>
        <input
          type="number"
          name="value"
          min={0}
          placeholder="Value"
          required
          className="rounded-lg border border-line bg-input px-2.5 py-2 text-[13px] text-ink placeholder:text-faint"
        />
        <select name="planTierId" className="rounded-lg border border-line bg-input px-2.5 py-2 text-[13px] text-ink">
          <option value="">No specific plan</option>
          {tiers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.audience === "STUDENT" ? "Student" : t.audience === "PROFESSIONAL" ? "Working professional" : "Recruiter"} — {t.name}
            </option>
          ))}
        </select>
        <input
          type="number"
          name="maxRedemptions"
          min={1}
          placeholder="Max redemptions (blank = unlimited)"
          className="rounded-lg border border-line bg-input px-2.5 py-2 text-[13px] text-ink placeholder:text-faint"
        />
        <div className="flex items-center gap-2">
          <input type="date" name="expiresAt" className="w-full rounded-lg border border-line bg-input px-2 py-2 text-[12.5px] text-ink" />
          <button type="submit" className="shrink-0 rounded-lg bg-cyan px-3 py-2 text-[12.5px] font-semibold text-on-accent hover:opacity-90">
            Create
          </button>
        </div>
      </form>

      <div className="overflow-x-auto rounded-2xl border border-line bg-card">
        <table className="w-full text-left text-[12.5px]">
          <thead className="border-b border-line text-[11px] uppercase tracking-wide text-faint">
            <tr>
              {["Code", "Discount", "Plan", "Redemptions", "Expires", "Status", "Actions"].map((h) => (
                <th key={h} className="px-3 py-2.5 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {codes.map((c) => (
              <tr key={c.id} className="border-b border-line/60 last:border-0 hover:bg-surface">
                <td className="px-3 py-2.5 font-mono font-medium text-ink">{c.code}</td>
                <td className="px-3 py-2.5 text-soft">{fmtValue(c.discountType, c.value)}</td>
                <td className="px-3 py-2.5 text-soft">{c.planTier?.name ?? "—"}</td>
                <td className="px-3 py-2.5 text-soft">
                  {c.redemptions}
                  {c.maxRedemptions ? ` / ${c.maxRedemptions}` : ""}
                </td>
                <td className="px-3 py-2.5 text-soft">{c.expiresAt ? new Date(c.expiresAt).toLocaleDateString("en-IN") : "—"}</td>
                <td className="px-3 py-2.5">
                  {c.active ? <span className="text-success">Active</span> : <span className="text-faint">Inactive</span>}
                </td>
                <td className="px-3 py-2.5">
                  <PromoCodeToggle id={c.id} active={c.active} />
                </td>
              </tr>
            ))}
            {codes.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-faint">
                  No promo codes yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
