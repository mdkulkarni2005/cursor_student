/**
 * Proves the always-on assistant: chatAssistant replies, grounded in user context,
 * and is context-aware (tool routing). stub AI. (UI round-trip is verified by driving
 * the app — a script can't prove the bubble/panel behavior.)
 *   STORAGE_DRIVER=local AI_DRIVER=stub pnpm --filter web verify:assistant
 */
import { chatAssistant, streamAssistant, type AssistantContext } from "@studentos/ai";

const ctx: AssistantContext = {
  name: "Asha Rao",
  department: "Computer Engineering",
  semester: "5",
  college: "Local Test College",
  plan: "Pro",
  documents: [
    { title: "IoT in Agriculture", type: "REPORT", status: "READY" },
    { title: "Smart Energy Meter", type: "PPT", status: "READY" },
  ],
};

async function main() {
  const greet = await chatAssistant([{ role: "user", content: "hi" }], ctx);
  const reportQ = await chatAssistant([{ role: "user", content: "help me write a report on solar cells" }], ctx);
  const pptQ = await chatAssistant([{ role: "user", content: "can you make a presentation about robotics" }], ctx);

  // Project stuck-help (4.3): focused chat references the specific project.
  const stuck = await chatAssistant([{ role: "user", content: "I'm stuck on my project, the sensor won't read" }], {
    ...ctx,
    focusProject: { title: "Smart Soil Monitor", summary: "ESP32 + moisture sensors", skills: ["ESP32", "I2C", "Embedded C"], hardwareNote: "Needs NPK sensors" },
  });

  console.log(`  greet → ${greet.reply.slice(0, 70)}…  [model:${greet.model}]`);
  console.log(`  report → routes to Reports: ${/report/i.test(reportQ.reply)}`);
  console.log(`  ppt → routes to PPT: ${/ppt|deck|slide/i.test(pptQ.reply)}`);
  console.log(`  stuck-help → names the project: ${/smart soil monitor/i.test(stuck.reply)}  (${stuck.reply.slice(0, 60)}…)`);

  // Streaming + onFinish persistence hook (stub streams the canned reply as a Response).
  let finishedText = "";
  const res = await streamAssistant([{ role: "user", content: "hi" }], ctx, { onFinish: (t) => { finishedText = t; } });
  const streamed = await res.text();
  const streamOk = streamed.length > 0 && streamed === finishedText && streamed.includes("Asha");
  console.log(`  stream → bytes:${streamed.length} onFinish-fired:${finishedText.length > 0} matches:${streamed === finishedText}`);

  const greetsByName = greet.reply.includes("Asha");
  const ok =
    greetsByName &&
    /report/i.test(reportQ.reply) &&
    /ppt|deck|slide/i.test(pptQ.reply) &&
    /smart soil monitor/i.test(stuck.reply) &&
    streamOk &&
    greet.model === "stub";
  console.log(`  greets by name: ${greetsByName}`);
  console.log(ok ? "✓ PASS — assistant replies, grounded + tool-aware + project stuck-help." : "✗ FAIL");
  if (!ok) process.exit(1);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
