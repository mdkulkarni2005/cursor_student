/**
 * Renders the reference resume content into the house ATS format, so you can open
 * the output and compare it side-by-side with the original PDF (the fidelity gate).
 *   pnpm --filter @studentos/documents resume:sample
 *   → opens at packages/documents/out/resume-sample.docx
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { renderResumeDocx, type Resume } from "../src/resume.js";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "..", "out");
const outPath = join(outDir, "resume-sample.docx");

const resume: Resume = {
  contact: {
    name: "Manas Kulkarni",
    phone: "+91 92267 93192",
    email: "mdkulkarni2005@gmail.com",
    location: "Dhule, MH, India",
    linkedin: "linkedin.com/in/manas-kulkarni-44045229a/",
  },
  summary:
    "Self-taught full-stack developer and co-founder building production AI products while completing a Mechanical Engineering degree. Specialise in TypeScript-first monorepos, AI agent infrastructure, and shipping end-to-end from architecture to deployment. Seeking software engineering or AI product roles where I can apply hands-on experience building real products with real users.",
  skills: [
    { category: "Languages", items: ["TypeScript", "JavaScript", "HTML/CSS"] },
    { category: "Frontend", items: ["React.js", "Next.js", "React Ink", "Tailwind CSS"] },
    { category: "Backend & Runtime", items: ["Node.js", "Convex", "Inngest(AgentKit)", "REST APIs", "JWT", "Google Auth", "OpenAPI"] },
    { category: "AI & LLMs", items: ["NVIDIA NIM", "Vercel AI SDK", "MCP", "multi-agent orchestration"] },
    { category: "DevOps & Infra", items: ["Docker", "GitHub Actions", "Vercel", "pnpm", "Turborepo(monorepo)", "DNS config", "Google Search Console"] },
    { category: "Auth & Payments", items: ["Clerk", "Custom JWT(RS256 phone-based)"] },
    { category: "Tools & Practices", items: ["Git", "Zod", "JSONL", "Tauri", "Web Push", "cron jobs", "async-first workflows", "Postman"] },
  ],
  experience: [
    {
      organization: "Quorium Technologies",
      role: "Software Engineer",
      location: "Remote",
      dates: { start: "January 2026", end: "Present" },
      bullets: [
        "Architected an AI-native app builder platform generating cross-platform mobile and web applications from natural language prompts, reducing app prototyping time by 80%",
        "Engineered the core product frontend and backend using Next.js, TypeScript, and Node.js, serving 500+ early-access users",
        "Implemented Docker containerization and GitHub Actions CI/CD pipelines, cutting deployment time from 30 min to under 5 min",
        "Collaborated with product and design teams in an async-first remote workflow using Git, Slack, and Notion",
      ],
    },
  ],
  projects: [
    {
      name: "Brahma - AI Coding Agent (Terminal-based)",
      role: "Full Stack Developer",
      location: "Remote",
      dates: { start: "January 2026", end: "Present" },
      bullets: [
        "Built a local AI coding agent platform inspired by Claude Code, enabling natural-language software development workflows.",
        "Tech: TypeScript, Next.js, React, Node.js, Turborepo, pnpm, Tauri, NVIDIA NIM.",
        "Implemented an interactive REPL, single-task execution mode, and a browser-based web UI for agent-driven coding.",
        "Added multi-agent orchestration, long-term memory support, MCP integration, and 22 built-in developer tools.",
      ],
      link: "https://github.com/mdkulkarni2005",
    },
    {
      name: "Kaam — Hyperlocal Jobs Platform",
      role: "Full-Stack Developer",
      location: "Remote",
      dates: { start: "May 2026", end: "Present" },
      bullets: [
        "Built and shipped a production hyperlocal jobs platform connecting non-technical workers with local employers, serving 200–300 daily active users",
        "Architected a mobile-first Next.js (App Router) app with Convex real-time backend and a dual authentication system — Google OAuth via Clerk plus an in-house RS256 phone-based JWT session flow",
        "Implemented push notifications and identity verification services",
        "Owned the full production stack end-to-end: Vercel deployment, custom domain with DNS configuration, and Google Search Console setup.",
      ],
      link: "https://github.com/mdkulkarni2005",
    },
    {
      name: "RemindOS - Clutter to Clarity",
      role: "Full-Stack Developer",
      location: "Remote",
      dates: { start: "March 2026", end: "Present" },
      bullets: [
        "Built and shipped a chat-first AI productivity app serving 200–300 daily active users — Next.js 16, React 19, Convex, Clerk, and NVIDIA NIM, where users create/prioritize/share reminders via natural-language chat with real-time sync",
        "Delivered cron-driven evening briefings + overdue nudges over Web Push (PWA), an admin dashboard, and a Playwright E2E suite — all in a TypeScript Turborepo.",
      ],
      link: "https://github.com/mdkulkarni2005",
    },
  ],
  education: [
    {
      institution: "Shri Vile Parle Kelavani Mandal Institute of Technology, Dhule",
      degree: "Bachelor's, Mechanical Engineering",
      dates: { start: "November 2022", end: "July 2026" },
    },
  ],
};

async function main() {
  mkdirSync(outDir, { recursive: true });
  const { buffer } = await renderResumeDocx(resume);
  writeFileSync(outPath, buffer);
  console.log(`✓ rendered → ${outPath} (${buffer.length} bytes)`);
  console.log("  Open it and compare with the reference PDF to check format fidelity.");
}

main().catch((e) => { console.error(e); process.exit(1); });
