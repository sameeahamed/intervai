# IntervAI

An AI-assisted mock-interview platform: candidates record spoken answers to role-specific
questions, receive multi-dimensional evaluation, and view an assessment report; admins
review candidates, interviews, and integrity events.

## Stack

- **Frontend:** React 19 + TypeScript, Vite, Tailwind CSS v4, Recharts, lucide-react
- **Server:** Express (`server.ts`) served via `tsx` in dev
- **Data**: Mongoose/MongoDB when `MONGODB_URI` is set; otherwise an in-memory store
- **AI**: optional Google GenAI (`@google/genai`) for scoring/personalization

## Getting started (Windows)

Prerequisites: Node.js 20+ (verified on Node v24.19.0) and npm (verified on 11.17.0).

1. Install dependencies:
   ```
   npm install
   ```
2. Configure the environment (optional). Copy `.env.example` to `.env` in the project
   root and fill in only what you need. The app runs with an empty `.env` using the
   in-memory store and the no-AI fallback.
3. Start the development server:
   ```
   npm run dev
   ```
   Then open http://localhost:3000 (Express + Vite middleware, single port).
4. Production-style build and run:
   ```
   npm run build
   npm start
   ```
   `npm run build` writes the client to `dist/` and bundles the server to `dist/server.cjs`;
   `npm start` runs that bundle.

Notes:
- `npm run clean` uses `rm -rf` and therefore needs a POSIX shell (Git Bash/WSL). On
  PowerShell delete the build output manually: `Remove-Item -Recurse -Force dist`.
- Never commit `.env` (it is gitignored). `.env.example` is the committed template.

## Scripts

- `npm run dev` – start the app (Express + Vite middleware) on port 3000
- `npm run build` – build the client (`vite build`) and bundle the server to `dist/server.cjs`
- `npm start` – run the production server bundle
- `npm run lint` – type-check the project (`tsc --noEmit`)

## Environment variables

Names only — set values in `.env`, never in source.

| Variable | Purpose |
| --- | --- |
| `MONGODB_URI` | MongoDB connection string. Leave empty for in-memory-only mode. |
| `DATABASE_URL` | Optional fallback connection string. |
| `AUTH_SECRET` | HMAC secret for signing sessions/tokens. **Required in production** and must be at least 32 characters; the server refuses to start otherwise. In development an ephemeral secret is generated automatically (tokens become invalid after a restart). |
| `GEMINI_API_KEY` | Enables Google GenAI question generation, evaluation, and synthesis. |
| `AI_API_KEY` | Alias for an external AI proxy; either key enables AI. |
| `GEMINI_MODEL` | Primary Gemini model id. Defaults to `gemini-2.5-flash`. |
| `GEMINI_MODEL_FALLBACKS` | Comma-separated extra model ids tried in order if the primary fails. |
| `GEMINI_TTS_MODEL` | Gemini text-to-speech model id. Defaults to `gemini-2.5-flash-preview-tts`. |
| `APP_URL` | Public base URL used when composing links. |
| `VOICE_PROVIDER` | Voice mode selector (e.g. `browser`, `gemini-tts`, `web-speech`). Defaults to browser Web Speech. |
| `TTS_API_KEY` / `STT_API_KEY` | Optional external text-to-speech / speech-to-text keys. |
| `NODE_ENV` | `production` enables strict secret enforcement and disables dev-only reset-token exposure. |
| `DISABLE_HMR` | Disables Vite HMR in dev. |

## Demo accounts & risks

| Role | Email | Password |
| --- | --- | --- |
| Candidate | `candidate@intervai.com` | `candidate123` |
| Admin | `admin@intervai.com` | `admin123` |
| Candidate | `liam.chen@tech.org` | `liam123` |

These are seed/demo credentials for local evaluation. They are publicly documented in this
repository, so they must never be used in a real deployment and no real candidate data should
be loaded while they remain active. Passwords are stored as salted scrypt hashes; any
unmigrated legacy record is upgraded to scrypt on the next successful login.

## Behavior

### Authentication & password recovery
- Signed HMAC-SHA256 session tokens (7-day expiry); production requires a ≥32-char `AUTH_SECRET` and the server refuses to start without it.
- Password reset tokens are 256-bit secrets stored only as SHA-256 digests, valid 15 minutes and single-use. The forgot endpoint returns an identical generic response for known and unknown emails. Outside production the link is surfaced as `?resetToken=` for local testing; production never returns it.
- In-memory rate limiting: login 10/15 min per (IP + email), forgot 5/60 min per IP, reset 10/60 min per IP.
- Profile updates are whitelisted to safe fields; id/email/role/password cannot be changed through the profile route.

### AI-disabled fallback
When no AI key is configured, the server still produces a complete experience from local,
deterministic logic: adaptive question generation, answer evaluation (scores and feedback),
and the final assessment report are all synthesized on the server. No paid AI or voice
service is contacted. Every generated question, evaluation, and report carries an
`aiSource` field (`gemini` or `fallback`) and the UI labels fallback content, so the app
never presents offline output as if an AI model produced it. The offline evaluator does not
praise empty, single-word, gibberish, or off-topic answers; those are scored low.

### Data & persistence
- **With `MONGODB_URI`:** users, templates, interviews, questions, answers, evaluations,
  visual metrics, reports, integrity events, and scoring config are persisted and restored on
  restart. (Known gap: `Question.spokenLeadIn` / `spokenDialogue` are not restored.)
- **Without `MONGODB_URI`:** everything lives in memory only and is **lost on restart**;
  rate-limit counters and password-reset tokens are also per-process and reset on restart.

### Practice vs graded interviews
- **Graded** interviews produce an evaluation per answer, adaptive follow-up probes, and an
  official assessment report, and they feed candidate/admin analytics. Graded answers are
  immutable (re-submission is blocked).
- **Practice** interviews persist and reload but are excluded from grading, reports, and
  analytics; answers may be re-recorded. No official report is ever generated for practice.

### Personalization, follow-up probes, and spoken delivery metrics
- **Personalization:** the candidate's saved resume/experience text (and a job description
  captured at interview creation) are passed to question generation for tailoring.
- **Follow-up probes:** during graded interviews the server may insert adaptive probes,
  enforced server-side to a maximum nesting depth of 2, one child per parent, only for
  substantive answers; top-level question progression is never advanced by probes.
- **Spoken delivery metrics:** the assessment report includes a **Spoken Delivery Analytics**
  section computed from real transcripts and recorded audio durations — filler-word
  count/breakdown, total words, and speaking pace (words per minute). Metrics show as
  **unavailable** when transcripts or valid durations are absent and never divide by zero.
  These are text-based delivery signals only (no emotion/confidence/personality inference)
  and are included in the CSV export.

### Admin
- Candidate and interview drill-down endpoints (`GET /api/admin/candidates/:id`,
  `GET /api/admin/interviews/:id`) expose transcripts, answers, evaluations, and integrity
  events; all admin routes require an admin role (403 otherwise).
- Integrity events are grouped by day in the audit view, with a banner indicating whether
  persistence is backed by MongoDB or the in-memory store. No fabricated audit entries are shown.

### Accessibility & print
- Modals expose dialog semantics (`role="dialog"`, `aria-modal`, `aria-labelledby`); dismissable
  dialogs close on Escape or a backdrop click, move focus into the panel on open, and restore
  focus + scroll on close. The feedback and practice dialogs intentionally require an explicit action.
- The candidate profile uses the app's fixed dark theme (no OS-dependent light/dark variants).
- Print / PDF hides the global navigation and footer and expands the question-by-question
  section so transcripts, feedback, and model answers are included.

## Verification status

Verified locally during this handover:

- `npm run lint` (`tsc --noEmit`) — **PASS**
- `npm run build` (`vite build` + server bundle) — **PASS**
- Authentication/recovery, personalization + no-AI fallback, practice mode + follow-up
  depth, speech analytics/CSV, admin authorization/audit, and the full candidate → template
  → answer → report journey — **PASS** via the isolated suites (unit + HTTP against a local
  instance on a non-default port with sanitized env).

Not verified (no live services were contacted):

- Live MongoDB Atlas persistence/restore was **not** exercised against a real cluster; the
  integrity-restore path is covered only by a mocked data layer.
- Live Google GenAI / TTS / STT calls were **not** exercised; only the no-AI fallback is verified.
- No automated browser or accessibility (axe) audit was run; the modal/print behavior is
  verified structurally and by build/type-check only.

## Distinction: demo build vs production readiness

This is a **college/demo build** intended for local evaluation and presentation. It is **not
production-ready**: it ships public demo credentials, uses best-effort in-memory rate limiting,
stores some state only in memory, has not been load/security-tested, and has no SMTP/email
delivery, SSO, or managed secrets story.

## Known limitations

- Speech analytics are client-side, text-based, and derived only from stored transcripts and
  durations; they deliberately do not infer emotion, confidence, or personality.
- `syncFromMongoDB` does not currently restore `Question.spokenLeadIn` / `spokenDialogue`.
- In-memory mode does not persist across restarts; data survival requires a MongoDB connection.
- `verifyPassword` retains a plaintext-equality fallback for unmigrated legacy records; those
  records are upgraded to scrypt on first successful login, but any legacy store should be
  migrated before deployment.
- Resume text is length-limited only on the client (8000 chars); job descriptions are capped
  server-side (20000 chars). A direct API caller could exceed the client cap.
- No automated browser/a11y test suite; see Verification status above.
