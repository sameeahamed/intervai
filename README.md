# IntervAI

An AI-assisted mock-interview platform: candidates record spoken answers to role-specific
questions, receive multi-dimensional evaluation, and view an assessment report; admins
review candidates, interviews, and integrity events.

## Stack

- **Frontend:** React 19 + TypeScript, Vite, Tailwind CSS v4, Recharts, lucide-react
- **Server:** Express (`server.ts`) served via `tsx` in dev
- **Data**: Mongoose/MongoDB when `MONGODB_URI` is set; otherwise an in-memory store
- **AI**: optional Google GenAI (`@google/genai`) for scoring/personalization

## Scripts

- `npm run dev` – start the app (Express + Vite middleware) on port 3000
- `npm run build` – build the client (`vite build`) and bundle the server to `dist/server.cjs`
- `npm start` – run the production server bundle
- `npm run lint` – type-check only (`tsc --noEmit`)

## Environment

- `MONGODB_URI` – MongoDB connection string. If empty, the server runs in **in-memory** mode and writes are dropped while disconnected.
- `AUTH_SECRET` – secret used to sign session tokens.
- `GEMINI_API_KEY` / `AI_API_KEY` – optional AI provider keys. Without them, scoring uses the deterministic local fallback.

## Seed accounts

- Candidate: `candidate@intervai.com` / `candidate123`
- Admin: `admin@intervai.com` / `admin123`
- Additional candidate: `liam.chen@tech.org` / `liam123`

## Features

### Authentication & password recovery
- Register/login with signed tokens; admin routes guarded by role checks.
- Forgot/reset password flow: reset tokens are random 256-bit values, stored only as SHA-256 digests, valid for 15 minutes and single-use. The forgot endpoint returns an identical generic response for known and unknown emails. The reset link is delivered via `?resetToken=` and opens the auth modal in reset mode.
- In-memory rate limiting: login 10/15 min per (IP + email), forgot 5/60 min per IP, reset 10/60 min per IP.
- Profile updates are whitelisted to safe fields (id/email/role/password cannot be changed through the profile route).

### Interviews & analytics
- Analytics (candidate and admin) are computed from real submitted answers and evaluations — no hardcoded defaults; empty states report zeros.
- Practice mode interviews are persisted and reloadable but excluded from grading, reports, and analytics.
- Follow-up probes are generated during graded interviews, capped at a server-enforced depth; top-level question progression is unaffected.
- Assessment report includes a **Spoken Delivery Analytics** section computed from real transcripts and recorded audio durations: filler-word count/breakdown, total words, and speaking pace (words per minute). Metrics are shown as **unavailable** when transcripts or valid durations are absent, and the analytics never divide by zero. These are text-based delivery signals only. The same metrics are included in the CSV export.

### Admin
- Candidate and interview drill-down endpoints (`GET /api/admin/candidates/:id`, `GET /api/admin/interviews/:id`) expose transcripts, answers, evaluations, and integrity events.
- Integrity events are grouped by day in the audit view, with a banner indicating whether persistence is backed by MongoDB or the in-memory store. No fabricated audit entries are shown.

## Notes & limitations

- Speech analytics are client-side, text-based, and derived only from stored transcripts and durations; they deliberately do not infer emotion, confidence, or personality.
- `syncFromMongoDB` does not currently restore `Question.spokenLeadIn` / `spokenDialogue`.
- In-memory mode does not persist across restarts; data survival requires a MongoDB connection.
