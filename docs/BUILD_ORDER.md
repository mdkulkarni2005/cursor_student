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

## 🔨 Phase E — Recruiter-led live interview (LiveKit)

Distinct from the VAPI AI mock interview (Phase D) — this is a **human recruiter interviewing a real
candidate**, video-call style, with a shared live coding surface instead of screen share.

**Decision:** use **LiveKit** (self-hostable later, same posture as Piston) rather than Google Meet API
(Meet has no embeddable custom UI / no proctoring hooks) and rather than building raw WebRTC in-house
(signaling + SFU + recording pipeline is weeks of infra for a non-core feature).

**E0 🔨 — Section gating (student side).** The "Real Interview" nav section is **hidden/disabled by
default** for every candidate — rest of the app (web, mobile, PWA) is untouched, no platform gate anywhere
else. It unlocks only when **both** are true: ① candidate has an `InterviewSchedule` row with status
`ACCEPTED` whose proposed time is within the join window (e.g. opens 15 min before, closes N min after —
outside that window it's still hidden even if accepted), **and** ② Phase G's desktop-app check passes. If
①  is true but ② isn't, show "install the desktop app to join" rather than hiding the section — the
candidate needs to know *why* it's locked once they actually have an interview.

**E0b 🔨 — Interview-invite email (scoped, NOT the full deferred notification system).** Repo currently has
**zero email infra** (`docs/DEFERRED.md` §2.4 bundles this with streak reminders/cron — that bundle stays
deferred). This is smaller: a one-off **transactional** send, no cron — fires on `scheduleInterview`
accept, via a provider (Resend fits the existing Vercel/Neon/Clerk/R2 stack) with "you have a real
interview on [date/time], install the app here [link]" content. New `EMAIL_*` env vars needed.

**E1 🔨 — Room infra.** `POST /api/interview/room/create` (recruiter schedules → creates LiveKit room +
short-lived recruiter/candidate tokens), `POST /api/interview/room/[id]/join` (auth-checks requester
against the assigned interview before minting a token), `POST /api/interview/room/[id]/end`.

**E2 🔨 — Realtime collaborative editor (reuses Phase C).** Sync the existing CodeMirror+Piston editor
between recruiter and candidate via a LiveKit **data channel** (Yjs CRDT) instead of screen share —
recruiter sees every keystroke live and can trigger Run. Screen share stays available as a secondary tool
(e.g. whiteboard/diagram walk-through), not the primary coding surface.

**E3 🔨 — Proctoring layer (client signals, no ML for v1).** `POST /api/interview/room/[id]/heartbeat`
(tab-visibility, fullscreen state, webcam-active — pinged every N seconds) and
`POST /api/interview/room/[id]/flag` (violation written to an `interview_flags` table the recruiter can
review post-interview). Single-use join token + one active session per candidate prevents a stand-in
joining separately. **Runs inside the Phase G desktop app** — see below for what that unlocks
(background-app enumeration) that the browser tier can't do.

**E4 🔨 — Text-only transcript, NOT video/audio recording.** Decision (2026-07-03): dropped LiveKit Egress
recording entirely — a full session video/audio recording is heavy R2 storage that grows unbounded with
every interview and adds real ongoing cost for something rarely re-watched in full. Instead: each
participant's browser runs the **Web Speech API locally on their own mic** (Chrome/Edge, which the Phase G
Electron app runs on anyway) → only the resulting **text** goes over the LiveKit data channel to build a
shared transcript. No audio/video ever leaves the browser as media. Transcript + the Phase E2 code-editor
history (Yjs edit log) + the Phase E3 flags log are all that's persisted — KB per interview, not GB.

**E5 🔨 — AI post-interview judgment (recruiter-facing).** Reuses the `evaluateInterview` pattern from the
AI mock interview (`packages/ai/src/interview.ts`) with a new prompt/audience: after the call ends, feed
the transcript + code history + flags summary + JD/resume into Claude → a recruiter-facing verdict (fit
for the role, strengths/concerns, a recommendation, not a numeric auto-decision). Surfaces on the
recruiter's `logOutcome` screen as a suggestion **alongside** their own judgment — the recruiter still
makes the final call (SELECTED/REJECTED/ON_HOLD), same as today. `POST /api/interview/room/[id]/webhook`
still exists for participant-joined/left status updates, just no recording-completed branch.

---

## 🔨 Phase F — Installable app (PWA, all platforms)

General-purpose, **not interview-specific** — the whole app (dashboard, DSA, assignments, mock/VAPI
interview, everything) becomes installable as a PWA on desktop (Win/Mac/Linux Chrome/Edge), Android, and
manually on iOS (Add to Home Screen).

- **F1** — manifest + service worker, `beforeinstallprompt` captured (Chromium) → soft, **dismissible**
  install card on first login. Never forced.
- **F2** — `Settings → Install app` always available afterward, for anyone who dismissed it initially.
- Detect installed state client-side (`display-mode: standalone`) to skip re-prompting.
- **Ceiling, by design:** a PWA runs in the same browser sandbox as a tab — installing it does not unlock
  OS-level powers (can't enumerate/close other apps). It's a UX nicety (icon, standalone window), not a
  proctoring upgrade. That capability only exists in Phase G, and only on desktop.
- Mock/AI interview (Phase D, VAPI) works fine from the PWA on **any platform including mobile** — no gate.

---

## 🔨 Phase G — Desktop native app (Electron) — required gate for Phase E

**Real recruiter-led interviews (Phase E) are desktop-only and require this app installed** — mobile/plain
browser is blocked from that flow entirely (mock interviews stay open on mobile via Phase F/D).

**Why desktop-only:** only a native desktop app (Windows/Mac) can, with the user's permission, enumerate
and close other running applications — real OS access a browser/PWA can't get. Mobile OSes (iOS/Android)
sandbox every app from every other app as a core security guarantee; **no installed app, native or
otherwise, can close other apps on mobile** — that's not solved by more engineering, so Phase E stays
desktop-only rather than chasing an unreachable mobile equivalent.

- **G1** — Electron shell wrapping the existing web app (reuse, don't rebuild UI).
- **G2** — `GET /api/interview/room/[id]/preflight` — checked before minting a join token; if the request
  isn't coming from inside the Electron app (custom protocol / app-only header), block with "install the
  desktop app to continue" instead of admitting to the room.
- **G3** — background-process enumeration on join (Windows/Mac APIs, permission-gated) + prompt to close
  flagged apps before the recruiter admits the candidate; recruiter's pre-interview screen (mentioned in
  Phase E) shows this status alongside monitor count and camera preview.
- Code signing + auto-update needed before shipping (unsigned Electron installs trigger OS warnings).

- **I need from you:** ① confirm desktop-only is acceptable for real interviews (vs blocking a candidate
  who only has a phone/Chromebook) ② Mac + Windows both, or Windows first?

- **I need from you:** ① LiveKit account/API keys (cloud, to start — self-host later like Piston) ②
  confirm screen-share-as-secondary vs required ③ how strict the proctoring should be for v1 (flag-and-log
  vs auto-block on violation).

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
| Phase E | **LiveKit API keys** + screen-share policy + proctoring strictness | ⛔ you |
| Phase G | Desktop-only OK for real interviews? Mac + Windows, or Windows first? | ⛔ you |
| Phase E0b | Resend (or other) API key for the interview-invite transactional email | ⛔ you |

Anything else you think of — drop it under the right phase and I'll fold it in.
