# TruthLens

**AI-powered media integrity platform** to identify misinformation, analyze bias, and detect manipulated content.

TruthLens helps users fact-check text and URLs, analyze political bias and emotional tone, and verify images/videos (including deepfake detection). History is stored per user via Supabase, with optional in-browser fallback when not signed in.

---

## Features

- **Fact Check** — Paste text or an article URL for AI credibility analysis, source hints, and red-flag detection (Groq LLaMA).
- **Bias Analysis** — Analyze political leaning, emotional tone, and bias indicators in articles or posts (Groq LLaMA).
- **Media Verification** — Upload images or videos for authenticity scoring, metadata checks, and deepfake detection (Hive AI).
- **Analysis History** — View and revisit past fact-checks, bias analyses, and media verifications (Supabase when signed in, else `localStorage`).
- **Media Literacy Guide** — In-app tips for spotting misinformation, identifying bias, and digital verification.
- **Extension APIs** — Browser-extension–friendly endpoints under `/api/extension/*` for fact-check, bias-analysis, and media-verify.
- **Dashboard & Content** — Dashboard, content calendar, analytics, history, settings, and admin (when configured).

---

## Tech Stack

| Layer        | Technology |
|-------------|------------|
| Framework   | Next.js 15 (App Router), React 19 |
| Language   | TypeScript |
| Styling    | Tailwind CSS 4, Radix UI, Framer Motion |
| Backend    | Next.js API Routes, Supabase (Auth + Postgres) |
| AI         | Vercel AI SDK, Groq (`llama-3.3-70b-versatile`) |
| Media AI   | Hive AI (deepfake / media verification) |

---

## Prerequisites

- **Node.js** 18+
- **Supabase** project (for auth and persistence)
- **Groq** API key (for fact-check and bias analysis)
- **Hive AI** API key (for media verification / deepfake detection)

---



## Project structure (high level)

```
truthlens/
├── app/
│   ├── page.tsx              # Main app: Fact Check, Bias Analysis, Media Verify tabs
│   ├── layout.tsx            # Root layout, metadata
│   ├── api/
│   │   ├── fact-check/       # POST fact-check (text/URL)
│   │   ├── bias-analysis/    # POST bias analysis
│   │   ├── media-verify/      # POST media file verification
│   │   ├── extension/        # Extension-friendly fact-check, bias-analysis, media-verify
│   │   ├── history/          # User history
│   │   ├── content-calendar/ # Content recommendations
│   │   ├── admin/            # Admin metrics/users
│   │   └── ...
│   ├── dashboard/
│   ├── history/
│   ├── settings/
│   └── ...
├── components/               # UI (navigation, cards, forms, loading, etc.)
├── lib/
│   ├── supabase-client.ts   # Browser Supabase client
│   ├── supabase.ts          # Server Supabase
│   ├── api-middleware.ts    # Auth, validation, rate limit
│   ├── error-handler.ts
│   ├── notifications.ts
│   └── utils.ts
└── ...
```

---

## API overview

- **Authentication** — Main analysis routes use `withAuth` (Supabase session required). Unauthenticated requests receive `401`.
- **Fact check** — `POST /api/fact-check` with `{ "content": "text or URL" }`. Max length 5000 chars.
- **Bias analysis** — `POST /api/bias-analysis` with `{ "content": "text or URL" }`.
- **Media verification** — `POST /api/media-verify` with `FormData` and a `file` (image/video). Allowed types: JPEG, PNG, GIF, MP4, MOV; max 50MB.
- **Extension** — Same actions via `/api/extension/fact-check`, `/api/extension/bias-analysis`, `/api/extension/media-verify` for browser extensions.

---

## License

Private by default. Add your own license file if you open-source.
