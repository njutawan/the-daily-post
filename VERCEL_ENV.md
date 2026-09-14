# Vercel Deployment — Environment Variables

## Setup Guide

### 1. Database (REQUIRED — do this first)

The Prisma schema currently uses **SQLite** (`file:`), which doesn't work on
Vercel's serverless environment (no persistent filesystem). You have two options:

#### Option A: Neon Postgres (recommended — free tier)
1. Go to https://neon.tech → Sign up → Create project
2. Copy the connection string
3. Change `prisma/schema.prisma` line 11: `provider = "sqlite"` → `provider = "postgresql"`
4. Run `bun run db:push` locally with the Neon DATABASE_URL
5. Set `DATABASE_URL` in Vercel

#### Option B: Turso (SQLite-compatible — minimal schema change)
1. Go to https://turso.tech → Sign up → Create database
2. Copy the `libsql://` URL + auth token
3. Install `@prisma/adapter-libsql` + change schema provider to `libsql`
4. Set `DATABASE_URL` to `libsql://...?authToken=...`

---

### 2. Vercel Dashboard → Settings → Environment Variables

Set each variable below. Mark each as **Production** (and Preview if you want
previews to work). Vercel auto-sets `NODE_ENV=production`.

---

## Environment Variables (copy-paste ready)

### REQUIRED — App won't start without these

```
Key:   DATABASE_URL
Value: <paste your Neon/Turso connection string here>
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

### RECOMMENDED — Weather widget shows real data

```
Key:   WEATHERAPI_KEY
Value: <your-weatherapi-key>
Envs:  Production, Preview

Key:   WEATHER_LOCATION
Value: Washington,DC,US
Envs:  Production, Preview
```

### OPTIONAL — Feature-gated (leave empty to skip)

```
Key:   RESEND_API_KEY
Value: <your Resend API key — for newsletter emails>
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

2. **Run database migration** (if using Neon Postgres):
   ```bash
   # Change schema.prisma provider to "postgresql"
   bun run db:push
   ```

3. **Configure Clerk dashboard**:
   - Add your Vercel domain to Allowed Origins
   - Set production keys if using dev keys
   - Configure sign-in/sign-up redirect URLs to /member

4. **Verify**:
   - Visit `https://your-domain.vercel.app/` — homepage should load
   - Visit `https://your-domain.vercel.app/member` — Clerk SignIn form should render
   - Visit `https://your-domain.vercel.app/sitemap.xml` — should list all sub-sitemaps
   - Visit `https://your-domain.vercel.app/robots.txt` — should disallow /admin
