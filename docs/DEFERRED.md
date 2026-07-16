# StudentOS — Deferred / Skipped work (pick up later)

> Last updated 2026-06-20. This is the running list of things we **consciously skipped or deferred**
> during the V1 build — what each is, **why** it was deferred, **what it needs**, and **where it hooks in**.
> To resume any item, just say e.g. "build the DSA leaderboard" or "do #7 Profile Link".
>
> Nothing here is a bug or half-done work — each was a deliberate scope decision. Items marked
> **(needs infra)** all share the same blocker: scheduled jobs (cron) + a push/email delivery channel.

---

## Whole pillars / big features

### #7 — Profile Link (Aadhar-style shareable profile) — BUILT (corrected 2026-07-15, was stale)
Public, shareable per-user profile page aggregating resume + projects + DSA-solved.
- **Status:** live at `apps/web/app/u/[handle]/page.tsx`, gated by `User.publicHandle` (set on first
  "Share Profile"). This entry previously said "SKIPPED" — that was out of date.
- **Still not built:** GitHub OAuth connect and auto routing/system-design diagrams generated from a
  repo — the page renders existing DB data only, nothing pulled live from GitHub.
- **Hooks into:** existing `Document` (RESUME/PROJECT), `DsaAttempt` (solved count).

### Payments / Razorpay (PLAN.md §9.3) — BUILT, gated by admin switch (corrected 2026-07-15, was stale)
- **Status:** full Razorpay integration is live in both `apps/web` and `apps/recruiter` — checkout,
  `/api/checkout/verify`, `/api/webhooks/razorpay`, and a real `/plans` pricing page. This entry
  previously said "SKIPPED (intentional, launch decision)" — that was out of date; the checkout code
  was already built and would otherwise take real money the moment an admin activated a non-free
  `PlanTier`, with no staged rollout control.
- **Fix applied 2026-07-15:** added an admin master switch, `PAYMENTS_ENABLED`
  (`packages/db/src/payments.ts`, toggled from apps/admin `/platform` → "Payments" card). Defaults
  OFF. While off, both apps' pricing pages show "Launching soon" instead of a working checkout link,
  `/plans/checkout` 404s in both, and the switch is also enforced server-side in
  `createCheckoutOrder` (`apps/web/lib/actions/checkout.ts`, `apps/recruiter/app/plans/actions.ts`)
  and `/api/checkout/verify` in both apps — not just at the page level, so the gate can't be
  bypassed by calling the action/route directly while the UI is hidden. Flip it on from admin when
  ready — no deploy needed. PlanTier pricing/config and manual admin plan grants work regardless of
  this switch.
- **Hooks into:** `assertWithinQuota`/`QuotaExceededError` (already throw with `upgrade: true` in the
  UI), `apps/admin/app/platform/actions.ts` (`updatePaymentsEnabled`).

---

## Assistant (#2) follow-ups

### 2.4 — Reminders / scheduling / exam-prep plans / notifications — DEFERRED **(needs infra)**
- **Why:** user explicitly said "don't go to 2.4 for now… after this project is finished."
- **What it needs:** new schema (reminders/exam events), a **cron** runner, and a **push/email** channel.
- This is the shared blocker for several items below.

### Assistant streaming — DEFERRED
- Currently non-streaming (`chatAssistant` uses `generateText`). Swap to `streamText` + stream the
  response into `components/assistant/assistant-panel.tsx`. Pure UX upgrade, no new infra.

### Assistant photo / vision input — DEFERRED
- Mirror the assignment photo-solver seam (real-AI only). Add an image input to the panel + pass to a
  vision-capable model. Stub can't process images.

### Assistant chat persistence — DEFERRED
- Chat history is ephemeral (client state only). To persist: store transcripts (a model or reuse
  `Document`), load on open.

---

## Pillar gaps (PLAN.md §8 / REMAINING.md #8)

### 8.1 — PPT image generation in slides — NOT BUILT
- Decks are text + theme only. Add AI image generation per slide + embed via pptxgenjs.

### 8.1 — PPT → Report conversion — NOT BUILT
- Generate a report from an existing PPT's content (reuse report pipeline with PPT content as source).

### 8.2 — Assignment multi-turn feedback loop — PARTIAL
- The "which formula should I use?" clarifying loop is a **single-pass instructions field** today, not a
  full multi-turn conversation. Full loop = port the interview-style turn pattern to assignments.

### Reports/PPT exact layout cloning — THEME-LEVEL ONLY
- PPT user-templates match **brand theme** (colors/fonts/size from `theme1.xml`), not exact per-slide
  layout — pptxgenjs can't import a `.pptx`. Exact-layout cloning is a deeper future step.

---

## DSA (#6)

### Leaderboard (6.2) — SKIPPED (user deferred 2026-06-20)
- **Why:** user chose to add later. Ranking metric was going to be **distinct problems solved**, by branch,
  limited visibility (top N + your own rank).
- **What it needs:** an aggregate query over `DsaAttempt` grouped by `User.department`, plus a privacy
  decision. All the data already exists (`solved` flag, `department`).

### Streak push reminders (6.3 delivery half) — DEFERRED **(needs infra)**
- The **in-app** streak banner is built (`/dsa`). The "daily streak-missing **notification**" (push/email
  when the user isn't in the app) folds in with 2.4's cron + delivery channel.

---

## Interview (#5)

### Live-coding interview + real code execution (Phase 5) — DEFERRED to next version (user, 2026-06-20)
This is the user's BIG vision for the interview pillar — beyond today's text-only coding round. **Pick this
up next.** Requirements as described by the user:
- An embedded **CodeMirror** editor (npm package) inside the interview — the AI **observes the whole coding
  window**.
- The AI **types the problem on screen (or speaks it)**; the candidate writes code live.
- On **Submit**, the AI **analyzes the code**, **guides** the candidate ("what to do next"), and asks
  **cross-questions** — usable for technical, DSA, and backend rounds.
- **The code actually RUNS** — via a **B2B sandbox** (e.g. **Vercel Sandbox**, ephemeral Firecracker microVMs;
  or another provider). User will **provide API keys + more vision** when we start this.
- Builds on the existing interview state machine (`lib/interview/generate.ts`), jailbreak-resistant prompt,
  and the `kind:"coding"` question type already in place.
- **Blockers before building:** the user's sandbox API keys + their fuller spec. Voice (type-or-speak) may
  need TTS/STT — confirm scope at start.

Today's state (shipped): the coding round shows a monospace box and the AI reviews pasted code as **text**
(no execution). Phase 5 replaces that with the live, executed, observed flow above.

---

## Recruiter real interviews (2026-07-03)

**Shipped (MVP):** `InterviewSchedule` model — recruiter proposes a date/time + optional meeting link
+ note from a student's profile (`apps/recruiter/app/students/[id]/schedule/`); student accepts/declines/
suggests another time from `apps/web/app/messages/page.tsx`; recruiter tracks all their scheduled
interviews + logs an outcome (Selected/Rejected/On hold) from `apps/recruiter/app/interviews/`. Video
transport in v1 is **whatever link the recruiter pastes** (Zoom/Meet/Teams) — no integration.

**Deferred — pick ONE when ready, needs user's call:**
- **Google Meet via Calendar API** — auto-create the calendar event + Meet link on accept, email both
  sides. Needs a Google Cloud project + per-recruiter OAuth consent (event must live on their calendar).
- **In-house video** — embedded WebRTC/Daily.co-style call inside the app, matching the mock-interview
  "everything in one product" feel. Most work, but the only option that lets us capture transcript/
  recording for real interviews (mirroring `packages/ai/src/interview.ts`'s pipeline).

**Also deferred:** email/SMS notification when a recruiter proposes a slot (blocked on the same cron/
notification infra already deferred for #2 reminders + DSA streak push — v1 is in-app only, surfaced
next time the student opens `/messages`).

---

## Finalize / launch (PLAN.md §9)

### 9.1 — PWA manifest (installable on phone) — NOT BUILT
- Add a web manifest + service worker so the app installs on a phone (completes "web + phone, same account").

### 9.2 — Flip to real services — DEPLOY-TIME (user)
- Dev runs on stubs: `AI_DRIVER=stub`, `STORAGE_DRIVER=local` (in `apps/web/.env.development.local`).
  Going live = add a credit card to the Vercel AI Gateway and drop `AI_DRIVER`; R2 is already live, drop
  `STORAGE_DRIVER`. Same code path — only the flags change.

---

## Verification caveats (built & stub-verified, but need a real check)

These are **not** skipped — they're built and pass headless/stub verification, but the listed check can
only be confirmed in a **signed-in browser** and/or with **real AI** (the AI Gateway needs a card). Worth
doing before launch:

- **Assistant UI** — bubble expands, message round-trips, mobile full-screen.
- **Resume** — in-app **PDF download** (pdfkit in the server runtime) and **upload-import** round-trip.
- **Interview** — interviewer **intelligence**, **hint quality**, and **jailbreak resistance** (stub can't
  prove these; system-prompt rules need real-AI confirmation).
- **Project bundle / stuck-help, DSA review** — quality of the real-AI output.
- **`.docx` fidelity** — open `packages/documents/out/resume-sample.docx` vs the reference PDF (no
  LibreOffice in the build env to self-render to an image).
