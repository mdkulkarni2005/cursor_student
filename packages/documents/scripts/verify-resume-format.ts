/**
 * Structural fidelity guard for the house resume format. Renders a resume and asserts
 * the OOXML metrics extracted from the reference .docx (A4, margins, name/heading sizes,
 * section border, borderless 2-col entry tables). Catches metric drift without a visual
 * render. (The human side-by-side eyeball remains the close-out gate for overall look.)
 *   pnpm --filter @studentos/documents verify:resume-format
 */
import PizZip from "pizzip";
import { renderResumeDocx, type Resume } from "../src/resume.js";

const resume: Resume = {
  contact: { name: "Test Student", phone: "+91 90000 00000", email: "t@x.com", location: "Pune, MH", linkedin: "linkedin.com/in/test" },
  summary: "Final-year engineering student shipping real projects.",
  skills: [{ category: "Languages", items: ["TypeScript", "Python"] }],
  experience: [
    { organization: "Acme Corp", role: "Intern", location: "Remote", dates: { start: "Jan 2026", end: "Present" }, bullets: ["Did a thing", "Did another thing"] },
  ],
  projects: [
    { name: "CoolApp", role: "Developer", location: "Remote", dates: { start: "Feb 2026", end: "Present" }, bullets: ["Built it"], link: "github.com/test/coolapp" },
  ],
  education: [
    { institution: "Shri Vile Parle Kelavani Mandal Institute of Technology, Dhule", degree: "B.Tech, Mechanical", dates: { start: "Nov 2022", end: "Jul 2026" } },
  ],
};

async function main() {
  const { buffer } = await renderResumeDocx(resume);
  const s = new PizZip(buffer).file("word/document.xml")!.asText();

  const checks: [string, boolean][] = [];
  const m = (re: RegExp) => re.exec(s);

  const pg = m(/<w:pgSz w:w="(\d+)" w:h="(\d+)"/);
  checks.push(["A4 page 11905x16837", !!pg && pg[1] === "11905" && pg[2] === "16837"]);
  const mar = m(/<w:pgMar w:top="(\d+)"[^>]*w:right="(\d+)"[^>]*w:bottom="(\d+)"[^>]*w:left="(\d+)"/);
  checks.push(["margins 400", !!mar && new Set(mar.slice(1, 5)).size === 1 && mar[1] === "400"]);
  checks.push(["name sz 62", s.includes('<w:sz w:val="62"/>')]);
  checks.push(["heading sz 24", s.includes('<w:sz w:val="24"/>')]);
  checks.push(["heading bottom border", /<w:pBdr><w:bottom w:val="single"/.test(s)]);
  checks.push(["table grid 6663/4442", s.includes('<w:gridCol w:w="6663"/>') && s.includes('<w:gridCol w:w="4442"/>')]);
  checks.push(["cell borders none", (s.match(/w:val="none"/g) ?? []).length >= 4]);
  checks.push(["entry tables present (exp+proj+edu = 3)", (s.match(/<w:tbl>/g) ?? []).length === 3]);
  checks.push(["body default sz 22", s.includes('<w:sz w:val="22"/>')]);
  // Long institution name must live inside a cell (not overflow) — its text is present.
  checks.push(["long institution rendered", s.includes("Shri Vile Parle Kelavani Mandal Institute")]);

  for (const [name, ok] of checks) console.log(`  ${ok ? "✓" : "✗"} ${name}`);
  const pass = checks.every(([, ok]) => ok);
  console.log(pass ? "✓ PASS — resume format matches the reference .docx metrics." : "✗ FAIL — format drift.");
  if (!pass) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
