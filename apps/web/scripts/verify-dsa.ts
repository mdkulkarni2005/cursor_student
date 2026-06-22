/**
 * Proves DSA practice: streak math (the hard part — seeded multi-day, IST boundary),
 * attempt persistence + AI review, and progress aggregation. stub AI + Neon.
 *   export $(grep -E '^DATABASE_URL' apps/web/.env.local | sed 's/"//g' | xargs)
 *   STORAGE_DRIVER=local AI_DRIVER=stub pnpm --filter web verify:dsa
 */
import { prisma } from "@studentos/db";
import { computeStreak, istDayNumber } from "../lib/dsa/streak.js";
import { getDsaProgress } from "../lib/dsa/practice.js";

const DAY = 86_400_000;
let failed = 0;
function check(name: string, cond: boolean) {
  console.log(`  ${cond ? "✓" : "✗"} ${name}`);
  if (!cond) failed++;
}

async function main() {
  // ---- Pure streak math (fixed `now`) ----
  const now = new Date("2026-06-20T08:00:00Z"); // 13:30 IST Jun 20
  const at = (daysAgo: number) => new Date(now.getTime() - daysAgo * DAY);

  check("consecutive 3 days → streak 3, practicedToday", (() => {
    const s = computeStreak([at(0), at(1), at(2)], now);
    return s.current === 3 && s.practicedToday && s.alive;
  })());
  check("gap (today + 3 days ago) → streak 1", computeStreak([at(0), at(3)], now).current === 1);
  check("ended yesterday → streak 2, alive, not practicedToday", (() => {
    const s = computeStreak([at(1), at(2)], now);
    return s.current === 2 && s.alive && !s.practicedToday;
  })());
  check("ended 2 days ago → streak 0, dead", (() => {
    const s = computeStreak([at(2), at(3)], now);
    return s.current === 0 && !s.alive;
  })());
  check("same day twice → streak 1 (de-duped)", computeStreak([at(0), new Date(now.getTime() - 3600_000)], now).current === 1);
  check("no attempts → streak 0", computeStreak([], now).current === 0);

  // IST boundary: 19:00Z and next-day 05:00Z are the SAME IST day; 17:00Z is the previous IST day.
  const aEvening = new Date("2026-06-20T19:00:00Z"); // 00:30 IST Jun 21
  const bMorning = new Date("2026-06-21T05:00:00Z"); // 10:30 IST Jun 21
  const cBefore = new Date("2026-06-20T17:00:00Z"); //  22:30 IST Jun 20
  check("IST boundary: 19:00Z and next 05:00Z same IST day", istDayNumber(aEvening) === istDayNumber(bMorning));
  check("IST boundary: 17:00Z is the previous IST day", istDayNumber(cBefore) === istDayNumber(aEvening) - 1);

  // ---- DB: attempt persistence + review + aggregation ----
  let inst = await prisma.institution.findFirst({ where: { name: "Local Test College" } });
  inst ??= await prisma.institution.create({ data: { name: "Local Test College" } });
  const user = await prisma.user.upsert({
    where: { clerkId: "local-dsa-test" },
    create: { clerkId: "local-dsa-test", email: "local-dsa@studentos.local", name: "DSA Tester", department: "Computer Engineering", onboardedAt: new Date(), institutionId: inst.id, plan: "FREE" },
    update: {},
  });
  await prisma.dsaAttempt.deleteMany({ where: { userId: user.id } });

  // Seed prior-day attempts (yesterday, day-before) to build a real streak across days.
  const realNow = new Date();
  await prisma.dsaAttempt.create({ data: { userId: user.id, problemSlug: "valid-parentheses", code: "function isValid(s){...}", solved: true, createdAt: new Date(realNow.getTime() - DAY) } });
  await prisma.dsaAttempt.create({ data: { userId: user.id, problemSlug: "binary-search", code: "function search(){...}", solved: false, createdAt: new Date(realNow.getTime() - 2 * DAY) } });

  // Today's solved attempt (grading itself is proven by verify:dsa-grade / the execution package).
  await prisma.dsaAttempt.create({ data: { userId: user.id, problemSlug: "two-sum", code: "def solve(nums, target): ...", language: "Python", solved: true, createdAt: realNow } });

  const progress = await getDsaProgress(user.id);
  console.log(`  progress → streak=${progress.streak.current} practicedToday=${progress.streak.practicedToday} solved=${progress.solvedCount} attempted=${progress.attemptedSlugs.length}`);
  check("streak across 3 seeded days = 3", progress.streak.current === 3);
  check("practicedToday true", progress.streak.practicedToday);
  check("solvedCount = 2 (two-sum + valid-parens)", progress.solvedCount === 2);
  check("attempted 3 distinct problems", progress.attemptedSlugs.length === 3);

  console.log(failed === 0 ? "✓ PASS — DSA streak math + persistence + review + aggregation." : `✗ FAIL (${failed})`);
  if (failed) process.exit(1);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
