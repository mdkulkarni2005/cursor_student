# StudentOS — Manual testing checklist

> A one-by-one walkthrough of every feature. Tick each as you go. The **AI** column says whether a feature
> needs the real AI Gateway (a credit card on the gateway) or works on the local **stub**.
>
> - **stub** = works with no AI credits (deterministic placeholder output) — proves the flow/plumbing.
> - **real** = needs `AI_DRIVER` unset + AI Gateway card — proves the actual intelligence/quality.
> - **vision/image** = needs a vision or image model on the gateway specifically.

## 0. Before you start

### Easiest path to REAL output (recommended for first test)
Use **real AI + local storage**. This gives you genuine Claude output with zero storage/template friction
(the default template is already seeded into `apps/web/.storage`, so reports/PPT won't break).

In `apps/web/.env.development.local`:
- [ ] **Remove (or comment out) `AI_DRIVER=stub`** → real Claude via the AI Gateway. *Needs a credit card on
      the Vercel AI Gateway — this is the only money blocker.*
- [ ] **Keep `STORAGE_DRIVER=local`** → files saved in `apps/web/.storage`, no R2 needed.
- [ ] Restart `pnpm --filter web dev` after changing env.

> ⚠️ **First real call — watch for this.** The real-AI paths have only ever run on the stub + structural
> verify scripts; this is the first time they hit the live gateway. If **assistant chat** or the **assignment
> tutor** errors on the very first real message, it's almost certainly the new prompt-cache message shape —
> tell me and I'll fix it (set `AI_CACHE=off` as a quick workaround). Watch the server log for
> `[ai-cache] … read=…` to confirm caching is live.

### If you instead switch storage to real R2
- [ ] Drop `STORAGE_DRIVER=local`, add your R2 env, **then RE-SEED the template to R2**:
      `export $(grep -E '^(DATABASE_URL|R2_)' apps/web/.env.local | sed 's/"//g' | xargs) && pnpm --filter web seed:templates`.
      **Skipping this = reports/PPT fail** (the template currently lives only in local `.storage`).

### Either way
- [ ] **Sign in** (Clerk), complete **onboarding** (department, semester, college) — everything is grounded in this.
- [ ] New account starts empty — the dashboard shows honest zeros (usage 0/limit, no streak) until you generate.

---

## 1. Reports  (the main pillar)
- [ ] Generate a report from a **topic** → opens, shows sections, **Download DOCX** works.  *(stub/real)*
- [ ] **Upload your own `.docx` template** → generated report uses YOUR headings/format, not the default.  *(real for good content; stub fills headings)*
- [ ] **Clarifying questions** — give a vague topic + no guidelines → it asks questions before generating; answer them → it generates.  *(both)*
- [ ] **Mid-generation pause** — thin context can pause with "a few details to finish" → answer → it completes.  *(both)*
- [ ] **Plagiarism / AI score** badges show; **Humanize** button lowers them.  *(stub heuristic — real detector is a future swap)*

## 2. PPT
- [ ] Generate a deck from a topic → slide previews, **Download PPTX**.  *(stub/real)*
- [ ] **Upload your own `.pptx` template** → deck matches your **theme** (colors/fonts).  *(stub/real)*
- [ ] **Exact layout cloning** — upload a real PowerPoint template that uses **title + body placeholders** → the deck reproduces your actual slide design (open in PowerPoint to confirm it opens cleanly).  *(stub/real; needs a placeholder-based template, else it falls back to theme)*
- [ ] **Slide images** — generated decks get a relevant image per slide.  *(image model only — stub = text-only)*
- [ ] **Convert to Report** button on a deck → produces a written report from the slides.  *(stub/real)*
- [ ] Clarify loop + mid-generation pause (same as reports).  *(both)*

## 3. Assignments
- [ ] Solve from **typed question** → step-by-step solution + final answer + **Download DOCX**.  *(stub/real)*
- [ ] **Photo solver** — upload a photo of a question → it reads and solves it.  *(vision only)*
- [ ] **Multi-turn tutor** — on the solution page, ask "which formula should I use?" → it replies. Say "redo step 3, it's wrong" → the solution **revises and the DOCX updates**.  *(both)*

## 4. Viva
- [ ] From a report/PPT/assignment, generate **viva questions** with model answers.  *(stub/real)*

## 5. Resume
- [ ] **Generate** from rough notes + a target role → ATS bullets in the house format.  *(real for quality; stub valid)*
- [ ] **Download DOCX** and **PDF** both work and look like the house format.  *(stub/real)*
- [ ] **Fit to one page** toggle re-renders tighter.  *(both)*
- [ ] **Edit resume content** (collapsible editor) → save → re-renders, format intact.  *(both)*
- [ ] **ATS score** shows; paste a job description / target role → **re-score** updates keywords + suggestions.  *(real heuristic — works on stub too)*
- [ ] **Import an existing resume** (.docx best, .pdf ok) → fields extracted into the editor.  *(no AI — deterministic parser)*

## 6. Projects
- [ ] **Suggest ideas** (interests + difficulty) → compare cards; clarify loop may ask first.  *(stub/real)*
- [ ] **Finalize** an idea → project page.  *(both)*
- [ ] **Generate bundle** → report + PPT + viva all created, with per-item status links.  *(stub/real; needs the default template + uses your report/PPT quota)*
- [ ] **Stuck? Ask the assistant** → opens the assistant scoped to the project for wiring/calc/debug help.  *(real for quality)*

## 7. Interview Prep
- [ ] **Start** an interview (role + rounds + optional resume) → first question.  *(stub/real)*
- [ ] Answer through the rounds; **coding round** shows a monospace code box.  *(both)*
- [ ] **Stuck nudge** — wait ~2.5 min on a question (or just observe the prompt) → "want a nudge?" gives structural help (not the answer).  *(both)*
- [ ] **Camera** toggle shows a local preview (nothing recorded).  *(browser only)*
- [ ] Finish → **evaluation report** (overall + per-area scores + strengths + improvements).  *(real for quality)*
- [ ] **Paste a JD** at start → questions tailor to that role.  *(real)*
- [ ] **Live coding (Phase C):** on a coding question a **CodeMirror editor** appears (5 languages). For a
      *runnable* question, **▶ Run** executes your full program and shows output; for a *design* question
      (Redis/WebSocket) there's no Run — you write + explain.  *(needs Piston — set `PISTON_URL`)*
- [ ] Your **run output is included in the final evaluation** (the AI sees whether your code worked).
- [ ] Sandbox down → Run says "not available, you can still submit" — the interview never breaks.
- [ ] **Live voice interview (Phase D):** on an active interview, **🎥 Start live voice interview** → the
      interviewer **speaks** each question aloud, you **answer by voice** (transcribed), it **advances
      question→question without page reloads**, coding questions show the editor + Run, and a **camera
      preview** appears (presence). Evaluation lands at the end.  *(needs the VAPI key in `.env.local` + a
      real browser/mic; "Type instead" always falls back to the typed flow)*
- [ ] If voice transcript stays empty → check the VAPI `message` event shape, or set a default voice/
      transcriber on the assistant in your VAPI dashboard.

## 8. DSA Practice  *(now REAL execution grading)*
> Needs a **Piston** sandbox. Local: `docker run -d --name piston --privileged -v piston_data:/piston -p 2000:2000 ghcr.io/engineer-man/piston`,
> install runtimes (python/node/typescript/java/gcc) via `POST /api/v2/packages`, then set
> `PISTON_URL="http://localhost:2000/api/v2"` in `.env.development.local`. Without it, runs show "couldn't run
> right now" (fail-closed) and never falsely mark solved.
- [ ] Browse the **problem list**; open a problem → statement + examples + a `solve(...)` starter stub.
- [ ] Solve one of the **10 graded problems** in **Python / JavaScript / TypeScript** → **Run & submit** →
      per-test ✓/✗, and **"Accepted" only when ALL tests pass**. *(needs Piston)*
- [ ] Submit a **wrong** solution → it's rejected (shows first failing case: expected vs your output) + coach feedback. *(needs Piston + real AI for feedback)*
- [ ] **Streak** only advances on a real pass; **"solved" badge** appears after acceptance. *(no fake self-marking anymore)*
- [ ] Java / C++ show a "coming soon" note (typed grading is the next step); reverse-linked-list & LRU stay review-only.

## 9. Always-on Assistant (the bubble)
- [ ] Open the bubble → chat; replies **stream** in.  *(stub/real)*
- [ ] **Photo attach** (📎) → ask about an image.  *(vision only)*
- [ ] **Persistence** — close & reopen the bubble (or reload) → your chat history is still there.  *(both)*
- [ ] Quick-action chips jump to the right tool.  *(both)*

## 10. Vault, Workspace, Plans
- [ ] **Vault** lists all your generated documents; rows link to the right detail page.
- [ ] **Semester Workspace** groups your work.
- [ ] **Plans** page shows tiers (free quotas enforced — e.g. 2 free reports/month on FREE).

---

## Prompt caching (credit saver) — real-AI only
The `cache_control` layer caches the stable prefix of the two multi-turn flows (assistant chat,
assignment tutor) so follow-up turns re-read it at ~10% cost. It is a **no-op on the stub** and
on one-shot generators (reports/PPT/resume) by design.
- [ ] **Prove it's live:** with the gateway connected, send a **2nd** message in the assistant
      bubble (or a 2nd assignment follow-up) and watch the server log for
      `[ai-cache] assistant.stream: cache write=… read=…`. A **non-zero `read` on turn 2** = caching
      works through the gateway. Zero on every turn = the prefix is under Sonnet's ~1024-token min
      (expected for short chats) or the providerOptions shape isn't reaching Anthropic.
- [ ] Kill switch: set `AI_CACHE=off` to disable caching for a cost A/B comparison.
- [ ] Structural check (no credits needed): `pnpm --filter web verify:cache` — asserts the
      breakpoint is attached; does **not** prove real cache behavior (gateway-only).

## What to watch for
- After the DB reset you're a brand-new user → expect empty lists everywhere until you generate.
- **Quotas:** FREE plan caps reports/PPTs/assignments per month; you'll see an upgrade prompt at the limit.
  (To test unlimited, set your user's `plan` to `PRO` in the DB.)
- **Two checks only you can do** (no LibreOffice in the build env, Clerk login is interactive): open the
  generated `.docx`/`.pptx`/`.pdf` files in real Office/PowerPoint to confirm they look right and open cleanly.
