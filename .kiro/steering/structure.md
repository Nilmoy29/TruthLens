# Project Structure

## Root Directory Organization

```
├── app/                    # Next.js App Router pages and API routes
├── components/             # Reusable React components
├── extension/              # Browser extension files
├── hooks/                  # Custom React hooks
├── lib/                    # Utility libraries and configurations
├── public/                 # Static assets
├── styles/                 # Global CSS files
├── supabase/              # Database migrations and configuration
└── node_modules/          # Dependencies
```

## App Directory (Next.js App Router)

```
app/
├── api/                   # API route handlers
│   ├── admin/            # Admin-specific endpoints
│   ├── bias-analysis/    # Bias detection API
│   ├── content-calendar/ # Content tracking and analytics
│   ├── extension/        # Browser extension API endpoints
│   ├── fact-check/       # Fact-checking API
│   ├── history/          # User analysis history
│   ├── media-verify/     # Media verification API
│   ├── notifications/    # Notification system
│   ├── profile/          # User profile management
│   ├── settings/         # User settings
│   └── subscription/     # Subscription management
├── admin/                # Admin dashboard pages
├── analytics/            # Analytics dashboard
├── content-calendar/     # Content calendar interface
├── dashboard/            # Main user dashboard
├── help/                 # Help and documentation
├── history/              # Analysis history page
├── pricing/              # Subscription pricing
├── profile/              # User profile page
├── settings/             # User settings page
├── globals.css           # Global styles
├── layout.tsx            # Root layout component
└── page.tsx              # Homepage with main analysis tools
```

## Components Directory

```
components/
├── ui/                   # shadcn/ui component library
│   ├── button.tsx        # Button component
│   ├── card.tsx          # Card component
│   ├── form.tsx          # Form components
│   ├── input.tsx         # Input component
│   └── ...               # Other UI primitives
├── loading-state.tsx     # Loading indicators
├── navigation.tsx        # Main navigation component
├── notifications.tsx     # Notification system
└── theme-provider.tsx    # Theme context provider
```

## Browser Extension

```
extension/
├── manifest.json         # Extension configuration
├── background.js         # Service worker for API calls
├── content.js           # Content script for page analysis
├── popup.html           # Extension popup interface
├── popup.js             # Popup functionality
├── options.html         # Settings page
├── options.js           # Settings functionality
└── styles.css           # Extension styles
```

## Database Structure

```
supabase/
├── migrations/          # Database schema migrations
│   ├── 001_initial_schema.sql    # Core tables and RLS policies
│   ├── 002_notifications.sql    # Notification system
│   └── 003_content_calendar.sql # Content tracking tables
├── config.toml         # Supabase configuration
└── seed.sql            # Sample data for development
```

## Key Database Tables
- `fact_checks` - Fact-checking analysis results
- `bias_analyses` - Bias detection results  
- `media_verifications` - Media authenticity results
- `profiles` - User profile information
- `user_settings` - User preferences and configuration
- `subscriptions` - Subscription and billing data
- `usage_logs` - API usage tracking

## Naming Conventions

### Files & Directories
- **Pages**: kebab-case (e.g., `content-calendar/`)
- **Components**: kebab-case files, PascalCase exports (e.g., `loading-state.tsx` exports `LoadingState`)
- **API Routes**: kebab-case with `route.ts` suffix
- **Hooks**: camelCase with `use-` prefix (e.g., `use-notifications.ts`)

### Code Conventions
- **React Components**: PascalCase
- **Functions & Variables**: camelCase
- **Constants**: UPPER_SNAKE_CASE
- **Types & Interfaces**: PascalCase
- **CSS Classes**: Tailwind utility classes

## Import Patterns
- Use `@/` path alias for imports from project root
- Group imports: external libraries, then internal modules
- Prefer named exports over default exports for utilities