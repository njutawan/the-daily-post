# The Daily Post

> Breaking news, politics, opinion & analysis — a news portal built with Next.js 16, Clerk authentication, Stripe subscriptions, and a real-time live blog.

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
- **Stripe** — Hosted subscription checkout, signed webhooks, idempotent payment records, and billing portal
- **Paywall** — Server-enforced metering (3 free articles/month) + premium article gating; restricted article text is never sent to unauthorized browsers
- **Newsletter** — Double opt-in with email verification

### Real-time
- **Live blog** — Socket.io real-time updates
- **Comments** — Threaded with upvotes, reports, 5-min edit window
- **View tracking** — Real-time view counts

### Security
- **CSRF protection** — Origin verification on all state-changing requests
- **Rate limiting** — Shared Upstash Redis limits across serverless instances, with IP + user-based keys
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
| Database | Prisma ORM 6 + PostgreSQL (Neon recommended for Vercel) |
| Rate limiting | Upstash Redis REST (`@upstash/ratelimit`) |
| Payments | Stripe |
| Real-time | Socket.io |
| AI | z-ai-web-dev-sdk (TTS, VLM, LLM, image gen) |
| State | Zustand + TanStack Query |
| Forms | React Hook Form + Zod |
| Email | Resend |
| Analytics | Plausible |
| Icons | Lucide React |

## Getting Started

### 1. Configure environment and PostgreSQL
```bash
cp .env.example .env
# Set DATABASE_URL and DIRECT_URL, then add your Clerk and other local keys.
```

The example URLs point to a local PostgreSQL database named `the_daily_post`; start PostgreSQL and create that database before continuing. For Neon, use its pooled connection string for `DATABASE_URL` and its direct/unpooled string for `DIRECT_URL`.

### 2. Install dependencies
```bash
bun install
```

### 3. Apply the checked-in migration history
```bash
bun run db:migrate
```

This applies the PostgreSQL baseline for the current Prisma schema. The old SQLite migrations are archived and are not part of the active migration history; SQLite data is not automatically transferred.

### 4. Start the dev server
```bash
bun run dev
# Open http://localhost:3000
```

See [VERCEL_ENV.md](./VERCEL_ENV.md) for Neon, Upstash, and Vercel production setup.

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
│   ├── rate-limit.ts       # Upstash Redis IP + user rate limiter
│   ├── security.ts        # CSRF + SSRF protection
│   ├── env.ts             # Build-safe env access
│   └── ...
├── data/                   # Static article catalog
└── hooks/                  # Client hooks
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL application URL; use Neon’s pooled (`-pooler`) URL on Vercel |
| `DIRECT_URL` | ✅ | Direct PostgreSQL URL used by Prisma migrations |
| `UPSTASH_REDIS_REST_URL` | ✅ (prod) | Upstash Redis REST endpoint for shared rate limits |
| `UPSTASH_REDIS_REST_TOKEN` | ✅ (prod) | Server-only Upstash Redis REST token |
| `RATE_LIMIT_CLIENT_IP_HEADER` | Self-hosted production | Header overwritten by a trusted reverse proxy with the client IP; Vercel uses its platform header |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | ✅ | Clerk publishable key |
| `CLERK_SECRET_KEY` | ✅ | Clerk secret key |
| `ADMIN_PASSWORD` | ✅ (prod) | Admin login password |
| `NEXT_PUBLIC_SITE_URL` | ✅ | Production domain (HTTPS for live Stripe Checkout) |
| `STRIPE_SECRET_KEY` | Paid plans | Stripe secret API key (`sk_test_…` / `sk_live_…`) |
| `STRIPE_WEBHOOK_SECRET` | Paid plans | Signing secret for `/api/webhooks/stripe` (`whsec_…`) |
| `STRIPE_PRICE_DIGITAL_MONTHLY` | Paid plans | Stripe recurring Price ID (`price_…`) |
| `STRIPE_PRICE_DIGITAL_ANNUAL` | Paid plans | Stripe recurring Price ID (`price_…`) |
| `STRIPE_PRICE_ALLACCESS_MONTHLY` | Paid plans | Stripe recurring Price ID (`price_…`) |
| `PAYWALL_METER_SECRET` | Recommended | Random server-only HMAC key for anonymous monthly metering |
| `PAYWALL_CLIENT_IP_HEADER` | Self-hosted production | Header name your trusted reverse proxy overwrites with one canonical client IP; Vercel uses its platform header automatically |
| `WEATHERAPI_KEY` | Optional | WeatherAPI.com key |
| `RESEND_API_KEY` | Required for production newsletter emails | Resend API key (development can show local action links) |
| `RESEND_FROM_EMAIL` | Required for production newsletter emails | Sender identity verified in Resend, e.g. `The Daily Post <newsletter@your-domain.com>` |
| `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` | Optional | Analytics |
| `NEXT_PUBLIC_ADSENSE_CLIENT` | Optional | Ad revenue |

See `.env.example` for all variables. Guest metering and API rate limiting trust only Vercel's platform-provided `x-vercel-forwarded-for` on Vercel. On other production hosts, set `PAYWALL_CLIENT_IP_HEADER` and `RATE_LIMIT_CLIENT_IP_HEADER` to headers that the trusted reverse proxy strips from incoming requests and overwrites with a single validated client IP. Do not point either variable at a client-controlled forwarding header; requests without a trusted IP source fail closed.

## Deployment (Vercel)

1. Create a Neon PostgreSQL database and an Upstash Redis database; this repository only contains the integration configuration and does not provision either service.
2. Set `DATABASE_URL` to Neon’s pooled (`-pooler`) connection string and `DIRECT_URL` to the direct/unpooled string. Preserve Neon’s `sslmode=require` parameter.
3. Set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` in Vercel as server-only environment variables. Also configure the Clerk, Stripe, newsletter, and site URL values needed for enabled features.
4. Before releasing the application, apply the PostgreSQL baseline to a **new, empty** database with `bun run db:migrate:deploy` from a controlled migration environment with both database URLs configured. Vercel builds do not run migrations automatically.
5. Import/deploy the project in Vercel. Existing SQLite data is not migrated by Prisma; export and import it separately before switching users to the new database.

## Stripe setup

Paid checkout is disabled until Stripe is configured; the application never falls back to a mock charge.
Create recurring Stripe Prices for Digital monthly, Digital annual, and All Access monthly, then set their `price_…` IDs and the server-only `STRIPE_SECRET_KEY` in the environment. Register a webhook at `https://your-domain/api/webhooks/stripe` and copy its signing secret to `STRIPE_WEBHOOK_SECRET`.

Subscribe to these webhook events. Only a verified `invoice.payment_succeeded` updates paid entitlement and its paid-through date; a Checkout return or `customer.subscription` status alone cannot grant access. Trialing/incomplete states stay gated until an invoice is confirmed paid.

- `checkout.session.completed`
- `checkout.session.expired`
- `checkout.session.async_payment_failed`
- `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
- `invoice.payment_succeeded`, `invoice.payment_failed`

Configure Stripe Customer Portal in the Stripe Dashboard before using **Manage billing**. For local development, forward Stripe CLI events to `localhost:3000/api/webhooks/stripe`. Apply local schema changes with `bun run db:migrate`; use `bun run db:migrate:deploy` in a controlled production migration step. Do not use `db:push` for production.

## Scripts

| Command | Description |
|---|---|
| `bun run dev` | Start dev server (port 3000) |
| `bun run build` | Production build |
| `bun run lint` | ESLint check |
| `bun run db:migrate` | Apply/create migrations for local development |
| `bun run db:migrate:deploy` | Apply committed migrations in a controlled deployment step |
| `bun run db:migrate:status` | Check migration status |
| `bun run db:generate` | Generate Prisma client |

## License

MIT — see [LICENSE](./LICENSE).
