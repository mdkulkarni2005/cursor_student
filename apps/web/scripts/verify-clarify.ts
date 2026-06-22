/**
 * Proves the clarifying-questions loop: asks when context is thin, ready when rich.
 *   AI_DRIVER=stub pnpm --filter web verify:clarify
 */
import { assessContext, answersToContext } from "@studentos/ai";

async function main() {
  const thin = await assessContext({ task: "report", topic: "AI", department: "CS" });
  const rich = await assessContext({
    task: "report",
    topic: "Waste Heat Recovery in IC Engines",
    context: "Focus on TEG and Rankine; ~1500 words; for a seminar panel.",
    department: "Mechanical Engineering",
  });

  console.log(`  thin → ready=${thin.ready}, questions=${thin.questions.length}`);
  console.log(`  rich → ready=${rich.ready}, questions=${rich.questions.length}`);

  const folded = answersToContext(thin.questions, {
    focus: "thermal efficiency gains",
    depth: "In-depth",
    audience: "Seminar / panel",
  });
  console.log(`  folded context: ${folded.replace(/\n/g, " | ")}`);

  const ok = thin.ready === false && thin.questions.length > 0 && rich.ready === true && folded.length > 0;
  console.log(ok ? "✓ PASS — asks when context is thin, ready when rich; answers fold into context." : "✗ FAIL");
  if (!ok) process.exit(1);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
