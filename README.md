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

## Getting Started

### 1. Clone and install

```bash
git clone <your-repo-url>
cd truthlens
npm install
```

### 2. Environment variables

Create `.env.local` in the project root with:

```env
# Supabase (required for auth and history)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Server-side Supabase (used by API middleware)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# Groq (fact-check + bias analysis)
GROQ_API_KEY=your-groq-api-key

# Hive AI (media verification / deepfake)
HIVE_API_KEY=your-hive-api-key
```

Get keys from:

- [Supabase](https://supabase.com/dashboard) → Project Settings → API
- [Groq Console](https://console.groq.com/) → API Keys
- [Hive AI](https://thehive.ai/) → API access

### 3. Supabase setup

In the Supabase SQL editor, create tables and RLS as needed. The app expects at least:

- **`fact_checks`** — `id`, `user_id`, `content`, `score`, `analysis`, `flags`, `sources`, `methodology`, `created_at`
- **`bias_analyses`** — `id`, `user_id`, `content`, `political_bias`, `bias_confidence`, `emotional_tone`, `analysis`, `bias_indicators`, `created_at`
- **`media_verifications`** — `id`, `user_id`, `content`, result payload, `created_at`
- **`profiles`** (optional) — for admin role: `id`, `role`

Enable Row Level Security (RLS) and policies so users can only read/write their own rows where appropriate.

### 4. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign in (or use the app with local-only history).

---

## Scripts

| Command        | Description              |
|----------------|--------------------------|
| `npm run dev`  | Start dev server         |
| `npm run build`| Production build         |
| `npm run start`| Run production server    |
| `npm run lint` | Run Next.js lint         |

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
