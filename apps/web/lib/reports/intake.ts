import type { ClarifyQuestion } from "@studentos/ai";

/**
 * Deterministic, report-type-specific intake questions. These are ALWAYS asked on the first
 * pass (alongside any AI-detected gaps) so we collect the real-world facts only the student
 * knows — and, crucially, their `id` doubles as a field key used to fill the template's
 * cover/certificate placeholders (see fillPlaceholders in @studentos/documents).
 *
 * Keep ids stable and aligned with the placeholder field keys: company, role, duration,
 * mentor, technologies, prn, teammates, tools, objective.
 */
export const REPORT_INTAKE: Record<string, ClarifyQuestion[]> = {
  internship: [
    { id: "company", question: "What is the name of the company / organization where you interned?", type: "text", options: [] },
    { id: "role", question: "What was your role / designation during the internship?", type: "text", options: [] },
    { id: "duration", question: "How long was the internship?", type: "single", options: ["4 weeks", "6 weeks", "2 months", "3 months", "6 months"] },
    { id: "mentor", question: "Who was your industry mentor / guide? (name & designation)", type: "text", options: [] },
    { id: "technologies", question: "Which tools / technologies did you work with?", type: "text", options: [] },
    { id: "prn", question: "What is your PRN / Roll number?", type: "text", options: [] },
  ],
  "mini-project": [
    { id: "objective", question: "What problem does your project solve, in one line?", type: "text", options: [] },
    { id: "technologies", question: "Which tools / technologies / languages did you use?", type: "text", options: [] },
    { id: "teammates", question: "Did you work in a team? List teammate names (or say 'solo').", type: "text", options: [] },
    { id: "mentor", question: "Who was your project guide? (name & designation)", type: "text", options: [] },
    { id: "prn", question: "What is your PRN / Roll number?", type: "text", options: [] },
  ],
  research: [
    { id: "objective", question: "What is the core research question or hypothesis?", type: "text", options: [] },
    { id: "method", question: "What method / approach did you use (experiment, survey, simulation)?", type: "text", options: [] },
    { id: "mentor", question: "Who guided this research? (name & designation)", type: "text", options: [] },
  ],
  lab: [
    { id: "objective", question: "What is the aim of this experiment?", type: "text", options: [] },
    { id: "apparatus", question: "What apparatus / equipment / materials did you use?", type: "text", options: [] },
  ],
  seminar: [
    { id: "objective", question: "What is the key takeaway you want this seminar to convey?", type: "text", options: [] },
  ],
};

export function intakeQuestions(reportType: string): ClarifyQuestion[] {
  return REPORT_INTAKE[reportType] ?? [];
}
