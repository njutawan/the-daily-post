# Vercel Deployment — Environment Variables

## Setup Guide

### 1. Database (required — do this first)

The active Prisma schema and migration history now target **PostgreSQL**. Neon is the recommended managed provider for Vercel. This repository prepares the schema and migrations but does not create or configure a remote database.

1. Create a Neon project and a new, empty database.
2. Copy both connection strings from Neon: the **pooled** endpoint (hostname includes `-pooler`) for application traffic, and the **direct/unpooled** endpoint for Prisma migrations. Preserve `sslmode=require`.
3. Set `DATABASE_URL` to the pooled connection string and `DIRECT_URL` to the direct connection string in each Vercel environment that uses the database.
4. Run the checked-in PostgreSQL baseline from a controlled migration environment with both variables set: `bun run db:migrate:deploy`.

`prisma/migrations/` contains a baseline for the entire current schema. The previous SQLite migrations are archived under `prisma/legacy-sqlite-migrations/` and must not be applied to PostgreSQL. The baseline is for an empty database; existing SQLite data must be exported/imported separately. Do not use `prisma db push` in production.

---

### 2. Vercel Dashboard → Settings → Environment Variables

Set each variable below. Mark each as **Production** (and Preview if you want
previews to work). Vercel auto-sets `NODE_ENV=production`.

---

## Environment Variables (copy-paste ready)

### REQUIRED — App won't start without these

```
Key:   DATABASE_URL
Value: <Neon pooled connection string; hostname includes -pooler>
Envs:  Production, Preview

Key:   DIRECT_URL
Value: <Neon direct/unpooled connection string>
Envs:  Production, Preview

Key:   ADMIN_PASSWORD
Value: <your-strong-admin-password>
Envs:  Production, Preview

Key:   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
Value: <your-clerk-publishable-key>
Envs:  Production, Preview, Development

Key:   CLERK_SECRET_KEY
Value: <your-clerk-secret-key>
Envs:  Production, Preview

Key:   NEXT_PUBLIC_SITE_URL
Value: https://your-actual-domain.vercel.app
Envs:  Production, Preview, Development
```

### REQUIRED IN PRODUCTION — shared rate limiting

The API rate limiter stores counters in Upstash Redis, shared across Vercel function instances. Both credentials are required for rate-limited API routes in Production and Preview; if the service is not configured/unavailable or a trusted client IP cannot be determined, those routes fail closed with HTTP 503.

```
Key:   UPSTASH_REDIS_REST_URL
Value: <your Upstash Redis REST URL>
Envs:  Production, Preview

Key:   UPSTASH_REDIS_REST_TOKEN
Value: <your Upstash Redis REST token>
Envs:  Production, Preview
```

### REQUIRED FOR PAID SUBSCRIPTIONS — Stripe

Create Stripe recurring Prices for Digital monthly, Digital annual, and All Access monthly. Configure **all** of these variables for each environment that should accept paid subscriptions:

```
STRIPE_SECRET_KEY=sk_live_...                 # use sk_test_... on Preview
STRIPE_WEBHOOK_SECRET=whsec_...               # a separate signing secret per endpoint/environment
STRIPE_PRICE_DIGITAL_MONTHLY=price_...
STRIPE_PRICE_DIGITAL_ANNUAL=price_...
STRIPE_PRICE_ALLACCESS_MONTHLY=price_...
PAYWALL_METER_SECRET=<long-random-server-only-secret>
```

On Vercel, guest metering and the API rate limiter use Vercel's platform-provided `x-vercel-forwarded-for` header; no client-IP header variable is needed. On a non-Vercel production host, set both `PAYWALL_CLIENT_IP_HEADER` and `RATE_LIMIT_CLIENT_IP_HEADER` to a header your trusted reverse proxy strips from incoming requests and overwrites with one canonical client IP. Guest metering rejects missing or malformed trusted IP data instead of trusting a client-controlled `X-Forwarded-For` entry. Keep the meter secret and Upstash token server-only.

The app does not activate a subscription from the Checkout return URL. It grants/renews paid access only after a verified `invoice.payment_succeeded` event; subscription status and trial events alone are insufficient. Add an endpoint at `https://your-domain/api/webhooks/stripe` and subscribe to:

- `checkout.session.completed`
- `checkout.session.expired`
- `checkout.session.async_payment_failed`
- `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
- `invoice.payment_succeeded`, `invoice.payment_failed`

Enable and configure the Stripe Customer Portal if members should change or cancel plans there. A missing Stripe key or Price ID returns a configuration error; it never silently activates a mock subscription.


### RECOMMENDED — Weather widget shows real data

```
Key:   WEATHERAPI_KEY
Value: <your-weatherapi-key>
Envs:  Production, Preview

Key:   WEATHER_LOCATION
Value: Washington,DC,US
Envs:  Production, Preview
```

### Newsletter email — configure both Resend values in Production

Newsletter signup and unsubscribe emails fail closed in production until both values are set. Local development shows a temporary action link in the UI instead of sending mail.

```
Key:   RESEND_API_KEY
Value: <your Resend API key>
Envs:  Production

Key:   RESEND_FROM_EMAIL
Value: The Daily Post <newsletter@your-verified-domain.com>
Envs:  Production

Key:   NEXT_PUBLIC_PLAUSIBLE_DOMAIN
Value: <your-domain.com — for privacy-friendly analytics>
Envs:  Production, Preview, Development

Key:   NEXT_PUBLIC_ADSENSE_CLIENT
Value: ca-pub-XXXXXXXXXXXXXXXX
Envs:  Production, Preview, Development

Key:   CONTEXT7_API_KEY
Value: <your Context7 key — for editor docs lookup>
Envs:  Production, Preview

Key:   LOG_LEVEL
Value: info
Envs:  Production, Preview
```

---

## Post-Deploy Steps

1. **Set NEXT_PUBLIC_SITE_URL** to your real Vercel domain
   (e.g. `https://the-daily-post.vercel.app`) — affects sitemaps, canonical
   URLs, OG images, JSON-LD, RSS feeds.

2. **Apply the PostgreSQL baseline before the first release** from a controlled migration environment:
   ```bash
   bun run db:migrate:deploy
   ```
   The active baseline creates all models, indexes, unique constraints, and foreign keys from the current Prisma schema. It is intended for a new, empty database. The previous SQLite migration files are preserved under `prisma/legacy-sqlite-migrations/` and are not part of the production migration path. Existing SQLite data is not copied automatically; export/import it separately and plan any non-empty database adoption before running migrations.

3. **Configure Clerk dashboard**:
   - Add your Vercel domain to Allowed Origins
   - Set production keys if using dev keys
   - Configure sign-in/sign-up redirect URLs to /member

4. **Verify**:
   - Visit `https://your-domain.vercel.app/` — homepage should load
   - Visit `https://your-domain.vercel.app/member` — Clerk SignIn form should render
   - Visit `https://your-domain.vercel.app/sitemap.xml` — should list all sub-sitemaps
   - Visit `https://your-domain.vercel.app/robots.txt` — should disallow /admin
