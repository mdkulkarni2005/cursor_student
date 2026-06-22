# StudentOS — Master Build Order

> The single ordered line-up of everything we've decided. Work top-to-bottom. Each phase lists
> **what it includes**, **what blocks it**, and **what I need from you**. "Dump" anything new into
> the relevant phase. Companion docs: `docs/DEFERRED.md` (parking lot), `docs/MANUAL_TESTING.md`.

**Legend:** ✅ done · 🔨 ready to build (unblocked) · ⛔ blocked on you · 🅿️ parked (later version)

---

## Ground rules (locked decisions — apply to everything)

- **Paid-only for now.** Every AI request goes through the **Vercel AI Gateway** (Claude). The
  free-tier / NVIDIA-NIM router is **shelved** (revisit only if a free plan is added later).
- **No infinite loops, anywhere.** Bounded **2–3 retries → graceful degrade**. Never loop forever.
- **Never show the user a failure.** On error: recover silently, resume from the saved checkpoint.
- **Every request costs money** — be token-efficient; reuse the prompt-cache layer on multi-turn flows.
- **Sandbox = Piston, self-hosted**, behind the `@studentos/execution` abstraction (swap-able later).
  Hard caps per run (time/memory/output), no network, per-user rate limit.
- **Reliability > features.** Credits must not be drainable (no user `while(true)`, no runaway AI).

---

## ✅ Already done (this stretch)

- ✅ **Prompt cache-control layer** (`packages/ai/src/cache.ts`) — Anthropic ephemeral caching on the
  two multi-turn flows (assistant, assignment tutor). Kept.
- ✅ **Honest-UI finishing pass** — real-data dashboard (quota/streak/recent work + zero-states),
  `/profile` + `/plans` coming-soon pages, topbar cleanup, mobile account access. Build green.
- ✅ **Four pillars + Viva + Resume + Projects + Interview(text) + DSA(self-marked)** — all shipped
  earlier (see `memory/progress.md`).

---

## 🔁 Phase 0 — Prove the app on REAL AI (you, anytime)

Before/while I build the rest, confirm the existing app works live.
- **You:** in `apps/web/.env.development.local` remove `AI_DRIVER=stub` (keep `STORAGE_DRIVER=local`),
  restart dev. Needs the **AI Gateway credit card**.
- Watch the first real assistant/assignment message — if it errors it's the cache message shape;
  `AI_CACHE=off` is the instant workaround. (Details in `MANUAL_TESTING.md §0`.)
- **I need from you:** a ping on anything that breaks, with the error.

---

## 🔨 Phase A — Code execution engine + DSA real grading

**A1 ✅ DONE (2026-06-21):** `@studentos/execution` (Piston client, provider-abstracted, hard
time/mem caps, **fails CLOSED** = unreachable engine → `unverified`, never a fake pass). Generic
JSON `solve(...)` driver for **Python / JavaScript / TypeScript**. Centralized test cases (5–6
LeetCode-style, hand-verified) for **10 of the 12 problems**, with per-problem compare modes
(exact / unordered / float-eps). DSA wired: **runs + grades for real → "solved" only on a true pass
→ streak earned strictly from passes**; AI review now only on a miss (cost saver). VERIFIED against a
real Piston: correct→Accepted, wrong→rejected, infinite-loop→killed, fail-closed. (`pnpm --filter
@studentos/execution verify` 14/14, `verify:dsa-grade` 4/4.)

**A2 ⛔ remaining:** typed glue for **Java + C++** (statically typed — can't splat JSON generically),
and the **2 deferred problems** (reverse-linked-list, lru-cache) which need a node type / op-sequence
driver. Until then those are review-only / `unverified` (never a fake pass).

- **I need from you:** ① keep the **12 problems** or expand? ② the **prod Piston URL** when you deploy
  a container (dev: a local Docker Piston, `PISTON_URL=http://localhost:2000/api/v2`).

---

## 🔨 Phase B — System-wide reliability hardening

**B1 ✅ DONE (2026-06-21):** `withAiRetry` (packages/ai) — bounded 3-try transient retry (429/529/5xx/
network/timeout) with backoff; **permanent errors fail fast; never an infinite loop.** Applied at the
orchestration AI boundary across **reports, PPT, assignments, resume, viva, interview, projects** (no
13-module refactor — advisor-scoped). `friendlyError` (apps/web/lib/reliability.ts) maps scary
provider/infra errors to a calm line while letting authored messages (quota, "no slides") pass —
**no raw stack ever shown.** In-memory per-user `rateLimit` gating every AI action + `/api/assistant`.
Clarify pre-checks degrade gracefully (failure → just generate). VERIFIED: `verify:reliability` 15/15
(transient-vs-permanent, bounded give-up, rate-limit blocks, friendly mapping). Build green.

**B2 ⛔ remaining:** make a **FAILED / stuck-`GENERATING`** generation **recoverable** (retry button +
re-run from stored inputs + stuck-job detection). Migration-free (store inputs in `job.pending`).
Streaming assistant has graceful `onError` but still no mid-stream model fallback (non-stream path does).

- **You confirmed** the 2–3 retry budget + soft-fail feel.

---

## ✅ Phase C — Interview live-coding  *(DONE 2026-06-21)*

- ✅ Embedded **CodeMirror** editor (client-only via `next/dynamic ssr:false`), 5 languages + syntax
  highlighting + one-dark theme; per-language starter skeleton.
- ✅ **Coding question → editor pops up** automatically (existing `kind` + question plan); verbal
  questions keep the text answer box.
- ✅ **Runnable vs non-runnable** (AI sets `runnable`): runnable → a **Run** button executes the FULL
  program via the sandbox (`/api/interview/run` → `runCode`, owner-guarded + rate-limited), shows
  stdout/stderr; non-runnable (Redis/WebSocket/design) → no run, assessed as approach/syntax.
- ✅ **Execution feeds the evaluation** — run output stored on the answer turn, read by
  `evaluateInterview` (so "we run code" is real, not decorative).
- ✅ **JD grounding** — paste a job description at start (or general → resume/profile); threaded into
  question generation + evaluation. Resume *picker* reused (upload-at-start deferred).
- ✅ **Piston-down degrades gracefully** — Run shows "running isn't available; you can still submit";
  the interview never breaks on a sandbox blip.
- VERIFIED: `verify:interview` (JD stored, runnable flag, code+runOutput stored, loop+guards) +
  `verify:interview-run` (full programs run across py/js/java on real Piston). Build green.
- Works for ALL 5 languages NOW (full-program run ≠ A2's `solve`+tests glue — **not blocked by A2**).
- **Browser check (yours):** CodeMirror render + live Run/Submit click-through (signed-in only).

---

## ✅ Phase D — VAPI voice + video  *(BUILT 2026-06-21 — needs YOUR live browser test)*

Decision locked: **Option A** — VAPI is voice transport; our Claude state machine drives. Keys are in
`.env.local` (`NEXT_PUBLIC_VAPI_PUBLIC_KEY`, `VAPI_PRIVATE_KEY`). Built in stages (probe → continuous →
camera); **I cannot live-test voice (no browser/mic)** so the user validates and feeds back.

**Stage 1 ✅ DONE (2026-06-21) — voice probe.** `components/interview/voice-probe.tsx` (client, SDK
`@vapi-ai/web` dynamically imported = no SSR break): toggle on a verbal question → starts a call,
speaks the current question (inline transient assistant, told to speak then stay silent), shows the
live transcript of the candidate's speech, "use this as my answer" drops it into the (now controlled)
answer box. Does NOT advance the interview yet. Guards: no key / mic denied / SDK error → calm message,
typed flow still works; **3-min auto-stop** so an open mic can't burn credits. Build green.
**⚠ YOUR TEST (I cannot — no browser/mic/VAPI):** sign in → verbal interview question → 🎙️ → confirm
the question is spoken aloud + your speech transcribes. If transcripts don't appear, the likely fix is
the `message` event shape (`type:"transcript"`, `role:"user"`, `transcriptType:"final"`) or a
voice/transcriber default needed in your VAPI dashboard.

**Stage 2 ✅ DONE (2026-06-21) — continuous voice interview.** `components/interview/live-session.tsx`
(client): ONE persistent VAPI call for the whole session; speaks the current question (firstMessage),
then `vapi.say()`s each next question after the candidate answers — advancing via `/api/interview/answer`
(JSON, thin wrapper over the SAME `submitAnswer`) + `router.refresh()`, **no page reload** (which would
tear down the call). Handles verbal (voice transcript) AND coding (CodeMirror + Run + spoken explanation)
in the one flow. `components/interview/interview-active.tsx` wrapper toggles **live voice vs typed** — the
verified typed flow is always the fallback ("Type instead" / "exit to typed mode"). 20-min session cap.

**Stage 3 ✅ DONE (basic) (2026-06-21) — camera presence.** Camera preview during the live session
(`getUserMedia`, non-blocking — never gates the interview) + an on-camera notice. **Identity/anti-cheat
logic (snapshots, recording, face checks) still PARKED until you give the spec** — the capture hook is in
place to build on.

**⚠ YOUR TEST drives everything here (I can't run a mic):** start a live interview → confirm questions are
spoken, your speech transcribes, it advances question→question, coding shows the editor + Run, camera
preview appears, and the evaluation lands at the end. Report what breaks; that's the feedback loop.

---

## 🅿️ Parked — later version (in `docs/DEFERRED.md`)

Not in this build order; pull any when you want. — **#7 Public Profile link**, **Payments/Razorpay +
real Plans page**, **Reminders/notifications (#2.4) + cron**, **DSA leaderboard**, **streak push
reminders**, **PWA / offline**, **free-tier AI router (NIM)**, **PPT slide-image generation**.

---

## 📥 The "dump zone" — everything I'll eventually need from you

| When | What | Status |
|---|---|---|
| Phase 0 / any real test | **AI Gateway credit card** (to run real Claude) | ⛔ you |
| Phase A | Keep **12 DSA problems** or expand? | ⛔ you |
| Phase A (prod) | **Self-hosted Piston URL** (deploy a container) | ⛔ you (later) |
| Phase B | Confirm **2–3 retry** budget + soft-fail UX | ⛔ you |
| Phase C | OK to build with a **VAPI seam**? | ⛔ you |
| Phase D | **VAPI keys/config** + **anti-cheat guardrail spec** | ⛔ you |

Anything else you think of — drop it under the right phase and I'll fold it in.
