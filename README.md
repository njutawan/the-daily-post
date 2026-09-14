# The Daily Post

> Breaking news, politics, opinion & analysis — a production-ready news portal built with Next.js 16, Clerk authentication, Stripe subscriptions, and real-time live blog.

[![npm](https://img.shields.io/npm/v/@njutawan/the-daily-post)](https://www.npmjs.com/package/@njutawan/the-daily-post) [![Release](https://img.shields.io/github/v/release/njutawan/the-daily-post)](https://github.com/njutawan/the-daily-post/releases)

![Next.js](https://img.shields.io/badge/Next.js-16-black) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![Tailwind](https://img.shields.io/badge/Tailwind-4-38bdf8) ![Clerk](https://img.shields.io/badge/Auth-Clerk-6c47ff) ![Prisma](https://img.shields.io/badge/DB-Prisma-2d3748)

## Features

### Editorial
- **Newspaper-grade typography** — Playfair Display (headlines) + Lora (body) + Libre Franklin (UI)
- **Reading column** — 65ch golden measure, 1.75 line-height, drop cap
- **Table of Contents** — Sticky sidebar TOC on tablet/desktop
- **Reading progress bar** — Top-of-page scroll indicator
- **Font resizer** — Accessibility feature for low-vision readers
- **Listen to article** — AI-powered TTS narration
- **Dark mode** — Full dark theme with WCAG AAA contrast

### Content & SEO
- **Sitemap system** — Index + 6 sub-sitemaps (static, categories, authors, articles, Google News, images)
- **RSS feeds** — Global + per-category XML feeds
- **JSON-LD** — Organization, WebSite, Article, Breadcrumb structured data
- **Open Graph** — Auto-generated OG images per article
- **robots.txt** — AI crawler-friendly (GPTBot, ClaudeBot, etc.)
- **llms.txt** — AI answer-engine citation file

### Authentication (Clerk-only)
- **3 login pages** — `/member` (public), `/admin` (hidden), `/editorial` (hidden)
- **Clerk `<SignIn>`** — Email/password + OAuth (Google/Apple/Facebook)
- **Role-based access** — reader / editor / admin
- **Subscription tiers** — free / digital / allaccess

### Commerce
- **Stripe** — Real subscription checkout + webhook
- **Paywall** — Metered (3 free/month) + premium article gating
- **Newsletter** — Double opt-in with email verification

### Real-time
- **Live blog** — Socket.io real-time updates
- **Comments** — Threaded with upvotes, reports, 5-min edit window
- **View tracking** — Real-time view counts

### Security
- **CSRF protection** — Origin verification on all state-changing requests
- **Rate limiting** — 37 API endpoints with IP + user-based limits
- **Admin auth** — HMAC token cookie (no plaintext password)
- **Security headers** — CSP, HSTS, X-Frame-Options, COOP, CORP, Permissions-Policy
- **Sitemap** — Disallow `/admin`, allow `/member` + `/editorial`

### Mobile (Material Design 3)
- **Bottom navigation** — MD3 active pill indicator, 48dp touch targets
- **Card elevation** — MD3 tonal elevation + rounded shapes
- **Safe area** — Edge-to-edge with `env(safe-area-inset-*)`
- **Sticky CTA** — Non-intrusive subscribe prompt on article scroll

## Tech Stack

| Category | Technology |
|---|---|
| Framework | Next.js 16 (App Router, webpack) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 + shadcn/ui (New York) |
| Auth | Clerk (production keys) |
| Database | Prisma ORM (SQLite dev / Postgres prod) |
| Payments | Stripe |
| Real-time | Socket.io |
| AI | z-ai-web-dev-sdk (TTS, VLM, LLM, image gen) |
| State | Zustand + TanStack Query |
| Forms | React Hook Form + Zod |
| Email | Resend |
| Analytics | Plausible |
| Icons | Lucide React |

## Getting Started

### 1. Install dependencies
```bash
bun install
```

### 2. Set up environment variables
```bash
cp .env.example .env
# Edit .env with your Clerk keys, database URL, etc.
```

See [VERCEL_ENV.md](./VERCEL_ENV.md) for the full list with Vercel deployment instructions.

### 3. Set up the database
```bash
bun run db:push    # Create tables from Prisma schema
```

### 4. Start the dev server
```bash
bun run dev
# Open http://localhost:3000
```

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── page.tsx            # Homepage
│   ├── article/[slug]/     # Article pages
│   ├── category/[cat]/     # Category pages
│   ├── member/             # Member dashboard (public login)
│   ├── admin/              # Admin dashboard (hidden, URL-only)
│   ├── editorial/          # Editor workspace (hidden, URL-only)
│   ├── api/                # API routes (37 endpoints)
│   ├── sitemap.xml/        # Sitemap index + 6 sub-sitemaps
│   ├── feed.xml/           # RSS feed
│   ├── robots.ts           # robots.txt
│   └── layout.tsx          # Root layout
├── components/             # React components
│   ├── ui/                 # shadcn/ui primitives
│   ├── Header.tsx          # App bar with scroll behavior
│   ├── Footer.tsx
│   ├── MobileBottomNav.tsx # MD3 bottom navigation
│   ├── ArticleCard.tsx
│   ├── StickySubscribeCTA.tsx
│   ├── WeatherWidget.tsx   # IP-geolocated weather
│   └── ...
├── lib/                    # Server-side utilities
│   ├── auth-unified.ts     # Clerk-only getSessionUser()
│   ├── rate-limit.ts       # IP + user rate limiter
│   ├── security.ts        # CSRF + SSRF protection
│   ├── env.ts             # Build-safe env access
│   └── ...
├── data/                   # Static article catalog
└── hooks/                  # Client hooks
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | SQLite (dev) / Postgres (Vercel) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | ✅ | Clerk publishable key |
| `CLERK_SECRET_KEY` | ✅ | Clerk secret key |
| `ADMIN_PASSWORD` | ✅ (prod) | Admin login password |
| `NEXT_PUBLIC_SITE_URL` | ✅ | Production domain |
| `WEATHERAPI_KEY` | Optional | WeatherAPI.com key |
| `RESEND_API_KEY` | Optional | Email service |
| `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` | Optional | Analytics |
| `NEXT_PUBLIC_ADSENSE_CLIENT` | Optional | Ad revenue |

See `.env.example` for all variables.

## Deployment (Vercel)

1. Push to GitHub
2. Import project in Vercel
3. Set environment variables (see [VERCEL_ENV.md](./VERCEL_ENV.md))
4. For the database, use Neon (Postgres) — change `prisma/schema.prisma` provider to `"postgresql"`
5. Deploy

## Scripts

| Command | Description |
|---|---|
| `bun run dev` | Start dev server (port 3000) |
| `bun run build` | Production build |
| `bun run lint` | ESLint check |
| `bun run db:push` | Push Prisma schema to database |
| `bun run db:generate` | Generate Prisma client |

## License

MIT — see [LICENSE](./LICENSE).
