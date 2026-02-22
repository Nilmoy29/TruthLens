# Technology Stack

## Framework & Runtime
- **Next.js 15.2.4** - React framework with App Router
- **React 19** - UI library with latest features
- **TypeScript 5** - Type-safe development
- **Node.js** - Server runtime

## UI & Styling
- **Tailwind CSS 4.1.9** - Utility-first CSS framework
- **Radix UI** - Accessible component primitives
- **Framer Motion** - Animation library
- **Lucide React** - Icon library
- **shadcn/ui** - Pre-built component system

## Database & Backend
- **Supabase** - PostgreSQL database with real-time features
- **Supabase Auth** - Authentication system
- **Row Level Security (RLS)** - Database security policies

## AI & Analysis
- **Groq AI SDK** - AI model integration for content analysis
- **Custom analysis APIs** - Fact-checking, bias detection, media verification

## Form Handling & Validation
- **React Hook Form** - Form state management
- **Zod** - Schema validation
- **Hookform Resolvers** - Form validation integration

## Development Tools
- **ESLint** - Code linting (build errors ignored in config)
- **PostCSS** - CSS processing
- **Autoprefixer** - CSS vendor prefixes

## Common Commands

```bash
# Development
npm run dev          # Start development server on localhost:3000

# Building
npm run build        # Build for production
npm run start        # Start production server

# Code Quality
npm run lint         # Run ESLint (currently disabled during builds)

# Database
supabase start       # Start local Supabase instance
supabase db reset    # Reset database with migrations
supabase db push     # Push schema changes
```

## Configuration Notes
- TypeScript and ESLint errors are ignored during builds (configured in next.config.mjs)
- Images are unoptimized for development
- CORS headers configured for API routes
- Path aliases configured: `@/*` maps to project root