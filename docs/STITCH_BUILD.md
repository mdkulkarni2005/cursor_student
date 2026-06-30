# Stitch → App build tracker

Building the `apps/web` frontend from the `stitch_vidhyaos/` mockups.
**Decisions (2026-06-24):** LIGHT indigo theme · rename → **Vidyas OS** · new screens first, then re-skin existing in place (preserve Clerk/Prisma/AI wiring).

## Light design tokens (from `*_light/code.html`)
- bg/body: `#f8fafc` · surface `#f7f9fb` · card (container-lowest) `#ffffff`
- container-low `#f2f4f6` · container `#eceef0` · container-high `#e6e8ea` · container-highest `#e0e3e5`
- **primary** `#3525cd` · **primary-container/accent** `#4f46e5` · on-primary `#fff`
- secondary (teal) `#006a61` · secondary-container `#86f2e4`
- text/on-surface `#191c1e` · muted/on-surface-variant `#464555` · outline `#777587` · outline-variant (hairline) `#c7c4d8`
- error `#ba1a1a` · error-container `#ffdad6`
- fonts: Space Grotesk (display/headline), DM Sans (body/label), JetBrains Mono (mono)

## Nav IA (from dashboard mockup)
Workspace: Home · Semester Hub · Vault · Assignments · Reports & PPT · Viva Prep · Resume Builder · Interview Prep · DSA Practice · Project Ideas
Footer: Help · Settings

## Foundation — DONE (tsc clean)
- [x] globals.css → light token system (added --color-teal, --color-primary-deep)
- [x] app-shell.tsx → light sidebar/topbar + Vidyas OS brand + New Project CTA; search → /search
- [x] nav.ts → Semester Hub added; Settings replaces Plans in YOU nav; Projects icon=Star
- [x] layout.tsx metadata + Clerk appearance → light, Vidyas OS

## NEW screens (no route yet) — ALL DONE (tsc clean, routes compile)
| Stitch folder | Route | Status |
|---|---|---|
| vidyas_os_semester_hub_light | /semester | DONE (scaffold data) |
| vidyas_os_semester_history | /semester/history | DONE (scaffold) |
| vidyas_os_subject_detail_workspace | /semester/[slug] | DONE (scaffold) |
| vidyas_os_global_search_results | /search | DONE (real doc search + scaffold insights) |
| vidyas_os_ai_exam_planner_reminders | /planner | DONE (scaffold) |
| vidyas_os_settings_billing | /settings | DONE (real profile/plan; tabs client cmp) |
| vidyas_os_checkout_billing_razorpay | /plans/checkout | DONE (UI scaffold; Razorpay NOT wired — pay btn placeholder) |
| vidyas_os_public_academic_identity_cs | /u/[handle] (public) | DONE (scaffold; added to public routes in proxy.ts) |

### Notes for next phase
- Scaffold pages use inline placeholder data (no Semester/Subject/Insights models yet). Wire to Prisma when those models exist.
- Brand strings "StudentOS" still present in EXISTING (un-reskinned) screens + landing — sweep during re-skin.
- Existing pages still have dark-specific hardcoded gradients (e.g. dashboard hero `from-[#0f1a2e]`) — fix per-screen in re-skin.

## PHASE 2 — re-skin existing routes (light) — DONE (tsc clean, no runtime errors)
Systematic conversion applied across `app/` + `components/`:
- Brand: all "StudentOS" → "Vidyas OS" (20 strings, incl. VAPI assistant name).
- Glows: cyan `rgba(34,211,238,…)` → indigo `rgba(79,70,229,…)` everywhere.
- Shadows: heavy black `rgba(0,0,0,0.25–0.5)` → soft slate `rgba(15,23,42,0.08–0.14)`.
- Overlays: `bg-white/5|10|[0.03]`, `bg-card/70|50`, `border-line/50` → solid light tokens.
- Dashboard hand-reskinned (hero, stats, cards, right rail).
- Editor desks (report-editor, ppt deck-viewer toolbar) dark hex → light.
- Interview meeting (live-session): room chrome → light; only the 2 video-feed tiles stay dark. Code/terminal output → light.
- Landing, coming-soon, admin verified light-safe. Form fields confirmed light.

**Verification caveat:** tsc clean + public pages (`/`, `/u/[handle]`) render 200 + authed routes compile (307 via Clerk). Per-screen *visual* fidelity to each mockup is NOT individually confirmed (auth wall) — needs the user's signed-in eyeball pass.

## PHASE 3 — missing screens + wiring (in progress)
Decisions: build missing screens first, then wire; add DB models; payments UI-only.
- [x] **Pricing `/plans`** — real 3-tier page (Free/Pro/Premium) → checkout. Replaced ComingSoon.
- [x] **DSA Leaderboard `/dsa/leaderboard`** — REAL data: aggregates `DsaAttempt` distinct solves → V-Score rank. `lib/dsa/leaderboard.ts`. Linked from /dsa.
- [x] **Career-goal onboarding** — added `careerGoal` to onboarding form + action; new `User.careerGoal` field.
- [x] **DB migration** `add_career_goal_deadline_studyplan`: `User.careerGoal`, models `Deadline`, `StudyPlan` (Workspace/Subject already existed).
- [x] Wire Semester Hub → real Workspace/Subject/Deadline (`lib/semester.ts`, `lib/actions/semester.ts`, `AddSubjectButton`). Empty states + Add Subject create flow.
- [x] Wire Subject Detail `/semester/[slug]` → real Subject (by id) + its documents (DocumentRow) + deadlines.
- [x] Wire Planner → real StudyPlan; `generateStudyPlan` action builds+stores a roadmap; empty-state generate form + regenerate.
- [x] Wire Semester History → real Workspaces (current + past terms, subject/file counts).
- [x] Settings shows real `careerGoal`.
- [x] DB queries smoke-tested against real Neon DB (all OK ✅).
- [ ] Checkout: UI-only (Razorpay deferred per decision — pay button placeholder).
- [ ] Public profile `/u/[handle]`: scaffold (data exposure pending decision).

**Verification:** tsc clean; routes compile (307 authed); `scratchpad/smoke.ts` ran all new Prisma queries against the live DB successfully. Authed screens still need a signed-in visual pass.

## PHASE 4 — TRUE redesign of existing pages to match mockup LAYOUTS (not just recolor)
Workflow per page: read `*_light/screen.png` → rebuild JSX to that layout, keep data/wiring → verify via temp public `previewtmp` route + Chrome headless screenshot → delete temp.
- [x] **Dashboard** — rebuilt to `dashboard_light`. Verified by screenshot ✅.
- [x] **Resume editor** `/resume/[id]` — rebuilt to two-panel (Editor/Templates/History tabs · Resume Score · AI Recommendation · form | live A4 preview). Keeps ResumeEditor + ATS/density/export wiring. Verified ✅.
- [x] **Report editor** `/reports/[id]` — rebuilt to doc + status bar (words/reading-level/AI-Connected) + right AI Assistant rail (real quality badges + Humanize). Keeps ReportEditor + clarify/humanize/export. Verified ✅.
- [x] **PPT workspace** `/ppt/[id]` — DeckViewer already has rail+stage+toolbar+Present+Export matching `ppt_presentation_workspace_light`; header tidied. (AI Design right-rail deferred — DeckViewer owns its width.)
- [x] **DSA Practice** `/dsa` — rebuilt to `dsa_practice_light` (streak banner + day-pills, filterable Problem Catalog, Accuracy/Solved/Rank cards). Real data. Verified ✅.
- [x] **Vault** `/vault` — rebuilt to `vault_light` (stat tiles Reports/PPTs/Assignments/Recent + status-badge card grid). Real data. Verified ✅.
- [x] **Assignments** `/assignments` — rebuilt to `assignments_light` (centered solver + Current Assignments rail w/ status chips). Keeps SolveAssignmentForm. Verified ✅.
- [x] **Projects** `/projects` — rebuilt to `project_ideas_light` (Idea Catalyst + Idea Generator card + concept-card grid). Keeps ProjectIdeasForm. Verified ✅.
- [x] **Viva detail** `/viva/[id]` — rebuilt to `viva_prep_light` (AI Viva Coach header + Start Mock · Coverage rail + Panel Tip · Predicted Panel Questions w/ frequency badges + collapsible Show Answer). Verified ✅.
- [x] **Profile** `/profile` — built real page to `student_profile_light` (avatar+badge+links+Share→/u/handle · DSA stat row · Top Projects · ATS Resume card). Replaced ComingSoon stub; real data. Verified ✅.
- [x] **Auth** `/sign-in`,`/sign-up` — rebuilt to `auth_sign_in_up` split layout (branded form left + indigo marketing `AuthAside` right). Clerk form preserved. Verified ✅.

## PHASE 5 — inner components + index pages (the "still looks old" fix)
Verified by rendering the **REAL** components in a preview harness (not lookalikes).
- [x] **ReportEditor** — default view now the clean "Academic Submission" document (eyebrow → auto-numbered cyan sections via `.report-doc` CSS → justified body → callouts); Word-accurate A4 moved to secondary "Word preview" tab. Export/updateReportAction/download wiring intact. Verified real component ✅.
- [x] **Index pages** `/reports`, `/resume`, `/interview` — rebuilt to header + self-carding generator form + **card-grid history** (was form-left/rows-right). Fixed double-card nesting. Verified real GenerateReportForm in layout ✅.
- [x] **DSA solve** `/dsa/[slug]` — two-column (problem left · code editor + results right) matching `dsa_practice_light`.
- [x] **Assignment detail** `/assignments/[id]` — AI Solver step-by-step (numbered steps) + Vidyas AI Tutor rail (`assignments_light`).
- [x] **Interview eval** `/interview/[id]` — big score badge + Performance Breakdown bars + Strengths/Improvement Roadmap (`interview_evaluation_report_1`).
- [x] **Project detail** `/projects/[id]` — two-column overview + Academic Bundle rail with icon rows.
- [x] Swept app for old tells (Times New Roman = font-picker option only; shadow-2xl = present-mode on black; bg-base = white sidebar/panels — all legitimate). No stale A4 left in default views.
- [x] **ResumeEditor form** — regrouped into section cards (Personal Information · Skills +Group · Experience +Add Role · Projects +Add Project · Education) with accent-dot headers, proper-case labels, cyan "Optimize & Save". Verified REAL component ✅.
- [x] **DeckViewer (PPT editor)** — toolbar tidied into a clean bar (cyan Present + Edit/+Slide/Save), keeps rail+stage. Verified REAL component ✅.

### REDESIGN COMPLETE — every nav route + heavy inner component rebuilt to the stitch mockups, verified by rendering REAL components where auth-gated; remaining detail pages confirmed via shared primitives + need a user logged-in pass.

**Verification note:** report-editor + index pages verified via REAL-component preview harness. The inline detail-page layouts (dsa solve, assignment, interview eval, project) are tsc-clean + use the verified card/badge primitives but are auth-gated → need a logged-in pass from the user to confirm visually.

### Status: all mockup-backed pages rebuilt to their layouts.
Not rebuilt (intentional): Reports/PPT/Resume/Interview **list** pages = generator+history, already light, no dedicated mockup → left as-is. Interview live session already dark-immersive matching `ai_mock_interview`. Onboarding already light + has career-goal step.

## EXISTING routes — re-skin to light in place (SUPERSEDED by Phase 4 — these were recolor-only)
| Stitch folder | Route | Status |
|---|---|---|
| vidyas_os_dashboard_light | /dashboard | todo |
| vidyas_os_assignments_light | /assignments | todo |
| vidyas_os_vault_light / _empty_state | /vault | todo |
| vidyas_os_reports_ppt_editor_light | /reports, /reports/[id] | todo |
| vidyas_os_ppt_presentation_workspace_light / _optimized | /ppt, /ppt/[id] | todo |
| vidyas_os_viva_prep_light | /viva | todo |
| vidyas_os_resume_builder / _preview_editor_light | /resume, /resume/[id] | todo |
| vidyas_os_ai_mock_interview / _live_session | /interview, /interview/[id] | todo (dark immersive) |
| vidyas_os_live_ai_interview_meeting_mode | /interview/[id] live | todo (dark) |
| vidyas_os_interview_evaluation_report_1/2 | /interview/[id] report | todo |
| vidyas_os_dsa_practice_light | /dsa, /dsa/[slug] | todo |
| vidyas_os_dsa_leaderboard_grading_a2 | /dsa leaderboard | todo (dark) |
| vidyas_os_project_ideas_light | /projects | todo |
| vidyas_os_student_profile_light | /profile | todo |
| vidyas_os_onboarding_flow / _career_goals | /onboarding | todo |
| vidyas_os_pricing_plans | /plans | todo |
| vidyas_os_auth_sign_in_up | /sign-in, /sign-up | todo |

## PHASE 6 — Interview system rework (surprise coding + AI code review)
Decisions: keep VAPI voice; coding tasks hidden until sprung; AI checks SYNTAX only (no run); Submit-for-Review (removed Run Tests); auto-flip to editor via deterministic hand-off phrase + manual safety net; high-quality questions.
- [x] **Question quality** — upgraded `generateInterviewQuestionSet` prompt (resume-grounded, depth, STAR, crisp self-contained coding, no preview). Verified with real AI ✅.
- [x] **AI code review (no execution)** — `reviewInterviewCode` in `packages/ai/src/interview.ts` + `/api/interview/review`. Returns {syntaxValid, onTrack, verdict, issues, spokenFeedback}. Verified real AI on good/broken/wrong/empty ✅.
- [x] **VAPI system prompt** — no coding preview; exact hand-off phrase "Let's move to the code editor for this one"; wait silently during coding; respond only on "[CODE REVIEW]" system msg.
- [x] **live-session.tsx two-mode UI** — Meeting mode (AI video + question caption + PiP) ↔ Coding mode (AI + task + CodeMirror + "Submit for Review" + verdict card + "Monitoring code…"). Auto-flip on hand-off phrase; manual "Open editor" safety net; removed Run/`/api/interview/run` usage. VAPI lifecycle preserved.
- [x] Code submission injected back via `vapi.send({type:'add-message', triggerResponseEnabled:true})` so the interviewer voices the verdict and advances; code+verdict folded into transcript for final eval.
- [ ] **NEEDS USER LIVE TEST** (no VAPI key/mic here): surprise auto-flip timing, the inject-back voice response, full coding round end-to-end.

## PHASE 7 — AI images in Reports & PPTs (approve-before-generate)
- [x] **Fixed broken image model**: `openai/dall-e-3` is NOT on the gateway (PPT images were silently failing). Default → `openai/gpt-image-1` (verified) + `IMAGE_MODEL` env set. `generateSlideImage(prompt, size)` now takes a size.
- [x] **Report figures (new)**: `suggestReportFigures` (AI proposes figures, generates nothing) → approve/Skip cards in report editor AI rail (`FigureSuggestions` + `lib/actions/figures.ts`) → on approve, `approveReportFigure` generates (gpt-image-1 1536x1024), stores R2, embeds, re-renders. Generate ONLY on approve = credit-safe.
- [x] **Programmatic Word builder** `renderReportDocxProgrammatic` (docx lib, ImageRun figures + captions). DEFAULT report format now uses it (cleaner + image-capable); uploaded custom templates keep docxtemplater (no figures). `ReportSection` schema gained `image`/`caption`/`imagePrompt`. Edits preserve figures (merge in `updateReportContent`).
- [x] Verified each piece with REAL AI/image calls: gpt-image-1 generates; figure suggestions are precise + skip text-only sections; programmatic builder produced a valid .docx with embedded figure.
- [ ] NEEDS USER TEST: full approval UI in a real report; figures show in the **Word preview** tab + downloaded DOCX (clean "Document" text tab shows text only).
- [ ] PPT: per-slide "Generate image" works again (model fix); AI auto-suggest + resize/position controls = follow-up.
