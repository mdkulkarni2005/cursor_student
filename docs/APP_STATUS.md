# StudentOS — Full App Status (vs. the original vision)

> Mapped against your complete feature spec. Legend: ✅ done · 🟡 partial · 🔴 not built.
> Companion: `docs/BUILD_ORDER.md` (active plan), `docs/DEFERRED.md` (parking lot).

---

## 1. Report generation — ✅ (real plagiarism/AI APIs remain)
- ✅ Custom **college format** via uploaded `.docx` template; headings detected, content injected, **format
  never breaks** (integrity guard + fallback).
- ✅ Clarifying-questions loop (before + mid-generation), download DOCX.
- 🟡 **Plagiarism / AI-detection score + Humanizer** — works but is a **deterministic heuristic** (`lib/quality.ts`),
  NOT a real detector/humanizer API. **Remaining:** integrate a real plagiarism API, a real AI-detection API,
  and a real **Humanizer API**.

## 2. PPT generation — ✅ (slide images need an image model on)
- ✅ Content generation; **college/department template** theme (colors/fonts) + **exact-layout cloning** (OOXML).
- ✅ **Per-slide image generation** + layout — but OFF unless an image model is enabled (cost).
- ✅ **PPT → Report** conversion.
- 🟡 Same plagiarism/AI-detection caveat as reports.

## 3. Resume — ✅ (one gap: "suggest multiple formats")
- ✅ Locked **house format** (your template), **never breaks**; ATS-friendly, industry-standard.
- ✅ **Edit any line** without breaking format; **import/upload** an existing resume; **one-page button**;
  **download DOCX + PDF**.
- ✅ **ATS score while creating**, **target job role** + keyword families (full-stack/frontend/senior/junior…),
  **missing-keyword suggestions**.
- 🟡 "**Suggest several resume formats** by skills/profile" — we use ONE house format, we don't offer a choice of
  formats. **Remaining** if you want multiple templates.
- 🟡 "Add these **projects**" suggestions — keyword/skill suggestions exist; project suggestions are light.

## 4. Assignment — ✅ core (richer inputs + code-exec remain)
- ✅ **Photo of the question** → reads + solves; step-by-step answer; DOCX.
- ✅ **Multi-turn feedback loop** (ask "which formula?", "redo step 3" → revises the solution).
- 🟡 **Custom reference properties** (notebook ref, problem ref) — only a free-text "instructions" field today.
- 🟡 **Code in assignments** — read as text, **not executed** (could reuse the Piston sandbox — not wired).
- 🟡 **"Should I use this formula?"** dedicated interactive math loop — exists generically via the tutor loop,
  not a purpose-built formula-chooser.

## 5. Project ideas + builder — ✅ (professor-assigned flow is light)
- ✅ **Mandatory onboarding form** captures user info; **department-aware idea suggestions**; user can seed their
  own thought; ideas are **clickable, multi-select, compare, finalize**.
- ✅ **Difficulty** (mini/major/TPCS/3rd-year), hardware-needed, clarify/feedback loop.
- ✅ **Stuck-help** (electrical wiring, mechanical calc, sensor/bug) via the always-on assistant.
- ✅ **Generate report + PPT + viva** bundle for the project; **panel/teacher question list**.
- 🟡 **Professor-assigned custom project** — works via finalize, but the guided "gather all required data the
  system asks for" flow is generic, not a dedicated wizard.
- 🟡 Plagiarism/AI-report on project docs — heuristic (same as #1).

## 6. Interview preparation — ✅ (voice needs YOUR live test)
- ✅ Virtual interview grounded in **resume + pasted JD**; **technical + behavioral + coding/DSA** rounds.
- ✅ **CodeMirror editor** ("VS Code-like"); **runnable** questions execute via the sandbox; design questions
  assessed on approach.
- ✅ **Stuck nudge** (~2.5 min); **camera**; **jailbreak-resistant evaluation** + suggestions + report.
- ✅ **Voice (VAPI)** — AI speaks questions, candidate answers by voice, continuous flow. **Needs your browser
  test (I can't run a mic).**
- ⏸️ **System design** — you said DON'T add yet. (Intentionally excluded.)

## 7. Profile link (Aadhaar-like shareable) — ✅ built (2026-07-15 correction — was stale)
- ✅ Public shareable route at `/u/[handle]` (`apps/web/app/u/[handle]/page.tsx`), gated by
  `User.publicHandle` — set on first "Share Profile" from the profile actions.
- 🔴 **GitHub connect** (repo-derived data) and auto **routing/system-design diagrams from the
  codebase** are still not built — the page renders existing DB data (resume/projects/DSA-solved),
  not anything pulled live from GitHub.
- *Previously marked "NOT BUILT / biggest gap" in this doc — that was out of date; the doc, not the
  code, was wrong. Corrected after a 2026-07-15 audit.*

## 8. DSA practice — ✅ core (3 items remain)
- ✅ Problem catalog; **real execution grading** (Python/JS/TS — pass-all-tests = solved); **streak** (real,
  IST); **code review** (time/space complexity, light, not LeetCode-deep); cross-department access.
- 🔴 **Java + C++ grading** (= "A2", set aside).
- 🔴 **Leaderboard** (top + your rank, hide details) — deferred (data already exists).
- 🔴 **Daily "streak missing" notification** — needs the notification infra (see #9).

## 9. Always-on AI mentor — ✅ chat (reminders/planner remain)
- ✅ **Always-on chat bubble** (WhatsApp-Meta-AI style), full user context, **photo/vision**, streaming, persists.
- 🔴 **AI reminders** (assignment due, exam) + **user-scheduled** reminders.
- 🔴 **Exam prep plan + system notifications** ("exam in 15 days → here's your plan").
- *Both need a **notification/cron + delivery (push/email)** layer that doesn't exist yet.*

## 10. Cross-platform (web + phone, same account) — 🟡
- ✅ **Same account, same Neon DB** across web + mobile (Clerk); responsive shell + mobile bottom nav.
- 🟡 **Mobile polish** — responsive, but some secondary pages reachable only via the home grid (no full drawer).
- 🔴 **True real-time sync** (WhatsApp-web-style instant push between devices) — today data syncs on load/refresh
  via the shared DB, not via live websockets.
- 🔴 **PWA / installable** app.

## 11. Plans & payments — ✅ built, gated by admin switch (2026-07-15 correction — was stale)
- ✅ **Plan-gating** (`lib/entitlements.ts`), a **real `/plans` pricing page**, and full **Razorpay
  checkout** (`/plans/checkout`, `/api/checkout/verify`, `/api/webhooks/razorpay`) all exist and are
  live in `apps/web` — plus a parallel build in `apps/recruiter` (own pricing/checkout, `RECRUITER`
  audience `PlanTier`s).
- ✅ **Admin master switch** — `PAYMENTS_ENABLED` (apps/admin `/platform` → "Payments" card,
  `packages/db/src/payments.ts`). Defaults OFF; while off, pricing still shows but the "Upgrade" CTA
  reads "Launching soon" and `/plans/checkout` 404s in both apps. Admin flips it on when ready — no
  deploy needed. PlanTier pricing config and manual admin plan grants (`apps/admin/app/users/[id]`)
  work regardless of this switch.
- 🟡 PRO and PREMIUM tier limits are still admin-configured JSON, not yet meaningfully differentiated
  by default — a pricing/product decision, not a build gap.
- *Previously marked "not built" in this doc — that was out of date; corrected after a 2026-07-15
  audit found the checkout flow was already fully wired.*

---

## Platform layer — NEW (2026-06-21)
- ✅ **Privacy + Terms** public pages (`/privacy`, `/terms`, public in `proxy.ts`); **legal acceptance is the
  last step of onboarding** (same submit sets `acceptedLegalAt` + `onboardedAt` — no separate gate).
- ✅ **Branch-aware onboarding + navigation** — department **seeds** a coding-track default (CS/IT on), but
  it's a **toggle** (any branch can opt in/out) and **fails open**. Non-coding tracks: DSA hidden from
  nav + home grid, coding round dropped from the interview (technical+behavioral still work). Helper
  `lib/capabilities.ts` (`codingEnabledFor`, `defaultCodingForDepartment`); `User.codingEnabled`.
- ✅ **Admin panel** (`/admin`) — guarded by **Clerk `publicMetadata.role: "admin"`** (set from the Clerk
  dashboard; users can't self-promote). Read-only per-user metrics: plan, coding track, #documents,
  #generations, #DSA attempts, app opens, last seen, joined. **Per-token AI cost = deferred** (would need
  the central router; counts are the honest v1 metric). Lightweight `lastSeenAt`/`appOpens` tracking.

## Reliability / infra already done (cross-cutting)
- ✅ **Code execution sandbox** (`@studentos/execution`, Piston) — fail-closed, hard timeouts (no credit drain).
- ✅ **Reliability hardening** — bounded retries, graceful "never show a raw error", per-user rate limiting
  (in-memory).
- ✅ **Prompt caching** layer (Anthropic cache_control) on multi-turn flows.
- ✅ Paid-only / gateway-only routing decision (free-tier NIM router shelved).

## The consolidated remaining backlog (biggest → smallest)
1. 🔴 **Profile link GitHub connect + repo diagrams** — the page itself (#7) is built; live GitHub
   data and auto-generated diagrams are the remaining piece.
2. 🔴 **Notifications/reminders + study-planner (#9)** + **DSA streak push** — all need a **cron + push/email**
   layer (one shared build unlocks several features).
3. 🟡 **PRO-vs-PREMIUM differentiation (#11)** — checkout itself is built and admin-gated; only the
   tier limits need real differentiation before turning `PAYMENTS_ENABLED` on for real users.
4. 🟡 **Real plagiarism / AI-detection / Humanizer APIs** (replace the heuristic).
5. 🔴 **DSA leaderboard** + 🔴 **Java/C++ DSA grading** ("A2").
6. 🟡 **Assignment** richer inputs (reference properties) + **code execution** + formula-chooser loop.
7. 🟡 **Resume** multiple-format suggestions + project suggestions.
8. 🟡 **`apps/recruiter`** — a full fourth app (onboarding, student search, messages, jobs,
   interviews, its own plans/checkout) exists and isn't otherwise documented in this file; give it
   its own status pass rather than assuming it's covered by the sections above.
8. 🔴 **PWA / installable** + 🔴 **real-time device sync**.
9. 🟡 **B2** — FAILED/stuck generation recovery (retry button).
10. **Prod setup** (not code): Vercel deploy, prod Piston, R2, AI-gateway card, VAPI live test, durable rate-limit store.

## Edge cases / things to add that you didn't name (worth deciding on)
- **Privacy & legal:** privacy policy + terms, **data export / account deletion** (you store student work + resumes).
- **Gemini free-tier training caveat** if you ever add free models (you went paid-only — fine for now).
- **Onboarding completeness** — make the one form capture everything later features need (target role, goals,
  GitHub, branch specifics) so grounding is rich from day one.
- **Abuse/cost ceilings at scale** — the rate limiter is in-memory; move to Neon/Upstash before public launch.
- **Analytics + error monitoring** (e.g. to see where users drop off / errors happen).
- **Accessibility & SEO** basics for the public profile pages.
