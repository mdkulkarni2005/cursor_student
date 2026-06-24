# StudentOS — Design Persona & AI Design Brief

> Paste any section below into an AI design tool (Claude, v0, Figma Make, Lovable, etc.).
> Section 0 is the **single master prompt** — copy that alone if you want one block.
> Everything else is reference depth the AI can pull from.

---

## 0. MASTER PROMPT (copy this whole block)

You are a senior product designer designing the front end for **StudentOS** — "Cursor for Students,"
an all-in-one AI study & career operating system for college/university students (built for the Indian
engineering-college context, but broadly applicable).

**What it is:** one dark, premium, focused workspace where a student does everything academic with AI:
generate college-format assignments/reports/PPTs, build an ATS resume, practice DSA with real code
execution, run AI mock interviews (with voice + a VS Code-like editor), get project ideas, prep for
viva, and chat with an always-on AI mentor that knows their whole context.

**The user:** an 18–24 year old engineering student. Time-poor, deadline-driven, on a laptop for deep
work and a phone for quick checks. Wants outputs that look professional and college-compliant with
minimal effort. Slightly stressed; values speed, trust, and "it just works." Not a designer — the UI
must be self-explanatory.

**Brand personality:** modern, calm, premium, competent. Think Linear × Vercel × Cursor — dark-first,
high signal, low noise. Confident but never loud. It should feel like a serious tool a student is proud
to use, not a gamified toy and not a corporate dashboard.

**Design system (use exactly):**
- Dark-first. Backgrounds: canvas `#070A12`, base/sidebar `#0A0E1A`, cards `#0E1422`, surfaces/inputs
  `#131A2B`, raised/hover `#1C2740`.
- Accent gradient: cyan `#22D3EE` → indigo `#818CF8` (use for primary CTAs, focus, active states, key
  highlights — sparingly, it's the signature).
- Status: success `#34D399`, warning `#FBBF24`, danger `#FB7185`.
- Text: headings `#F1F5F9`, body `#CBD5E1`, secondary `#94A3B8`, faint/placeholder `#64748B`.
- Hairlines: `rgba(255,255,255,0.07)` borders on cards/dividers. Subtle, never heavy.
- Fonts: **Space Grotesk** (display/headings), **DM Sans** (body/UI), **JetBrains Mono** (code, ATS
  scores, terminal/run output).
- Rounded corners (cards ~12–16px), generous padding, soft depth via subtle borders + faint glows —
  not heavy drop shadows. Tasteful micro-interactions.

**Layout:** desktop = left sidebar nav + top bar (search + AI bubble + account) + content area.
Mobile = bottom tab bar (5 items max) + top bar with account; a persistent AI chat bubble overlays both.

**Core principles:**
1. Every screen has a clear primary action. Generation tools = input form → "Generating…" state → result.
2. Honest empty/zero states (no fake data) — guide the first action.
3. Outputs look professional (DOCX/PPTX/PDF/resume previews) — the result should feel high-quality.
4. The AI mentor is always reachable but never in the way.
5. Trust signals everywhere: real status, clear progress, calm error states (never raw errors).

Design clean, production-ready, dark-mode screens consistent with the above. When I name a feature,
design its full flow: entry/list → input → generating → result/detail, plus empty and error states.

---

## 1. Product Persona (the brand's "who")

**Name:** StudentOS · Tagline: "Cursor for Students" · Internal design system name: **Polaris**.

**Mission:** collapse the busywork of being a student — formatting, drafting, prepping, practicing —
into one AI workspace so students spend time on learning and building, not on Word formatting and
deadline panic.

**Voice & tone:** direct, encouraging, peer-level. Short sentences. No jargon, no fluff, no exclamation
spam. Speaks like a sharp senior who's got your back. Microcopy is warm but efficient
("Let's draft your report." / "Nice — that streak is alive.").

**Feeling the UI should evoke:** "I'm in control and ahead of my deadlines." Calm focus, quiet
confidence, a little bit of delight on success moments (generation done, tests passed, streak up).

---

## 2. The User (design for this person)

- Engineering/college student, 18–24, India-first context (semesters, viva, "mini/major/TPCS" projects,
  college-specific report/PPT formats are a real pain point).
- Devices: laptop for real work (writing, coding, interviews), phone for quick checks (streak, status,
  asking the AI a question).
- Mindset: deadline-driven, multitasking, mild stress. Wants speed + professional-looking output +
  reassurance it's correct/compliant.
- Not technical about design/UX — needs obvious affordances, no learning curve.
- Motivated by: looking competent (good resume, clean reports), not losing streaks, acing interviews/viva.

---

## 3. Information Architecture / Navigation

**Sidebar — Workspace group:**
Home (`/dashboard`) · Workspace (`/workspace`, the semester hub) · Assignments · Reports & PPT · Viva
Prep · Resume Builder · Interview Prep · DSA Practice · Project Ideas · Vault (all generated files).

**Sidebar — You group:** Profile Link (shareable public profile) · Plans & Billing.

**Top bar:** search (→ Vault), persistent AI mentor bubble, account/avatar.
**Mobile bottom bar (5 max):** Home · Assignments · Reports & PPT · Vault · (AI bubble overlay).
**Note:** DSA + coding interview rounds are hidden for non-coding branches (branch-aware nav).

---

## 4. Feature Map — every surface to design

Each tool follows the same spine: **list/landing → input form → "Generating…" overlay → result/detail
page**, with empty + error states. Design all of them.

1. **Dashboard / Home** — greeting by name + time of day; usage/quota bars (assignments/reports/PPT);
   real DSA streak (with zero-state); "Jump back in" recent docs grid; quick-launch tool cards;
   "Coming soon" teaser card.
2. **Assignments** — upload a photo of the question → AI reads & solves step-by-step → DOCX; plus a
   multi-turn tutor chat ("which formula?", "redo step 3").
3. **Reports & PPT** — upload your college's `.docx`/`.pptx` template → AI writes content into that
   exact format (format never breaks); clarifying-questions step; PPT can have per-slide images; PPT→Report
   conversion; plagiarism/AI-detection score + humanizer.
4. **Resume Builder** — locked professional "house" format; import an existing resume; edit any line
   live; one-page toggle; **live ATS score dial** + target-role keyword chips + missing-keyword
   suggestions; download DOCX + PDF.
5. **Interview Prep** — set role + rounds (technical / behavioral / coding) + paste JD → live mock
   interview: chat transcript, **VS Code-like CodeMirror editor** with Run (real code execution) for
   coding rounds, **voice mode** (AI speaks questions, you answer by voice), optional camera, "stuck?
   nudge", and a final evaluation report (score, strengths, improvements, verdict).
6. **DSA Practice** — problem catalog with solved/attempted badges; problem detail with statement +
   examples + code editor; real test-case grading (per-test ✓/✗, expected vs got); **streak banner**;
   light AI code review (time/space complexity).
7. **Project Ideas** — department-aware idea generator; compare candidate idea cards (multi-select);
   difficulty + hardware needs; finalize one → generate a full report+PPT+viva bundle for it.
8. **Viva Prep** — generates likely viva/panel questions for a topic/project; practice view.
9. **AI Mentor (always-on)** — chat bubble → expanding panel (desktop dock bottom-right, mobile
   full-screen). Knows the student's full context; supports photo/vision, streaming, persisted history,
   quick-action deep links to the tools.
10. **Vault** — searchable library of every generated file (type, status, download).
11. **Workspace** — semester hub organizing work by subject/semester.
12. **Profile Link** — (coming soon) public shareable profile: resume + projects + DSA + GitHub.
13. **Plans & Billing** — (coming soon) pricing/plan page.
14. **Onboarding** — mandatory first-run form: name, department/branch (seeds coding-track toggle),
    goals, target role + legal acceptance checkbox.
15. **Admin** — read-only metrics dashboard (internal).
16. **Auth** — sign-in / sign-up (Clerk), Privacy + Terms public pages.

---

## 5. Signature UI moments (get these right)

- **"Generating…" overlay** — every AI tool shows a calm, branded generating state (cyan→indigo
  shimmer, reassuring microcopy, sense of progress). This is shown constantly — make it premium.
- **ATS score dial** (resume) — circular gauge in JetBrains Mono, color-graded, with keyword chips.
- **Code editor + run output** (DSA & interview) — dark IDE feel, oneDark-style, per-test pass/fail,
  terminal-style output pane.
- **Streak banner** (DSA) — motivating but tasteful; zero-state invites starting one.
- **Document result preview** (reports/PPT/resume) — a real, professional-looking preview + download.
- **Voice interview live session** — "on a call" presence, live transcript, speaking indicator, camera
  thumbnail, code panel when the question is coding.
- **Empty states** — honest, friendly, with a single clear CTA.
- **Error states** — never raw errors; calm "something went wrong, try again" + retry.

---

## 6. Design tokens (machine-readable)

```
colors:
  canvas:   #070A12   # app background
  base:     #0A0E1A   # sidebar / deepest panel
  card:     #0E1422   # cards
  surface:  #131A2B   # inputs, secondary panels
  raised:   #1C2740   # raised buttons / hover
  input:    #0F1626   # search field
  accent.cyan:   #22D3EE
  accent.indigo: #818CF8
  accent.gradient: linear-gradient(135deg, #22D3EE, #818CF8)
  success:  #34D399
  warning:  #FBBF24
  danger:   #FB7185
  text.ink:    #F1F5F9   # headings
  text.soft:   #CBD5E1   # body
  text.muted:  #94A3B8   # secondary
  text.faint:  #64748B   # placeholder/tertiary
  text.dim:    #475569   # disabled/labels
  line:        rgba(255,255,255,0.07)
  line.strong: rgba(255,255,255,0.10)
fonts:
  display: Space Grotesk   # headings
  body:    DM Sans         # UI/body
  mono:    JetBrains Mono   # code, scores, output
radius: cards 12-16px, inputs 8-10px, pills full
elevation: subtle 1px borders + faint glows; avoid heavy shadows
mode: dark-first (primary), design for dark
```

---

## 7. Per-screen prompt template (reuse for any screen)

> "Design the **[SCREEN NAME]** screen for StudentOS (use the StudentOS design system above:
> dark-first, canvas #070A12, cyan→indigo accent, Space Grotesk/DM Sans/JetBrains Mono).
> Purpose: [one line]. Primary action: [CTA]. Include: [key elements]. Show desktop and mobile, plus
> the empty state and the loading/generating state. Keep it calm, premium, high-signal — Linear ×
> Vercel × Cursor."

Fill `[…]` from Section 4/5 for the screen you want.
