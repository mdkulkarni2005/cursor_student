# StudentOS — Remaining work for V1 (step by step)

> Updated 2026-06-19 after the user's clarification: **V1 = the entire app.** Payment is skipped
> (free for first 100 users; added later); deploy is done by the user.
>
> **Done & verified:** Foundation (monorepo, Polaris design, Neon, Clerk auth + onboarding,
> R2, AI Gateway), and the 4 pillars — **Reports, PPT, Assignments, Viva** — each with plan-gating,
> Vault + Semester Workspace, and (reports) plagiarism/humanizer. All run free locally via stubs.

---

## Build order (dependency-aware)

### 1. Reports/PPT on the USER's own template ← the main pillar refinement
Replace "fill our seeded template" with "fill the **user's uploaded** template, never breaking their format."
- **1.1 Upload + store** the user's `.docx` (report) / `.pptx` (PPT) → R2, as a user/college-scoped `Template`.
- **1.2 Pre-check harness** — validate it's real, unlocked OOXML; parse structure (headings, styles, sections, headers/footers); extract a "fillable map" of where content goes.
- **1.3 AI mapping (content only)** — the model produces section content; a deterministic writer injects it under the matched headings, **inheriting the template's own styles** (model never emits the file).
- **1.4 Integrity guard** — re-open the rendered file, verify it's valid + all original styling/headers/footers preserved + sections filled; reject/retry if broken.
- **1.5 Wire into Reports + PPT** — let the user pick "my template" vs default; same for PPT layouts.

### 2. Always-on AI assistant (the WhatsApp-Meta-AI bubble)
The floating bubble is in the UI but inert — make it real. (High daily-use value; reuses all context.)
- **2.1** Bubble → expanding chat panel (desktop dock / mobile full-screen — the imported "AI Mentor" design).
- **2.2** Full user-context grounding (their documents, department, exams, streak).
- **2.3** Photo input + deep-links into tools ("I'm stuck on this assignment" → solver).
- **2.4** Reminders & scheduling + exam-prep plans + system notifications.

### 3. Resume generator (whole pillar)
- **3.1** Resume data model + ATS-structured schema; profile/skills capture.
- **3.2** Generate content; render into an **ATS-friendly template** (the user's provided one).
- **3.3** Export **Word + PDF**; **one-page button** (re-render tighter); edit a line **without breaking format**; upload additions.
- **3.4** **ATS score** + suggested keywords/skills/projects + **target job role** + role keywords.

### 4. Project Ideas + Project Builder
- **4.1** Extended project-info form (built on onboarding data).
- **4.2** Idea suggestions by department — clickable, **compare**, **finalize**; difficulty (3rd-yr/TPCS/mini/major); "model needed?" Q&A **feedback loop**.
- **4.3** Help with **professor-assigned** projects + **stuck-help** (electrical wiring, mechanical calc, etc.).
- **4.4** From a finalized project: generate **report + PPT + viva questions + plagiarism/AI report**.

### 5. Interview preparation
- **5.1** Virtual interview flow using the user's resume — **technical + behavioral**.
- **5.2** **Coding round** in a code-editor environment; **DSA-based** rounds (no system design in V1).
- **5.3** Stuck-detection guidance (~2–3 min), optional **camera**.
- **5.4** Evaluation + **jailbreak resistance** + a suggestions/where-to-improve report.

### 6. DSA practice
- **6.1** Problem set + solve UI (code editor); light **time/space-complexity** exposure + code suggestions.
- **6.2** **Streaks** + **leaderboard** (by branch, limited visibility).
- **6.3** Daily **"streak missing" notifications**.

### 7. Profile link (Aadhar-style, shareable)
Depends on Resume + Projects + DSA + GitHub, so it comes after them.
- **7.1** Public shareable profile route, per-user, department-aware (CS vs non-CS).
- **7.2** **GitHub connect**; resume + projects + questions-solved.
- **7.3** Hosted **clickable projects**; auto **routing/system-design diagrams** from the codebase + language detection.

### 0. Clarifying-questions loop (cross-cutting — applies to every generator)
Before generating, the system checks if it has enough context. If **not** (vague topic, no
guidelines, ambiguous template), it **asks the user** on screen instead of guessing:
- AI returns clarifying questions, each as **single-select / multi-select / free text** (options + a
  custom-type option). The user answers, the answers enrich the context, then it generates.
- Applies to Reports, PPT, Assignments, Projects, etc. (MCP / connected sources as future context inputs.)

### 8. Pillar gaps (slot in alongside)
- **8.1** PPT: **image generation** in slides; **PPT → Report** conversion.
- **8.2** Assignment: full **multi-turn feedback loop** ("should I use this formula?", clarifying questions).

### 9. Finalize
- **9.1** PWA manifest (installable on phone) — completes the "web + phone, same account" goal.
- **9.2** Flip to **real services**: add AI Gateway card → drop `AI_DRIVER`; R2 already live → drop `STORAGE_DRIVER`.
- **9.3** (Skipped now) Razorpay payments — add post-launch. Deploy — user does.

---

**Recommended order:** 1 → 2 → 3 → 4 → 5 → 6 → 7, with 8 slotted opportunistically and 9 at the end.
Rationale: #1 perfects the core pillars; #2 is daily glue; #3 (resume) is needed by #5 (interview) and
#7 (profile); #7 aggregates everything so it's last.
