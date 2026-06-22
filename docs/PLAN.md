# StudentOS — Build Plan (v1)

> **Status:** Draft for approval. Nothing is built yet. Once you approve scope + phasing,
> we start Phase 1.
> **Date:** 2026-06-19

---

## 1. What we are building (one paragraph)

StudentOS is an AI-powered academic operating system — the "Cursor for Students." A student
should be able to complete an entire semester's academic work (assignments, reports, PPTs,
projects, viva prep) from one platform that is **aware of their department, subject, semester,
and university**. It is mobile-first and desktop-powerful, the same account everywhere (web +
PWA), and it returns **structured outputs**, not chat. Career tooling (resume, interview, DSA,
public profile) is real and on the roadmap — but **later**. V1 wins on four pillars.

---

## 2. The four pillars (the only things that must be excellent in V1)

You named these explicitly. Everything else is secondary until these are great.

1. **Assignment Studio** — solve/generate assignments (incl. from a photo, math, code).
2. **Report Generator** — academic reports in **locked per-college formats**.
3. **PPT Generator** — presentations in **locked per-college / per-department formats**.
4. **Viva Preparation** — expected questions + model answers from the above outputs.

The success bar: *a student trusts the output enough to submit it.* That means correct content,
**institutional formatting that never breaks**, low plagiarism, and low AI-detection signal.

---

## 3. Scope decision (please approve / correct this table)

Your two briefs differ. The formal StudentOS doc is the academic V1 core; your voice brief is the
full long-term surface. The only **hard exclusion** in the formal doc is *job-application
automation*. Everything else is just a question of phase.

| Capability | Decision | Phase |
|---|---|---|
| Assignment Studio | **V1 core** | Phase 1 |
| Report Generator (locked formats) | **V1 core** | Phase 1 |
| PPT Generator (locked formats) | **V1 core** | Phase 1 |
| Viva Preparation | **V1 core** | Phase 2 |
| Plagiarism + AI-detection reduction (humanizer) | **V1 core** — a sub-feature *inside* Report/Assignment, not a pillar | Phase 1–2 |
| Semester Workspace + Academic Vault (history, reuse, search) | **V1 core** — the spine everything saves into | Phase 1 |
| Always-on AI assistant ("Meta-AI" style pane) | Supporting | Phase 2 |
| Project Generator + Project Builder (synopsis/report/PPT/timeline/cost) | Important, premium | Phase 3 |
| Reminders / exam-prep scheduling / notifications | Supporting | Phase 3 |
| Resume generation (ATS, one-page button, keyword suggestions) | Career surface | Phase 4 |
| Interview prep (virtual, coding round, camera) | Career surface | Phase 4 |
| Public profile link (GitHub, hosted projects, auto-diagrams) | Career surface | Phase 5 |
| DSA practice (streaks, leaderboard, notifications) | Career surface | Phase 5 |
| **Job boards / referral / auto-apply / LinkedIn automation** | **EXCLUDED — never (per product rules)** | — |

> **Decision needed from you:** confirm Phases 1–2 are the V1 release, and that career features
> (Phases 4–5) come after the academic core is loved by users. If you want resume/interview pulled
> earlier, say so now — it changes the milestones below.

---

## 4. The hardest problem, named up front: formats that never break

You repeated this for both reports and PPTs: *"make sure the format doesn't get broken in any
case."* Each college (and department) has its own locked template. This is the single hardest
engineering problem in the project, and the whole architecture is shaped around it.

**Principle: separate content from format.**

```
LLM generates STRUCTURED CONTENT (validated JSON per document type)
        │
        ▼
DETERMINISTIC TEMPLATE RENDERER injects content into the locked institutional template
        │
        ▼
DOCX / PPTX / PDF  (formatting comes from the template, never from the model)
```

- The LLM **never emits raw document XML or final layout.** It emits a typed object (e.g.
  `ReportContent { abstract, sections[], references[] }`).
- Templates are **stored assets with named placeholders**:
  - **DOCX** → `docxtemplater`-style content controls / merge tags.
  - **PPTX** → template manipulation (`pptxgenjs` for generated decks; placeholder-fill for locked
    institutional decks).
  - **PDF** → render from DOCX/HTML through a deterministic pipeline.
- A **schema validator** sits between the model and the renderer. If content doesn't fit the
  template's slots, we fail loudly and regenerate — we never ship a broken file.

**Why this pays off everywhere else:**
- "Generate a report *from* the PPT" = reuse the same structured content, swap the renderer.
- "One-page resume" button (Phase 4) = re-run the renderer with a tighter template; content is
  already structured data, not prose locked in a file.
- Regeneration, edit-without-breaking-format, and per-college variants are all cheap.

**Template onboarding:** colleges' formats are seeded as template assets (we build a small internal
"template authoring" flow). V1 ships with a handful of common formats + a generic fallback; we add
institutions over time. This is a content/ops task as much as an engineering one — plan for it.

---

## 5. Architecture

**Stack (locked — from the formal spec, not re-litigating):**

- Monorepo: **Turborepo**
- Frontend: **Next.js 16 (App Router) · TypeScript · TailwindCSS · ShadCN UI**
- Backend: **Next.js Route Handlers + Server Actions** (Fluid Compute on Vercel)
- DB: **Neon Postgres + Prisma** _(decided 2026-06-19 — serverless Postgres, DB branching, clean prod migration; replaces the earlier Supabase note)_
- Auth: **Clerk** _(decided 2026-06-19)_
- Storage: **Cloudflare R2** (S3-compatible, no egress fees) — uploads, generated files, templates _(decided 2026-06-19; replaces Supabase Storage)_
- AI access: **Vercel AI Gateway** — unified API for **Claude (primary) + Gemini (fallback)**, with cost tracking + observability; wrapped in a single internal `ai` package _(decided 2026-06-19)_
- Payments: **Razorpay** (India)
- Hosting: **Vercel**
- Mobile: **Responsive web + PWA** now; **Capacitor wrapper** later for Play Store.
- **Design language: "Polaris"** (dark/premium) — imported from claude.ai/design project
  `e7d662fc-faac-411d-b505-0767876ed7ee`. Tokens: base `#0A0E1A`, surface `#131A2B`, raised
  `#1C2740`, accent cyan→indigo (`#22D3EE`→`#818CF8`); fonts Space Grotesk / DM Sans / JetBrains Mono.
- **Note:** Appwrite all-in-one was considered and declined — its DB isn't Postgres, which conflicts
  with the Neon decision; Neon + Prisma + R2 + Clerk keeps each layer best-in-class.

**Cross-platform "WhatsApp web/mobile sync":** this is just a responsive PWA on a shared backend.
The same Clerk account + same Postgres = same data everywhere, instantly. No special real-time sync
infrastructure is needed for V1. (Live collaborative editing, if ever, is a separate later effort.)

**Long-running generation:** report/PPT/project generation can take many seconds. We run these as
**async jobs** (Vercel Functions, 300s budget) with a status record the UI polls, so mobile users
on flaky networks don't lose work. Outputs land in the Vault when ready.

**Suggested monorepo layout:**

```
apps/
  web/                 # Next.js 16 app (web + PWA)
packages/
  ui/                  # ShadCN-based shared components
  db/                  # Prisma schema + client
  ai/                  # Claude/Gemini routing, prompts, schemas, validators
  documents/           # template renderers: docx / pptx / pdf
  templates/           # locked institutional template assets + registry
  config/              # tsconfig, eslint, tailwind preset
```

---

## 6. Data model sketch (not final)

```
User            (Clerk id, plan, department, college, semester, profile form data)
Institution     (college, department, university)
Template        (type: REPORT|PPT|RESUME, institutionId?, schemaVersion, asset ref, placeholders)
Workspace       (per user, per semester)
Subject         (under a workspace)
Document        (type, title, status, subjectId, ownerId)
DocumentContent (structured JSON — the model's output, validated)
DocumentExport  (rendered file refs: docx/pptx/pdf in Supabase)
GenerationJob   (status, input refs, timing, model used, cost)
Upload          (user files: photos, PDFs, reference images)
VivaSet         (questions + answers tied to a source Document)
Subscription    (Razorpay: plan, status, period, usage counters)
UsageEvent      (for plan-gating quotas: assignments/reports/ppts this period)
```

Everything a student makes is a `Document` in a `Workspace` → **Academic Vault** = searchable view
over `Document`. "Never lose your work" is a data-model guarantee, not a feature we bolt on.

---

## 7. The four pillars in depth

### 7.1 Assignment Studio
- **Inputs:** text prompt · PDF · image/screenshot of the question (OCR + vision) · subject ·
  topic · department · semester · word count · instructions.
- **Interactive loop (you emphasized this):** the system asks clarifying/feedback questions before
  finalizing — e.g. *"Which formula should I use here?"* for math, reference type (notebook /
  problem reference), and confirms assumptions. This is a guided flow, not one-shot.
- **Math:** detects formulas/calculations, proposes the formula(s) to apply, asks the user to
  confirm, then solves step-by-step.
- **Code:** if the assignment contains code, generate/explain/fix it with the same feedback loop.
- **Output:** structured answer (cover page, student details, intro, main content, conclusion,
  references). Export PDF/DOCX through the renderer.
- **Saved** to Vault with full history.

### 7.2 Report Generator
- **Inputs:** topic · department · report type (seminar / mini-project / internship / lab /
  research) · guidelines · **target college template**.
- **Output content schema:** abstract · introduction · literature review · methodology · results ·
  conclusion · references.
- **Format:** rendered into the **locked institutional template** (Section 4). Never breaks.
- **Quality gates:** plagiarism check + AI-detection reduction (humanizer) run as a post-process
  the user can toggle/preview before export, with a before/after report.
- **Export:** PDF/DOCX. Re-render to other formats without regenerating content.

### 7.3 PPT Generator
- **Inputs:** topic · department · number of slides · presentation duration · **target
  college/department template**.
- **Output:** slide structure · per-slide content · speaker notes · presentation script · generated
  + formatted images placed into slides.
- **Format:** generated decks via `pptxgenjs`; locked institutional decks via placeholder-fill.
- **Cross-feature:** a report can be generated *from* a PPT and vice versa (shared structured
  content).
- **Export:** PPTX/PDF.

### 7.4 Viva Preparation
- **Inputs:** an existing Document (project / assignment / report).
- **Output:** expected questions · model answers · difficulty levels · "what panels usually ask."
- Ties directly to Vault items so prep is always grounded in the student's actual work.

---

## 8. Plan-gating & payments (Razorpay)

Gate features by plan; enforce quotas via `UsageEvent` counters reset per billing period.

| | **Free** | **Pro — ₹299/mo** | **Premium — ₹499/mo** |
|---|---|---|---|
| Assignments | 5 / month | Unlimited | Unlimited |
| Reports | 2 / month | Unlimited | Unlimited |
| PPTs | 2 / month | Unlimited | Unlimited |
| Semester Workspace | Basic | ✅ | ✅ |
| Export (DOCX/PPTX/PDF) | Limited | ✅ | ✅ |
| Project Builder + Viva + Cost/Planning | — | — | ✅ |

- Enforcement lives in a single server-side `entitlements` check before any generation job starts —
  never trust the client. A blocked user gets an upgrade prompt, not a failed job.
- Razorpay webhooks update `Subscription`; quotas read from `Subscription` + `UsageEvent`.

---

## 9. Phased roadmap

**Phase 0 — Foundation (enables everything)**
Turborepo + Next.js 16 app · Clerk auth · Prisma/Postgres schema · Supabase storage · `ai` package
(Claude+Gemini routing) · `documents` renderer skeleton (DOCX/PPTX/PDF) · onboarding form
(department/college/semester) · Workspace + Vault shell.

**Phase 1 — Pillars: content + format (the core bet)**
Assignment Studio (incl. photo/OCR, math, code, feedback loop) · Report Generator with **locked
template rendering** · PPT Generator with **locked template rendering** · plagiarism +
humanizer pass · exports · Vault save/search · Razorpay + plan-gating.

**Phase 2 — Trust & assist**
Viva Preparation · always-on AI assistant pane (grounded in the student's context) · Study
Assistant (department-aware) · template authoring/onboarding flow for more colleges.

**Phase 3 — Projects & lifecycle**
Engineering Project Generator (ideas, scope, complexity, cost, components, compare/finalize loop) ·
Project Builder (synopsis/report/PPT/timeline/cost) · reminders & exam-prep scheduling/notifications.

**Phase 4 — Career surface A**
Resume generation (ATS scoring, one-page button, keyword/skill/project suggestions, target-role
detection) · interview prep (virtual interview, coding round in an editor, behavioral + DSA rounds;
*no system-design in V1*).

**Phase 5 — Career surface B**
Public profile link (resume + hosted projects + GitHub connect + auto-generated architecture/routing
diagrams) · DSA practice (problems, streaks, leaderboard, daily notifications).

---

## 10. Milestones (proposed, adjust after approval)

- **M1 (Phase 0):** Skeleton app deployed, auth + DB + storage live, a "hello" report renders into a
  real DOCX template end-to-end (proves the format pipeline).
- **M2 (Phase 1a):** Assignment Studio usable end-to-end with history.
- **M3 (Phase 1b):** Report + PPT generators shipping locked-format exports; payments + gating live.
  → **This is the V1 launch candidate.**
- **M4 (Phase 2):** Viva prep + AI assistant + 5–10 college templates onboarded.

---

## 11. Open questions for you (don't block — answer at approval)

1. **Scope:** confirm V1 = Phases 1–2 (academic core), career features after. (Section 3 table.)
2. **Templates:** can you provide 2–3 real college report/PPT formats to seed the renderer? The
   pipeline is only as good as the templates we can target first.
3. **Humanizer:** which humanizer API are you leaning toward (you mentioned one)? Affects Phase 1.
4. **Plagiarism check:** build vs. integrate a third-party API? (Recommend integrate.)
5. **Resume template:** you mentioned sending yours — we'll use it as the first resume template asset
   in Phase 4.
6. **Flutter design link — most urgent:** you said twice you'd send the Flutter front-end design
   link; it hasn't arrived yet. We need it **before Phase 0 UI work** to build "every single page" to
   your design. Please send it at approval.

---

## 12. What I'd add that your briefs didn't make explicit

- **Template onboarding is an ops pipeline, not just code** — plan time for collecting/authoring
  real college formats. It's the moat and the bottleneck.
- **Async job model** for all heavy generation, so mobile users never lose work mid-generation.
- **Server-side entitlements as one chokepoint** — the only safe way to gate by plan.
- **A `documents` package as the single source of truth for rendering** — every export, every
  format, every "regenerate," goes through it. Don't let rendering logic leak into feature code.
- **Abuse/jailbreak resistance** for the interview evaluator (Phase 4) needs design when we get
  there — noting it now so it isn't a surprise.

---

**Next step:** you approve/correct Section 3 (scope) and Section 9 (phasing). Then we start
**Phase 0**.
