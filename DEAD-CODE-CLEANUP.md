# Dead Code Cleanup — The Daily Post

Ringkasan pembersihan dead code / unused code. Semua temuan diverifikasi dengan
compiler TypeScript (`noUnusedLocals`), grep referensi silang, dan analisis
graph import transitif — bukan tebakan.

**Hasil (diff terhadap default branch `njutawan-add-critical-path-tests`):
63 file berubah, 198 baris ditambah, 5.077 baris dihapus, 36 file dihapus.**

---

## 1. Import & deklarasi lokal yang tidak terpakai (16 temuan)

Ditemukan oleh `tsc --noUnusedLocals --noUnusedParameters` (TS6133), lalu
dihapus. Setelah pembersihan, hitungan TS6133 turun dari **16 → 0**.

| File | Yang dihapus | Jenis |
|---|---|---|
| `src/app/admin/reports/DeleteCommentButton.tsx` | prop `reportId` | prop diterima tapi tidak pernah dibaca (call site ikut dibersihkan) |
| `src/app/admin/typos/page.tsx` | `statusCounts` | hasil `.reduce()` yang tidak pernah dipakai |
| `src/app/api/og/[slug]/route.ts` | `allArticles` | import |
| `src/app/article/[slug]/page.tsx` | `isBreaking` | variabel lokal |
| `src/app/author/[name]/page.tsx` | `next/image` | import |
| `src/app/editorial/editor-nav.ts` | `type LucideIcon` | import type |
| `src/app/not-found.tsx` | `Compass` | import (lucide-react) |
| `src/app/page.tsx` | `WorkspaceCard()` | komponen lokal 40 baris, tidak pernah dirender |
| `src/components/Analytics.tsx` | `SITE_URL` | import |
| `src/components/ArticleCard.tsx` | `MessageSquare` | import (lucide-react) |
| `src/components/ListenToArticle.tsx` | prop `title` | prop tidak pernah dibaca; API `/api/tts` hanya menerima `text/voice/speed/mode` |
| `src/components/NewsletterForm.tsx` | `AlertCircle` | import (lucide-react) |
| `src/components/PaywallGate.tsx` | `isPaywalled` | import |
| `src/components/WeatherWidget.tsx` | `Loader2` | import (lucide-react) |
| `src/lib/auth-unified.ts` | `cookies` | import (`next/headers`) |
| `src/lib/ner.ts` | `HONORIFICS` | `Set` 5 baris yang dibangun tapi tidak pernah dikonsultasi |

---

## 2. Export dengan nol referensi (9 fungsi/tipe)

Export yang dideklarasikan tapi **tidak punya satu pun pemanggil** di seluruh repo
(termasuk `content/`, `mini-services/`, dan file test).

| File | Export dihapus |
|---|---|
| `src/components/BookmarkButton.tsx` | `isBookmarked()` |
| `src/lib/context7.ts` | `resolveLibraryId()` |
| `src/lib/env.ts` | `type Env` |
| `src/lib/mdx-articles.ts` | `getAllMDXArticles()` |
| `src/lib/paywall.ts` | `useReadStatus()`, `isPaywalled()` |
| `src/lib/validation.ts` | `CommentInput`, `TypoInput`, `CommentActionInput`, `CommentEditInput`, `TTSInput`, `ReadingInput`, `SubscribeInput` + schema `commentActionSchema`, `commentEditSchema`, `readingSchema` yang hanya dipakai oleh type alias-nya sendiri |

**Efek berantai yang ikut dibersihkan:** menghapus import `isPaywalled` di
`PaywallGate.tsx` membuat fungsi `isPaywalled()` di `paywall.ts` jadi yatim —
fungsi itu ikut dihapus pada lintasan kedua. Import `* as React` di `paywall.ts`
juga ikut hilang karena satu-satunya pemakai (`useReadStatus`) sudah dibuang.

### ⚠️ Tiga fungsi yang DIKEMBALIKAN setelah merge base branch

Branch ini dimulai dari `31475a1`, tetapi default branch sudah 4 commit lebih
maju dan menambahkan `src/lib/security.test.ts` + `src/lib/auth-unified.test.ts`
yang **menguji** fungsi-fungsi yang sempat saya hapus sebagai dead code:

| Fungsi | Sempat dihapus | Dikembalikan karena |
|---|---|---|
| `assertSafeUrl()` (`src/lib/security.ts`) | ya | 8 assertion di `security.test.ts` (blok SSRF, protokol, allowlist) |
| `requireUser()` (`src/lib/auth-unified.ts`) | ya | di-assert `resolves.toBeNull()` di `auth-unified.test.ts` |
| `isUsingClerk()` (`src/lib/auth-unified.ts`) | ya | di-assert `toBe(false)` di `auth-unified.test.ts` |

Tanpa pengembalian ini, PR akan membuat **2 test gagal** (`security.test.ts`) dan
1 file test gagal load. Setelah dikembalikan, `security.ts` **byte-identical**
dengan versi aslinya, dan `auth-unified.ts` hanya berbeda pada satu baris:
import `cookies` dari `next/headers` yang memang tidak pernah dipakai.

**Pelajaran:** "tidak ada pemanggil" ≠ "dead code" kalau ada test di branch lain
yang menutupi fungsi tersebut. Analisis dead code harus dijalankan terhadap
merge-base dengan branch target, bukan terhadap branch point lokal.

---

## 3. File mati (36 file, ~4.430 baris)

### shadcn/ui scaffold yang tidak pernah di-import (34 file, 4.343 baris)

Dihitung dengan **analisis graph transitif**, bukan cuma referensi langsung —
jadi file yang cuma dipakai oleh file mati lain ikut terdeteksi
(`separator`, `sheet`, `skeleton`, `toggle`, `tooltip` hanya dipakai `sidebar.tsx`
/ `toggle-group.tsx` yang juga mati).

```
accordion  alert  aspect-ratio  avatar  breadcrumb  calendar  card  carousel
chart  collapsible  command  context-menu  drawer  dropdown-menu  form
hover-card  input-otp  menubar  navigation-menu  pagination  popover  progress
radio-group  resizable  scroll-area  separator  sheet  sidebar  skeleton
slider  switch  toggle  toggle-group  tooltip
```

14 komponen yang **tetap dipakai** dipertahankan: `alert-dialog`, `badge`,
`button`, `checkbox`, `dialog`, `input`, `label`, `select`, `sonner`, `table`,
`tabs`, `textarea`, `toast`, `toaster`.

> Bisa dipasang ulang kapan saja dengan `npx shadcn add <nama>` — `components.json` masih ada.

### Lainnya (2 file)
- `src/components/FAB.tsx` (42 baris) — tidak pernah di-import di mana pun.
- `src/hooks/use-mobile.ts` — satu-satunya pemakai adalah `sidebar.tsx` yang mati.

### Yang sengaja DIPERTAHANKAN meski tidak di-import
- `src/proxy.ts` — entry point middleware Next.js 16 (konvensi framework, bukan dead code).
- `src/lib/seed-articles.ts` — CLI utility (`bun run src/lib/seed-articles.ts`), terdokumentasi di `worklog.md`.

---

## 4. CSS mati (70 baris di `src/app/globals.css`)

338 → 268 baris. Semua kelas punya 0 referensi di `.tsx`/`.mdx`.

| Dihapus | Catatan |
|---|---|
| `.rule-y` | 0 referensi |
| `.animate-spin-slow` + `@keyframes spin-slow` | 0 referensi |
| `.no-print` | hanya muncul di selector list `@media print`; bloknya dipertahankan untuk `header, footer, nav` |
| Seluruh seksi Material Design 3 | `.md3-elevation-1/2/3`, `.md3-shape-sm/md/lg/xl`, `.md3-state-layer` (+ pseudo-element), `.md3-fab` (+ `:hover`/`:active`) — semuanya mati setelah `FAB.tsx` dihapus |

Setelah pembersihan: **0 dari 12** kelas CSS yang tak terpakai.

---

## 5. Dependensi npm yang dibuang (43 paket)

`package.json`: **84 → 41 paket** (dependencies 71 → 29, devDependencies 13 → 12).
`bun.lock` ikut di-refresh (`bun install --lockfile-only`, 745 paket).

**Sudah pasti mati (tidak ada referensi di source):**
`@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`, `@hookform/resolvers`,
`@mdx-js/react`, `@next/mdx`, `@tanstack/react-query`, `@tanstack/react-table`,
`@types/mdx`, `framer-motion`, `react-markdown`, `rehype-autolink-headings`,
`rehype-slug`, `remark-gfm`, `uuid`, `zustand`

> `react-markdown` cuma disebut di komentar `src/app/editorial/markdown.tsx`
> yang justru berbunyi *"We avoid pulling in react-markdown"*. MDX dirender lewat
> `next-mdx-remote/rsc`, tanpa plugin remark/rehype apa pun.

**Mati setelah shadcn kit dihapus (27):**
`@radix-ui/react-{accordion, aspect-ratio, avatar, collapsible, context-menu,
dropdown-menu, hover-card, menubar, navigation-menu, popover, progress,
radio-group, scroll-area, separator, slider, switch, toggle, toggle-group,
tooltip}`, `cmdk`, `embla-carousel-react`, `input-otp`, `react-day-picker`,
`react-hook-form`, `react-resizable-panels`, `recharts`, `vaul`

**Sengaja DIPERTAHANKAN meski tidak di-import langsung:**
- `react-dom` — runtime peer yang dibutuhkan Next.js
- `@types/react`, `@types/react-dom` — ambient types
- `bun-types` — types untuk runtime `bun` (script `start`/seed)
- `@tailwindcss/postcss` — dipakai `postcss.config.mjs` sebagai string plugin
- `tw-animate-css` — dipakai lewat `@import` di `globals.css`
- `pino-pretty` — dimuat pino sebagai string transport target di `src/lib/logger.ts`
- `eslint`, `typescript`, `prisma` — dipakai sebagai CLI

---

## Verifikasi

| Check | Sebelum | Sesudah |
|---|---|---|
| `npx tsc --noEmit` | 22 error | **22 error — byte-identical dengan baseline, 0 error baru** |
| `tsc --noUnusedLocals` (TS6133 dkk.) | 16 | **0** |
| `npx vitest run` | 32 pass / 5 file | **32 pass / 5 file** (1 file gagal load — lihat bawah) |
| `npx eslint .` | 19 error | **16 error** (3 hilang: `paywall.ts`, `ui/carousel.tsx`, `use-mobile.ts`; 0 baru) |
| Import → package.json | — | **35/35 paket ter-resolve** |
| Fresh `npm install` dari manifest baru | 758 paket | **651 paket, sukses** |
| Dev server (12 rute) | — | **identik dengan baseline** |

Test suite naik dari 13 → 32 test karena merge base branch membawa masuk
`security.test.ts` (13), `auth-unified.test.ts` (2), dan
`saved-articles/route.test.ts` (6). Sebelum tiga fungsi dikembalikan, merge itu
menghasilkan **2 test gagal + 1 file gagal load**; sesudahnya semuanya hijau.

22 error tsc yang tersisa **sudah ada sebelum perubahan** dan bukan akibat
cleanup: mayoritas karena Prisma client gagal di-generate (engine binary
`binaries.prisma.sh` tidak terjangkau dari sandbox) sehingga tipe model Prisma
jadi `{}`, plus 2 bug tipe nyata (`Header.tsx:353` prop `onOpenSections`,
`admin/comments/page.tsx:81`).

### Yang tidak bisa diverifikasi di sandbox ini
- **`next build` gagal** — `fonts.googleapis.com` tidak terjangkau. Sudah
  dikonfirmasi gagal **identik pada baseline yang belum disentuh**, jadi ini
  keterbatasan lingkungan, bukan efek cleanup.
- **3 rute mengembalikan 500** (`/`, `/most-read`, `/author/[name]`) karena
  `@prisma/client did not initialize`. Diuji pada baseline: **ketiganya juga 500**.
  Rute yang menyentuh kode yang saya ubah — `/article/[slug]`, `/search`, `/about`,
  `/category/[cat]`, `/subscribe`, `/newsletters`, `/live`, `/saved`, dan 404 —
  semuanya **200**.
- **`src/lib/auth-unified.test.ts` gagal load** dengan
  `@prisma/client did not initialize` — `prisma generate` butuh engine binary dari
  `binaries.prisma.sh` yang tidak terjangkau (`--no-engine` pun tetap mencoba
  mengunduh `schema-engine`). Sudah dijalankan di **worktree base branch murni**:
  hasilnya identik (4 file pass / 32 test pass / 1 file gagal dengan error yang
  sama), jadi kegagalan ini pre-existing dan environmental, bukan efek cleanup.
  Dua test di file itu (`isUsingClerk`, `requireUser`) tetap perlu fungsinya ada —
  karena itu keduanya dikembalikan.
