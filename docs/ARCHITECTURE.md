# HotWheelsArena — ARCHITECTURE (binding contract)

> Written by the **core** agent. Every later agent builds strictly against this file.
> Where this file and `DECISIONS.md` disagree, `DECISIONS.md` wins; where this file refines the
> spec, this file wins. **Do not rename anything listed here.** You may _add_ exports/props.

---

## 0. TL;DR for every agent

- Imports: `@/…` → `src/…`, `@shared` / `@shared/<module>` → `shared/…`. Types: `import type { Product } from '@/types'`.
- Brand text only via `@/config/brand`. Money only via `formatINR`. Class names via `cn()`.
- Data: TanStack Query hooks in `src/hooks/*` (never call Firestore from components).
- Auth-gated actions: `useRequireAuthAction()` (or the garage/wishlist action hooks, which already do it).
- Toasts: `toast.success(title, description?)` from `@/store/toastStore` — works outside React.
- Pages: `useDocumentMeta({ title, description, noindex? })` at the top of every page; default-export the page.
- Colours: token classes only (`bg-card text-fg border-line text-accent-ink bg-accent text-on-accent` …). Never raw hex.
- Text on orange = `text-on-accent`. Orange as text = `text-accent-ink`. Yellow as text = `text-highlight-ink`.
- Every interactive element: hover / active / focus-visible (global orange ring — don't remove it) / disabled / loading.
- Respect reduced motion: `useReducedMotion()`; framer transforms are already disabled globally by `<MotionConfig reducedMotion="user">`.
- **Machine quirk:** this Windows box exports `NODE_ENV=production` globally → `npm install` skips devDependencies. Use `npm install --include=dev` (root is already installed — only functions/ needs its own install). Vite/Vitest configs already neutralise it for dev/test.
- Don't run `npm install` at the root or build into the shared `dist/` (see your task text).
- Lint rule `@typescript-eslint/consistent-type-imports` is on: use `import type { X }` or `import { type X }` (auto-fixable with `npx eslint --fix <paths>`).

---

## 1. Folder map & ownership (copy of DECISIONS §12)

```
D:\hotwheels
├─ index.html                     core  (brand tokens %BRAND_*% injected by vite.config.ts)
├─ package.json, tsconfig*.json, vite.config.ts, vitest.config.ts, tailwind.config.ts,
│  postcss.config.js, eslint.config.js, .prettierrc, .prettierignore, .editorconfig,
│  .gitignore, .env.example, .env.local                                         core
├─ shared/                        core  (pure TS; may import only zod)
├─ src/
│  ├─ main.tsx, App.tsx, router.tsx, vite-env.d.ts                              core
│  ├─ config/  styles/  types/  store/  services/  providers/                     core
│  ├─ lib/                        core (except lib/search.ts → layout)
│  ├─ hooks/                      core (except useSound.ts, useHotkey.ts, useScrollProgress.ts → layout)
│  ├─ test/setup.ts               core (Vitest jsdom setup)
│  ├─ dev/testHooks.ts            dev + emulator only: `window.__hwaTest.signIn()` for snap.mjs / e2e (dynamic import in main.tsx, never in prod builds)
│  ├─ pages/*.tsx                 core STUBS → replaced by WF2 feature agents
│  └─ components/
│     ├─ common/                  core (initial) → ui-kit (RootLayout.tsx is core glue: don't change its contract)
│     ├─ layout/AppLayout.tsx     core placeholder → layout agent replaces
│     ├─ ui/, gamification/       ui-kit
│     ├─ layout/, search/, effects/, auth/, newsletter/                          layout
│     └─ product/                 product
├─ functions/**                   functions
├─ firebase.json, .firebaserc, firestore.rules, firestore.indexes.json,
│  tests/rules/**, vitest.rules.config.ts, .github/**, README.md                infra
├─ playwright.config.ts, tsconfig.e2e.json, tests/e2e/**                        verify (WF2) — Playwright e2e, see §17
├─ scripts/**, public/**          seed-assets
└─ docs/ARCHITECTURE.md           core;  docs/components/<agent>.md  each WF1 agent
```

Component API docs (props tables, states, usage examples):
[`docs/components/ui-kit.md`](components/ui-kit.md) (ui, gamification, common/DataState) ·
[`docs/components/layout.md`](components/layout.md) (layout, search, effects, auth, newsletter, layout hooks, `lib/search.ts`) ·
[`docs/components/product.md`](components/product.md) (product cards, grids, rails, buttons).
Backend: [`functions/README.md`](../functions/README.md). Tooling: [`scripts/README.md`](../scripts/README.md).

Workflow 1: **core** → **ui-kit** → (**layout** ∥ **product**) ; **functions**, **infra**, **seed-assets** after core. **verify** last.
Workflow 2 (features): home, shop (`ShopPage`, `SearchPage`, `src/components/shop/**`, `src/config/shop.ts`, `src/hooks/useProductFilters.ts`),
product-detail, commerce (`Cart/Checkout/OrderSuccess/Orders/OrderDetail` pages, `components/{cart,checkout,orders}`, `services/payment/**`),
garage (`GaragePage`, `WishlistPage`, `components/garage/**`), content (Vault, Collections, Series, About, Contact, FAQ, Shipping, Privacy, Terms, NotFound + `components/{content,vault,collections}`).

---

## 2. Installed versions (root)

| Package                                                                                                          | Version | Notes                                                                                           |
| ---------------------------------------------------------------------------------------------------------------- | ------- | ----------------------------------------------------------------------------------------------- |
| react / react-dom                                                                                                | 18.3.1  |                                                                                                 |
| react-router-dom                                                                                                 | 6.30.6  | data router (`createBrowserRouter`), v7 future flags on                                         |
| firebase                                                                                                         | 10.14.1 | modular v10                                                                                     |
| @tanstack/react-query                                                                                            | 5.104.0 | v5 API (`isPending`, `skipToken`, `queryOptions`)                                               |
| zustand                                                                                                          | 5.0.15  | `create<T>()(…)` curried form                                                                   |
| framer-motion                                                                                                    | 11.18.2 |                                                                                                 |
| gsap                                                                                                             | —       | **removed** 2026-10-08 (user request: static home hero, no scroll-track). Don't reintroduce it. |
| howler                                                                                                           | 2.2.4   | **dynamic import only** (inside `useSound`)                                                     |
| zod                                                                                                              | 3.25.76 | `import { z } from 'zod'` (v3 API)                                                              |
| react-hook-form                                                                                                  | 7.89.0  |                                                                                                 |
| @hookform/resolvers                                                                                              | 3.10.0  | `zodResolver(Schema)` — verified with `useForm<AddressInput>`                                   |
| lucide-react                                                                                                     | 0.577.0 | brand icons (Instagram, Youtube, Twitter, Facebook) still exist                                 |
| clsx 2.1.1, tailwind-merge 2.6.1                                                                                 |         | via `cn()`                                                                                      |
| vite 5.4.21, @vitejs/plugin-react 4.7.0, typescript 5.9.3                                                        |         |                                                                                                 |
| tailwindcss 3.4.19, postcss 8.5, autoprefixer 10.6                                                               |         |                                                                                                 |
| eslint 9.39 (flat), typescript-eslint 8.71, react-hooks 5.2, react-refresh 0.4.26, jsx-a11y 6.10.2, globals 16.5 |         |                                                                                                 |
| prettier 3.9 + prettier-plugin-tailwindcss 0.6.14                                                                |         |                                                                                                 |
| vitest 3.2.7, jsdom 26.1, @testing-library/react 16.3, user-event 14.6, jest-dom 6.10                            |         |                                                                                                 |
| @firebase/rules-unit-testing 3.0.4, firebase-admin 13.10, tsx 4.23, firebase-tools 15.31                         |         |                                                                                                 |

### npm scripts (exact names)

`dev`, `build` (= `typecheck` + `vite build`), `preview`, `typecheck` (`tsc -b`), `lint` (`eslint .`), `lint:fix`, `format`, `format:check`,
`test` (`vitest run`), `test:watch`, `test:rules`, `emulators`, `seed`, `seed:emulator`, `seed:verify` (`tsx scripts/verify-seed.ts`),
`set-admin` (`tsx scripts/set-admin.ts`), `sounds`, `images` / `images:check` (`tsx scripts/generate-images.ts [--check]`),
`snap` (`node scripts/dev/snap.mjs`, Playwright screenshots), `functions:build`, `presmoke` (= `functions:build`),
`smoke` (`firebase emulators:exec --only auth,firestore,functions … "npm run seed:emulator && node scripts/smoke-e2e.mjs"`),
`pree2e` (= `functions:build`), `e2e` (`firebase emulators:exec --only auth,firestore,functions … "npm run seed:emulator && playwright test"`),
`e2e:ui` (`playwright test --ui`), `e2e:report` (`playwright show-report`), `deploy`.

Functions package: install with `npm --prefix functions ci --include=dev` or `npm install --include=dev` **inside** `functions/`.
Never `npm --prefix functions install` without a package name — npm 10 then adds the root package to `functions/` as `file:..`.

### TypeScript projects

- `tsconfig.app.json` — `src` + `shared`, strict + `noUncheckedIndexedAccess` + `noImplicitOverride` + `noImplicitReturns`, `jsx: react-jsx`, bundler resolution, paths `@/*`, `@shared`, `@shared/*`.
- `tsconfig.e2e.json` — `playwright.config.ts` + `tests/e2e/**/*.ts`; libs ES2023 + DOM (for `page.evaluate` callbacks), types `node`.
- `tsconfig.node.json` — `vite.config.ts`, `vitest.config.ts`, `vitest.rules.config.ts`, `tailwind.config.ts`, `scripts/**/*.ts`, `tests/rules/**/*.ts`; types `node`; `allowImportingTsExtensions`. **No path aliases** here: scripts/tests import shared **relatively** (e.g. `../shared/index.ts` or `../shared/gamification.js`) because `tsx` doesn't read tsconfig.node.json paths.
- Check your files: `npx tsc -p tsconfig.app.json --noEmit` (web) / `npx tsc -p tsconfig.node.json --noEmit` (scripts/tests).

### Vitest

`vitest.config.ts` defines projects **web** (`src/**/*.test.{ts,tsx}`, jsdom, setup `src/test/setup.ts` with jest-dom matchers + matchMedia/IntersectionObserver/ResizeObserver shims + RTL cleanup + storage clearing) and **shared** (`shared/**/*.test.ts`, node). Import test APIs explicitly: `import { describe, it, expect } from 'vitest'`.
Load tolerance: the web project has `testTimeout: 20_000` and `src/test/setup.ts` sets RTL `configure({ asyncUtilTimeout: 5000 })`, because ~70 jsdom files run in parallel on every core (lazy chunks, debounced URL syncs and router transitions need more than RTL's 1 s default). Don't pass shorter explicit `timeout`s to `waitFor`/`findBy*`.

### Vite

- Aliases as above. `brandPlugin` replaces `%BRAND_NAME% %BRAND_TITLE% %BRAND_DESCRIPTION% %BRAND_TAGLINE% %THEME_COLOR%` in index.html and **generates `/site.webmanifest`** (dev middleware + build asset). → seed-assets: do **not** create `public/site.webmanifest`.
- `manualChunks`: `vendor-react`, `vendor-firebase` (analytics excluded → lazy), `vendor-motion`, `vendor-query`. howler must only be imported dynamically so it stays out of the entry. Framer Motion is the only animation library (GSAP was removed on 2026-10-08).
- **No zod in the entry chunk** (≈12 KB gzip): entry modules — `src/config/env.ts`, `src/lib/errors.ts`, `src/components/{layout,common}/*`, `src/hooks/useProducts.ts`, `src/store/cartStore.ts`, `src/services/firestore/{products,garage,wishlist}.ts` and anything they import — never import `zod`, `@shared/schemas` or the `@shared` barrel. Lazy modules (checkout, forms, `useOrders`) may. `env.test.ts` / `errors.test.ts` guard the two config/lib modules; check with `vite build --sourcemap` (no `node_modules/zod/` in the `index-*.js` map).

---

## 3. Design system

### 3.1 Tailwind colour tokens (CSS variables in `src/styles/tokens.css`, `:root` = light, `.dark` = dark)

| Tailwind key          | CSS var           | Dark    | Light   | Use                                                    |
| --------------------- | ----------------- | ------- | ------- | ------------------------------------------------------ |
| `bg`                  | `--bg`            | #080808 | #F6F5F2 | page background                                        |
| `surface`             | `--surface`       | #111111 | #FFFFFF | header, footer, panels                                 |
| `card`                | `--card`          | #171717 | #FFFFFF | cards (light: pair with `border border-line`)          |
| `card-hover`          | `--card-hover`    | #1F2124 | #F0EEE9 | hovered card / metallic                                |
| `fg`                  | `--text`          | #FFFFFF | #0B0B0B | primary text                                           |
| `muted`               | `--muted`         | #8A8A8A | #5E5E5E | secondary text (AA on bg/card/card-hover)              |
| `line`                | `--border`        | #2A2D31 | #E4E2DC | borders, dividers                                      |
| `accent`              | `--accent`        | #FF5A00 | #FF5A00 | CTA fills, active states, progress, stripes, key icons |
| `accent-ink`          | `--accent-ink`    | #FF6A1A | #B83E00 | **orange used as text**                                |
| `on-accent`           | `--on-accent`     | #0B0B0B | #0B0B0B | **text on orange**                                     |
| `accent-2` / `danger` | `--accent-2`      | #E10600 | #E10600 | danger, "hot" tags (white text on it passes AA 5.0:1)  |
| `danger-ink`          | `--danger-ink`    | #FF5247 | #B80500 | **red used as text**                                   |
| `metal`               | `--metal`         | #B8BCC2 | #C9CCD1 | metal accents                                          |
| `highlight`           | `--highlight`     | #FFC400 | #E5A800 | **limited / vault / rare ONLY** (fills)                |
| `highlight-ink`       | `--highlight-ink` | #FFC400 | #8A6300 | yellow used as text                                    |
| `on-highlight`        | `--on-highlight`  | #0B0B0B | #0B0B0B | text on yellow                                         |
| `success`             | `--success`       | #22C55E | #15803D | success text/fills                                     |
| `ring`                | `--ring`          | #FF5A00 | #E04E00 | focus ring (light variant meets 3:1)                   |

All support opacity: `bg-accent/10`, `border-highlight/50`, `text-fg/80`.
Extra vars: `--metal-from/--metal-to` (gradient stops), `--shadow-card`, `--shadow-card-hover`, `--grid-line`, `--grid-opacity`, `--grid-size`, `--scanline-opacity`, `--clip-size`, `--header-height` (4.5rem; used for `scroll-padding-top`).

### 3.2 Contrast rules (AA, both themes)

- **Never** white text on `bg-accent`. Use `text-on-accent` (6.3:1).
- Orange/yellow/red as **text** → `text-accent-ink` / `text-highlight-ink` / `text-danger-ink`. Raw `text-accent` is allowed only for large (≥24px bold) decorative display text or icons.
- `text-muted` is AA on `bg`, `surface`, `card`, `card-hover`. On `.metal-surface` use `text-fg` only.
- Yellow is reserved for limited/vault/rare/achievements. Red = danger/"hot". Orange = interaction.
- Light theme cards: `bg-card border border-line shadow-card`. Dark theme cards: `bg-card` (+ `border-line` optional).

### 3.3 Other Tailwind extensions

- `font-display` (Orbitron → uppercase + 0.08em tracking via globals), `font-sans` (Inter, default body), `font-mono` (JetBrains Mono).
- Web fonts come from Google Fonts (`index.html`, `display=swap`). Each stack lists a **metric-matched local fallback** right after the web font (`src/styles/fonts.css`): `Orbitron Fallback` (Arial 400 / Arial Black 700+900), `Inter Fallback` (Arial / Arial Bold), `JetBrains Mono Fallback` (Consolas), each with `size-adjust` + `ascent-override` / `descent-override` measured in Chromium over the app's own strings. Until the web font arrives, text takes the same width and wraps the same way, so the swap causes no layout shift (before: the hero copy re-wrapped and pushed the CTAs down 28 px, CLS up to 0.07). A missing local font just falls through to the rest of the stack. Re-measure the values if the families or Google font versions change.
- `tracking-display` (0.08em), `tracking-hud` (0.16em). `max-w-content` (1280px).
- z-index scale: `z-header`(40) `z-overlay`(45) `z-drawer`(50) `z-modal`(60) `z-palette`(65) `z-toast`(70) `z-scanlines`(90).
- Shadows: `shadow-glow-accent`, `shadow-glow-highlight`, `shadow-card`, `shadow-card-hover`.
- Background images: `bg-metal-gradient`, `bg-accent-gradient`, `bg-highlight-gradient`.
- Easing: `ease-race`, `ease-accelerate`, `ease-out-expo`.
- Animations: `animate-fade-in`, `animate-fade-in-delayed`, `animate-shimmer`, `animate-engine-shake` (one-shot 0.45s), `animate-engine-idle` (loop), `animate-stripe-slide`, `animate-speed-line`, `animate-glow-pulse` (`float` and `headlight-flicker` were removed with the hero's car scene on 2026-10-08).
- Built-ins worth using: `text-balance`, `text-pretty`, `tabular-nums`, `snap-x snap-mandatory`.

### 3.4 Global CSS (`src/styles/globals.css`)

`globals.css` imports `fonts.css` (fallback `@font-face` rules, §3.3) and `tokens.css`, then Tailwind's layers.

- Base: `h1–h3` automatically use Orbitron bold uppercase `tracking-display` (opt out with `font-sans normal-case tracking-normal`). Body is Inter on `bg-bg text-fg`. `:focus-visible` = 2px `--ring` outline + 2px offset (don't override with `outline-none` unless you draw an equivalent ring). `::selection` orange with on-accent text. Thin themed scrollbars. Number-input spinners hidden.
- Component classes:

| Class                                         | What                                                                                                                                                       | Example                                                                                                      |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `.hud`                                        | mono xs uppercase 0.16em tabular                                                                                                                           | `<p className="hud text-muted">RPM 8,200</p>`                                                                |
| `.eyebrow`                                    | mono xs uppercase `text-accent-ink` 0.2em                                                                                                                  | `<p className="eyebrow">JUST OFF THE TRACK</p>`                                                              |
| `.metal-surface`                              | brushed-metal gradient (+ sheen)                                                                                                                           | spec tables, badges; put `text-fg` on it                                                                     |
| `.glass`                                      | translucent bg + blur                                                                                                                                      | sticky header, overlays                                                                                      |
| `.racing-stripe`                              | decorative double stripe (top edge) that scales in on `.group:hover` / `.group:focus-within`; `.racing-stripe-bottom`, `.racing-stripe-left`, `.is-active` | `<article className="group relative overflow-hidden"><span aria-hidden="true" className="racing-stripe" />…` |
| `.engine-shake`                               | one-shot 1–2px vibration (toggle class to replay)                                                                                                          | add on click; or `group-hover:animate-engine-shake`                                                          |
| `.shimmer`                                    | racing skeleton shimmer                                                                                                                                    | `<div className="shimmer h-40 rounded-lg" aria-hidden="true" />`                                             |
| `.bg-grid` (+ `.bg-grid-fade`)                | garage floor grid (+ radial fade mask)                                                                                                                     | `<div aria-hidden className="bg-grid bg-grid-fade absolute inset-0 -z-10" />`                                |
| `.bg-checker`                                 | checkered-flag pattern                                                                                                                                     | success page                                                                                                 |
| `.scanlines`                                  | CRT scanline pattern                                                                                                                                       | ScanlinesOverlay element                                                                                     |
| `.clip-angled` / `.clip-angled-sm`            | chamfered corners (12px / 6px) — **never on a focusable element** (clips the focus ring); use on a decorative layer                                        |                                                                                                              |
| `.skip-link`                                  | hidden until focused                                                                                                                                       | `<a href="#main-content" className="skip-link">Skip to content</a>`                                          |
| `.scrollbar-none`, `.tabular`, `.safe-bottom` | utilities                                                                                                                                                  |                                                                                                              |

- `@media (prefers-reduced-motion: reduce)`: all CSS animations/transitions neutralised; shake/speed-line/glow disabled; shimmer becomes static.

### 3.5 Layout conventions

Container: `mx-auto max-w-content px-4 sm:px-6 lg:px-8` (ui-kit `<Container>`). Section spacing `py-16 lg:py-24`. Desktop-first 12-col (`grid grid-cols-12 gap-6`), must work at 375px and reflow without sideways scrolling at 320px (WCAG 1.4.10; the Navbar wordmark text is `sr-only` below 360px). The main landmark is `<main id="main-content" tabIndex={-1}>` (in AppLayout); it is at least `calc(100svh - var(--header-height))` tall, so the footer always starts below the fold and never jumps when a lazy page, auth gate or skeleton is replaced (CLS). In the header, `UserMenu`'s auth-loading skeleton covers an invisible, disabled copy of the signed-out "Sign in" button, so the right cluster keeps its width and the centred nav does not jump when auth resolves for a signed-out visitor.

---

## 4. Config (`src/config/*`)

### `brand.ts` (the ONLY place for brand strings; no env/DOM imports — vite.config.ts imports it)

```ts
BRAND_NAME = 'HotWheelsArena'; BRAND_LOGO_TEXT = 'HOTWHEELSARENA'; BRAND_SHORT_NAME = 'HWA'
BRAND_TAGLINE = 'PUSH THE LIMITS'; BRAND_HERO_TITLE = 'HOT WHEELS'; BRAND_PRODUCT_LINE = 'Hot Wheels'
BRAND_DESCRIPTION: string; CURRENCY = 'INR'; LOCALE = 'en-IN'; COUNTRY = 'India'
SUPPORT_EMAIL; SUPPORT_PHONE (display) ; SUPPORT_PHONE_E164 (tel: links); SUPPORT_HOURS
type SocialPlatform = 'instagram' | 'youtube' | 'x' | 'facebook'
interface SocialLink { platform: SocialPlatform; label: string; href: string; handle: string }
SOCIAL_LINKS: readonly SocialLink[]
COPYRIGHT_OWNER: string; FOOTER_DISCLAIMER: string; DEFAULT_TITLE: string
THEME_COLORS = { dark: '#080808', light: '#F6F5F2' } as const
```

Copy like "Indian Hot Wheels collectors" must interpolate `BRAND_PRODUCT_LINE`.

### `env.ts`

```ts
interface FirebaseWebConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}
interface AppEnv {
  firebase: FirebaseWebConfig;
  useEmulators: boolean;
  emulatorHost: string;
  functionsRegion: string;
  cloudinaryCloudName: string | null;
  paymentProvider: PaymentProviderId;
  dummyPaymentSuccessRate: number; // VITE_DUMMY_PAYMENT_SUCCESS_RATE (0–1, default 0.9; e2e uses 1)
  enableAnalytics: boolean;
  siteUrl: string;
  isDev: boolean;
  isProd: boolean;
  mode: string;
}
// Validated by small hand-written readers (no zod: env.ts is in the entry chunk). Invalid or
// missing values silently fall back to safe emulator defaults: strings trimmed ('' = unset),
// flags true/false/1/0/yes/no (any case), Cloudinary name /^[a-z0-9_-]+$/i,
// provider ∈ PAYMENT_PROVIDER_IDS, success rate finite in [0, 1], site URL accepted by new URL().
const env: AppEnv;
const USE_EMULATORS: boolean; // explicit VITE_USE_EMULATORS wins, else true for demo-* project ids
```

### `firebase.ts`

```ts
const firebaseApp: FirebaseApp;
const auth: Auth;
const db: Firestore; /* memoryLocalCache */
const functions: Functions; /* asia-south1 */
function initAnalytics(): Promise<void>; // lazy firebase/analytics; no-op unless enabled + not emulators + measurementId
```

Emulators (auth 9099, firestore 8080, functions 5001 on `env.emulatorHost`) connect once (HMR-guarded).

### `routes.ts`

```ts
ROUTES = { home:'/', shop:'/shop', search:'/search', collections:'/collections', series:'/collections/:slug', product:'/product/:slug',
  vault:'/vault', cart:'/cart', checkout:'/checkout', orderSuccess:'/checkout/success/:orderId', orders:'/orders', orderDetail:'/orders/:orderId',
  garage:'/garage', wishlist:'/wishlist', about:'/about', contact:'/contact', faq:'/faq', shippingReturns:'/shipping-returns',
  privacy:'/privacy', terms:'/terms', newDrops:'/new-drops' } as const
type GarageTab = 'collection' | 'wishlist' | 'favorites' | 'achievements' | 'stats'; GARAGE_TABS: readonly GarageTab[]
productPath(slug: string): string            // '/product/<slug>'
seriesPath(slug: string): string             // '/collections/<slug>'
orderPath(orderId: string): string; orderSuccessPath(orderId: string): string
garagePath(tab?: GarageTab): string          // '/garage' | '/garage?tab=wishlist'
searchPath(query?: string): string           // '/search?q=…'
interface ShopPathParams { view?: string; category?: CategorySlug; series?: string; sort?: string; q?: string }
shopPath(params?: ShopPathParams): string    // '/shop?view=new'
```

### `nav.ts`

```ts
interface NavLinkItem { id: 'garage'|'collections'|'new-drops'|'vault'|'my-garage'; label: string /* Title Case — render with `uppercase` */;
  to: string; icon: LucideIcon; description: string; requiresAuth?: boolean }
NAV_LINKS: readonly NavLinkItem[]   // Garage→/shop, Collections, New Drops→/shop?view=new, Vault, My Garage→/garage
isNavLinkActive(link: NavLinkItem, location: { pathname: string; search: string }): boolean   // use for aria-current="page"
interface FooterLink { label: string; to: string }; interface FooterLinkGroup { title: string; links: readonly FooterLink[] }
FOOTER_LINK_GROUPS: readonly FooterLinkGroup[]   // Shop, Collector, Support, Company
```

### `site.ts`

```ts
SITE_URL: string; absoluteUrl(path: string): string; OG_IMAGE_PATH = '/og-image.png'
interface DefaultMeta { title: string; description: string; image: string; type: 'website' }; DEFAULT_META: Readonly<DefaultMeta>
FALLBACK_CAR_IMAGE = '/placeholders/car-generic.svg'; HERO_CAR_IMAGE = '/placeholders/hero-car.svg'
interface CategoryDisplay { slug: CategorySlug; label: string /* 'OFF ROAD' */; name: string /* 'Off Road' */; tagline: string;
  iconName: string /* lucide name */; icon: LucideIcon; silhouette: string /* '/placeholders/category-<slug>.svg' */; order: number }
CATEGORY_DISPLAY: Readonly<Record<CategorySlug, CategoryDisplay>>; CATEGORY_ORDER: readonly CategorySlug[]
isCategorySlug(value: string | null | undefined): value is CategorySlug
getCategoryDisplay(slug: string | null | undefined): CategoryDisplay | undefined
```

Icons: sports `Gauge`, off-road `Mountain`, racing `Flag`, special `Sparkles`, rescue `Siren`, limited `Gem`.

### `gamification.ts` (UI) — re-exports everything from `@shared/gamification`, plus

```ts
type BadgeTone = 'danger' | 'accent' | 'highlight' | 'metal';
interface BadgeUi {
  icon: LucideIcon;
  tone: BadgeTone;
}
BADGE_UI: Record<BadgeId, BadgeUi>; // first-ride Flame/danger, speed-demon Flag/accent, treasure-hunter Gem/highlight,
// garage-builder Warehouse/metal, master-collector Crown/highlight
interface ToneClasses {
  text: string;
  bg: string;
  border: string;
  glow: string;
  fill: string;
}
BADGE_TONE_CLASSES: Record<BadgeTone, ToneClasses>; // literal Tailwind class strings
```

### `payment.ts`

```ts
ACTIVE_PAYMENT_PROVIDER: PaymentProviderId            // VITE_PAYMENT_PROVIDER, default 'dummy'
getPaymentProvider(): PaymentProvider                 // singleton; unknown id → DummyPaymentProvider + warn
isTestPaymentMode(): boolean                          // show TEST MODE banner when true
interface PaymentMethodOption { id: PaymentMethod; label: string; description: string; icon: LucideIcon }
PAYMENT_METHOD_OPTIONS: readonly PaymentMethodOption[] // card, upi, cod (filter cod when !settings.codEnabled)
```

### `sound.ts`

```ts
SOUND_SOURCES: Record<SoundName, string>; // { rev: '/sounds/rev.wav', click: '/sounds/click.wav', start: '/sounds/start.wav' }
SOUND_VOLUME: Record<SoundName, number>;
```

---

## 5. Shared package (`shared/`, import via `@shared/<module>`; functions import relatively)

Rules: may import only `zod`; relative imports inside `shared/` use explicit **`.js`** extensions (works under bundler, NodeNext and CommonJS). Timestamps in client models = epoch millis `number | null` (`Millis`).

### `shared/types.ts`

Const arrays + unions: `RARITIES`/`Rarity` ('common'|'rare'|'super-rare'|'limited'), `CATEGORY_SLUGS`/`CategorySlug` ('sports'|'off-road'|'racing'|'special'|'rescue'|'limited'),
`ORDER_STATUSES`/`OrderStatus` ('placed'|'processing'|'shipped'|'delivered'|'cancelled'), `PAYMENT_METHODS`/`PaymentMethod` ('card'|'upi'|'cod'),
`PAYMENT_PROVIDER_IDS`/`PaymentProviderId` ('dummy'|'razorpay' — razorpay reserved), `PAYMENT_STATUSES`/`PaymentStatus` ('success'|'failed'),
`PAYMENT_MODES`/`PaymentMode` ('test'|'live'), `GARAGE_SOURCES`/`GarageSource` ('purchase'|'manual'),
`BADGE_IDS`/`BadgeId` ('first-ride'|'speed-demon'|'treasure-hunter'|'garage-builder'|'master-collector'), `Currency = 'INR'`, `UserRole = 'customer'`, `Millis = number | null`.

```ts
type Rarity = (typeof RARITIES)[number];
type CategorySlug = (typeof CATEGORY_SLUGS)[number];
type OrderStatus = (typeof ORDER_STATUSES)[number];
type PaymentMethod = (typeof PAYMENT_METHODS)[number];
type PaymentProviderId = (typeof PAYMENT_PROVIDER_IDS)[number];
type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
type PaymentMode = (typeof PAYMENT_MODES)[number];
type GarageSource = (typeof GARAGE_SOURCES)[number];
type BadgeId = (typeof BADGE_IDS)[number];
type Currency = 'INR';
type UserRole = 'customer';
type Millis = number | null;
interface ProductImage {
  publicId: string;
  url: string;
  alt: string;
}
interface ThemedStats {
  topSpeedKmh: number;
  powerHp: number;
}
interface LimitedEdition {
  editionNumber: number;
  editionSize: number;
}
interface Product {
  id: string;
  slug: string;
  name: string;
  description: string;
  make: string;
  model: string;
  series: string;
  seriesName: string;
  seriesNumber: number;
  collectionNumber: number;
  year: number;
  scale: string;
  color: string;
  material: string;
  vehicleType: string;
  category: CategorySlug;
  rarity: Rarity;
  rarityScore: number;
  collectorScore: number;
  themedStats: ThemedStats;
  price: number;
  compareAtPrice: number | null;
  currency: Currency;
  stock: number;
  limitedEdition: LimitedEdition | null;
  images: ProductImage[];
  primaryImage: string;
  ratingAvg: number;
  ratingCount: number;
  tags: string[];
  isNew: boolean;
  isFeatured: boolean;
  isVault: boolean;
  isActive: boolean;
  createdAt: Millis;
  updatedAt: Millis;
}
interface Category {
  id: string;
  name: string;
  slug: CategorySlug;
  icon: string;
  order: number;
  description: string;
  isActive: boolean;
  createdAt: Millis;
  updatedAt: Millis;
}
interface Series {
  id: string;
  name: string;
  slug: string;
  year: number;
  totalCars: number;
  carIds: string[];
  description: string;
  isActive: boolean;
  createdAt: Millis;
  updatedAt: Millis;
}
interface Review {
  id: string;
  productId: string;
  uid: string;
  displayName: string;
  photoURL: string | null;
  rating: number;
  text: string;
  verifiedBuyer: boolean;
  createdAt: Millis;
  updatedAt: Millis;
}
interface UserStats {
  carsOwned: number;
  uniqueCars: number;
  seriesCompleted: number;
  ordersPlaced: number;
  racingCars: number;
  rareCars: number;
  totalSpent: number;
}
interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string | null;
  xp: number;
  level: number;
  badges: BadgeId[];
  stats: UserStats;
  role: UserRole;
  createdAt: Millis;
  updatedAt: Millis;
}
interface GarageEntry {
  productId: string;
  addedAt: Millis;
  source: GarageSource;
  isFavorite: boolean;
  quantity: number;
}
interface WishlistEntry {
  productId: string;
  addedAt: Millis;
}
interface Address {
  name: string;
  phone: string;
  pincode: string;
  line1: string;
  line2?: string;
  landmark?: string;
  city: string;
  state: string;
}
interface SavedAddress extends Address {
  id: string;
  isDefault: boolean;
  createdAt: Millis;
  updatedAt: Millis;
}
interface OrderItem {
  productId: string;
  slug: string;
  name: string;
  price: number;
  qty: number;
  image: string;
}
interface OrderPayment {
  provider: PaymentProviderId;
  status: PaymentStatus;
  transactionId: string;
  mode: PaymentMode;
}
interface Order {
  id: string;
  uid: string;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  currency: Currency;
  address: Address;
  status: OrderStatus;
  payment: OrderPayment;
  paymentMethod: PaymentMethod;
  xpEarned: number;
  badgesUnlocked: BadgeId[];
  createdAt: Millis;
  updatedAt: Millis;
}
interface PaymentResult {
  provider: PaymentProviderId;
  status: PaymentStatus;
  transactionId: string;
  mode: PaymentMode;
  method: PaymentMethod;
  amount: number;
  message?: string;
}
interface SiteSettings {
  shippingThreshold: number;
  shippingFee: number;
  taxRate: number;
  taxInclusive: boolean;
  showGstLine: boolean;
  codEnabled: boolean;
  maxQtyPerItem: number;
  createdAt: Millis;
  updatedAt: Millis;
}
type BadgeMetric = Exclude<keyof UserStats, 'totalSpent'>;
interface BadgeDefinition {
  id: BadgeId;
  emoji: string;
  title: string;
  description: string;
  requirement: string;
  xpReward: number;
  metric: BadgeMetric;
  target: number;
}
interface BadgeProgress {
  id: BadgeId;
  current: number;
  target: number;
  pct: number;
  unlocked: boolean;
}
interface XpProgress {
  level: number;
  xp: number;
  levelStart: number;
  levelEnd: number | null;
  current: number;
  next: number;
  toNext: number;
  pct: number;
  isMax: boolean;
}
interface PlaceOrderItemInput {
  productId: string;
  qty: number;
}
interface PlaceOrderRequest {
  items: PlaceOrderItemInput[];
  address: Address;
  payment: PaymentResult;
}
interface PlaceOrderResponse {
  orderId: string;
  xpEarned: number;
  badgesUnlocked: BadgeId[];
  level: number;
  leveledUp: boolean;
  total: number;
}
interface SubmitReviewRequest {
  productId: string;
  rating: number;
  text: string;
}
interface SubmitReviewResponse {
  reviewId: string;
}
interface NewsletterRequest {
  email: string;
}
interface NewsletterResponse {
  status: 'subscribed' | 'already-subscribed';
}
interface EnsureProfileResponse {
  created: boolean;
}
```

Field semantics (full JSDoc in `shared/types.ts`):

- `Product.series` = series **document id (== series slug)**; `seriesName` = its display name; `seriesNumber` → `SERIES 03`; `collectionNumber` → `#142`.
- `Product.primaryImage` = URL of the primary image (`=== images[0].url` in seed data); `ProductImage.url` is always a valid local fallback (`/placeholders/*.svg`), `publicId` is used only when Cloudinary is enabled.
- `Product.price` = whole rupees, GST inclusive; `stock` is a static counter (never decremented by the UI); `limitedEdition` → `#001/500`; `description` is `''` when absent.
- `Category.id` / `Series.id` === slug; `Series.carIds` = product ids. `Review.id` === reviewer uid.
- `GarageEntry.quantity` ≥ 1 (duplicates tracker); `source: 'purchase'` entries come only from `placeOrder`.
- `UserStats`: `carsOwned` Σ quantities, `uniqueCars` distinct entries, `racingCars` / `rareCars` distinct products, `totalSpent` ₹ lifetime.
- `PaymentResult.amount` must equal the server-computed order total; `PlaceOrderResponse.total` echoes it.
- `XpProgress`: `current` = XP inside the level, `next` = level span, `toNext` = remaining, `pct` 0–100; `BadgeProgress.pct` 0–100.

### `shared/constants.ts`

```ts
FUNCTIONS_REGION = 'asia-south1'; DEMO_PROJECT_ID = 'demo-hotwheelsarena'
EMULATOR_PORTS = { auth: 9099, firestore: 8080, functions: 5001, hosting: 5000, ui: 4000 }
CALLABLES = { ensureUserProfile, placeOrder, submitReview, subscribeNewsletter } (values = same strings); type CallableName
COLLECTIONS = { products, categories, series, users, orders, newsletter, settings }
SUBCOLLECTIONS = { reviews /* products/{id}/reviews */, addresses, garage, wishlist /* users/{uid}/… */ }
SETTINGS_SITE_DOC_ID = 'site'
DUMMY_TRANSACTION_ID_REGEX = /^test_[0-9a-f]{20}$/
```

### `shared/india.ts`

```ts
INDIAN_STATES: readonly [...36 states + UTs]; type IndianState
INDIAN_PHONE_REGEX; INDIAN_PINCODE_REGEX
isIndianState(value: string): value is IndianState; isValidIndianPhone(v): boolean; isValidPincode(v): boolean
normalizeIndianPhone(value: string): string   // strips spaces/dashes/+91/leading 0 → validate afterwards
```

### `shared/commerce.ts`

```ts
MAX_QTY_PER_ITEM = 10; MAX_ORDER_LINES = 20; DEFAULT_SITE_SETTINGS: Readonly<SiteSettings>  // 999 / 79 / 0.18 / inclusive / GST line / COD / 10
interface OrderLine { price: number; qty: number }
type TotalsSettings = Pick<SiteSettings, 'shippingThreshold' | 'shippingFee' | 'taxRate' | 'taxInclusive'>
interface OrderTotals { itemCount: number; subtotal: number; shipping: number; tax: number; total: number; freeShippingRemaining: number; freeShippingPct: number /*0-100*/; qualifiesForFreeShipping: boolean }
roundCurrency(value: number): number
computeOrderTotals(lines: readonly OrderLine[], settings?: TotalsSettings): OrderTotals
clampQty(qty: number, stock: number, max?: number): number   // 1..min(stock, max)
```

Rules: free shipping when subtotal ≥ threshold (or empty cart); inclusive GST → `tax = subtotal − subtotal/(1+rate)` (informational), `total = subtotal + shipping`. **Client and server must both use this function** so the dummy payment amount equals the server total.

### `shared/gamification.ts`

```ts
LEVEL_THRESHOLDS: readonly number[] /* 25 levels, 20(n−1)²+60(n−1) → 1,240 XP = LEVEL 07 */; MAX_LEVEL = 25
LEVEL_TITLES: ReadonlyArray<{ minLevel: number; title: string }>   // ROOKIE, STREET RACER(5), PRO DRIVER(10), TRACK LEGEND(15), HALL OF FAME(20), ARENA CHAMPION(25)
ORDER_BASE_XP = 100; XP_PER_CAR = 25; RARITY_XP_BONUS = { common: 0, rare: 25, 'super-rare': 50, limited: 100 }
MAX_GARAGE_QUANTITY = 99; RARE_RARITIES = ['rare','super-rare','limited']; RACING_CATEGORY = 'racing'
BADGES: readonly BadgeDefinition[]   // first-ride (ordersPlaced≥1, 100xp), speed-demon (racingCars≥10, 250), treasure-hunter (rareCars≥1, 150),
                                     // garage-builder (carsOwned≥25, 300), master-collector (seriesCompleted≥1, 500)
BADGE_MAP: Record<BadgeId, BadgeDefinition>; getBadge(id): BadgeDefinition; EMPTY_USER_STATS: UserStats
levelForXp(xp: number): number; xpForLevel(level: number): number; xpProgress(xp: number): XpProgress; levelTitle(level: number): string
normalizeStats(stats: Partial<UserStats> | null | undefined): UserStats
evaluateBadges(stats: Partial<UserStats>): BadgeId[]                         // all satisfied, BADGES order
newlyUnlockedBadges(existing: readonly BadgeId[], stats: Partial<UserStats>): BadgeId[]
badgeProgress(stats: Partial<UserStats>): BadgeProgress[]
badgeXpTotal(ids: readonly BadgeId[]): number
computeOrderXp(items: ReadonlyArray<{ qty: number; rarity: Rarity }>): number  // base + qty×(perCar + rarityBonus); 0 for empty
isRareRarity(rarity: string): boolean
interface GarageStatsEntry { productId: string; quantity: number; category: string; rarity: string }; interface GarageStatsSeries { id: string; carIds: readonly string[] }
type GarageDerivedStats = Pick<UserStats, 'carsOwned'|'uniqueCars'|'racingCars'|'rareCars'|'seriesCompleted'>
interface SeriesCompletion { owned: number; total: number; missing: string[]; pct: number; complete: boolean }
seriesCompletion(series: GarageStatsSeries, ownedIds: ReadonlySet<string>): SeriesCompletion
computeGarageStats(entries: readonly GarageStatsEntry[], seriesList: readonly GarageStatsSeries[]): GarageDerivedStats
```

Definitions: `carsOwned` = Σ quantity; `uniqueCars` = distinct entries; `racingCars`/`rareCars` = distinct products; `seriesCompleted` = series whose non-empty `carIds` are all owned.

### `shared/text.ts` (zod-free; exported from `shared/index.ts`)

```ts
isUnsafeCodePoint(code: number): boolean /* C0/C1 except TAB/LF, U+200B, U+200E–200F, U+202A–202E, U+2066–2069, U+FEFF; ZWNJ/ZWJ U+200C–200D are allowed (Indic spellings, emoji ZWJ sequences) */
stripUnsafeText(text: string): string; hasUnsafeText(text: string): boolean
```

Used by `AddressSchema` and by `submitReview` (reviewer names).

### `shared/schemas.ts` (zod; inferred types equal the interfaces above — asserted in tests)

```ts
DocIdSchema /* trim, 1..128 chars of [A-Za-z0-9_-], not a reserved id starting and ending with "__" (incl. "__", "___") */
HIDDEN_CHARACTERS_MESSAGE = 'Remove hidden or control characters'
AddressSchema /* text fields refine !hasUnsafeText → HIDDEN_CHARACTERS_MESSAGE */
PaymentResultSchema; PlaceOrderItemSchema; PlaceOrderRequestSchema /* 1..20 unique lines, qty 1..10 */
REVIEW_TEXT_MIN = 10; REVIEW_TEXT_MAX = 1000; SubmitReviewSchema /* rating int 1..5, text trim 10..1000 */
ReviewFormSchema /* SubmitReviewSchema without productId */; NewsletterSchema /* trim, lowercase, email, ≤254 */
type AddressInput; PaymentResultInput; PlaceOrderRequestInput; SubmitReviewInput; ReviewFormValues; NewsletterInput
```

Forms: `useForm<AddressInput>({ resolver: zodResolver(AddressSchema) })` (resolver import: `@hookform/resolvers/zod`). `line2`/`landmark` accept `''`.

`shared/index.ts` re-exports all modules (`import { … } from '@shared'`).

---

## 6. Types (`src/types/index.ts`)

Re-exports every shared type above (+ `IndianState`, `OrderLine`, `OrderTotals`, `TotalsSettings`, `GarageDerivedStats`, `SeriesCompletion`, `AddressInput`, `NewsletterInput`, `ReviewFormValues`). Client-only:

```ts
interface CartItem {
  productId: string;
  slug: string;
  name: string;
  price: number;
  image: string;
  qty: number;
  stock: number;
  seriesName?: string;
  collectionNumber?: number;
}
type Theme = 'dark' | 'light';
type ScanlineMode = 'auto' | 'on' | 'off';
type ToastVariant = 'default' | 'success' | 'error' | 'achievement';
interface ToastAction {
  label: string;
  onClick: () => void;
}
interface ToastInput {
  title: string;
  description?: string;
  variant?: ToastVariant;
  icon?: ReactNode;
  duration?: number;
  action?: ToastAction; // button inside the toast (runs onClick, then dismisses)
}
interface Toast extends Required<Pick<ToastInput, 'title' | 'variant' | 'duration'>> {
  id: string;
  description?: string;
  icon?: ReactNode;
  createdAt: number;
}
type SoundName = 'rev' | 'click' | 'start';
type AuthStatus = 'loading' | 'signed-in' | 'signed-out';
interface SignInPromptState {
  open: boolean;
  reason?: string;
}
type StockStatus = 'in-stock' | 'low' | 'sold-out';
interface StockInfo {
  status: StockStatus;
  label: string;
}
interface LimitedEditionInfo {
  label: string;
  editionNumber: number;
  editionSize: number;
  remaining: number;
  claimedPct: number;
}
interface GarageCar {
  entry: GarageEntry;
  product: Product;
}
```

---

## 7. Lib (`src/lib/*`)

### `cn.ts`

`cn(...inputs: ClassValue[]): string` — clsx + tailwind-merge aware of all custom tokens.

### `queryKeys.ts`

```ts
queryKeys.products() ['products'] · productList() ['products','list'] · product(slug) · productsByIds(ids)
queryKeys.categories() · seriesAll() · seriesList() · series(slug) · reviews(productId) · siteSettings()
queryKeys.userAll() ['user'] · user(uid) ['user',uid] · profile(uid) · garage(uid) · wishlist(uid) · orders(uid) · order(uid, orderId) · addresses(uid)
mutationKeys = { garage, wishlist, placeOrder, submitReview, newsletter, saveAddress, deleteAddress }
ANONYMOUS_UID = '__anonymous__'   // placeholder in disabled user-scoped keys
STALE_TIMES = { products: 5min, catalog: 10min, reviews: 60s, user: 60s }
```

### `cloudinary.ts`

```ts
type CloudinaryCrop = 'fill'|'fit'|'limit'|'pad'|'scale'|'thumb'|'crop'; type CloudinaryFormat = 'auto'|'webp'|'avif'|'png'|'jpg'
interface CloudinaryOptions { w?: number; h?: number; crop?: CloudinaryCrop; q?: 'auto'|'auto:best'|'auto:eco'|'auto:low'|number; f?: CloudinaryFormat; dpr?: number|'auto'; gravity?: CloudinaryGravity }
isCloudinaryEnabled(): boolean
cl(publicId: string, options?: CloudinaryOptions): string          // '' when disabled / empty id
productImageUrl(image: ProductImage | string | null | undefined, options?: CloudinaryOptions): string   // Cloudinary → url → FALLBACK_CAR_IMAGE
productImageSrcSet(image: ProductImage | null | undefined, widths: readonly number[], options?: Omit<CloudinaryOptions,'w'|'h'> & { aspect?: number }): string | undefined
```

### `format.ts`

```ts
formatINR(n): string /* ₹1,25,000 */; formatINRPrecise(n) /* ₹212.54 */; formatNumber(n) /* 12,34,567 */; formatCompact(n) /* 1.2K, 1.5L */
formatDate(millis: number | null | undefined, withTime?: boolean): string /* '—' for null */
formatRelative(millis, now?: number): string /* 'just now', '3 days ago', 'yesterday' */
padNumber(value, width = 2); formatCollectionNumber(n) /* #142, #007 */; formatEdition(no, size) /* #001/500 */
formatSeriesLabel(n) /* SERIES 03 */; formatLevel(n) /* LEVEL 07 */; formatXp(xp) /* 1,240 XP */; formatPercent(v, digits = 0)
firstName(displayName: string | null | undefined, fallback = 'Collector'): string
pluralize(count, singular, plural?): string /* '3 cars' */
```

### `animations.ts` (framer-motion)

```ts
type CubicBezier; EASE_OUT_EXPO; EASE_RACE; EASE_ACCELERATE; EASE_LAUNCH; EASE_IN_OUT
DURATION = { instant: .12, fast: .2, base: .35, slow: .6, slower: .9 }; SPRING_SNAPPY; SPRING_SOFT; TILT_MAX_DEG = 8
fadeUp, fadeIn, scaleIn, accelerateIn (custom={index}), drawerRight, drawerLeft, overlayFade: Variants   // keys hidden/visible/exit
staggerContainer(stagger = 0.08, delayChildren = 0): Variants
engineShake: Variants  // idle → rev
stripeSlide: Variants  // rest → hover
inViewOnce = { once: true, amount: 0.2 }   // whileInView viewport
reduceVariants(variants): Variants; motionSafe(variants, reduce: boolean | null | undefined): Variants
```

Usage: `<motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={inViewOnce} />`.

### `seo.ts`

```ts
interface DocumentMeta { title?: string; description?: string; image?: string; canonical?: string; noindex?: boolean; type?: 'website'|'product'|'article' }
type JsonLd = Record<string, unknown>
buildPageTitle(title?: string): string        // 'Shop | HotWheelsArena'
truncateDescription(text, limit = 160): string
applyDocumentMeta(meta: DocumentMeta): void
useDocumentMeta(meta: DocumentMeta): void     // sets title/description/robots/og/twitter/canonical; restores defaults on unmount
useJsonLd(id: string, data: JsonLd | JsonLd[] | null): void   // <script type="application/ld+json" id="jsonld-{id}">
buildProductJsonLd(product: Product): JsonLd; buildBreadcrumbJsonLd(items: { name; path }[]): JsonLd; buildOrganizationJsonLd(): JsonLd
```

### `errors.ts`

```ts
getErrorCode(error: unknown): string | null                // 'permission-denied', 'auth/popup-blocked', …
getFriendlyErrorMessage(error: unknown, fallback?: string): string   // racing-themed; passes the server message through ONLY for
                                                           // callable HttpsErrors (raw code `functions/<code>`) with invalid-argument /
                                                           // failed-precondition / out-of-range / already-exists / resource-exhausted.
                                                           // Firestore/SDK errors with those codes get the friendly copy or the fallback.
                                                           // ZodErrors (recognised structurally — errors.ts never imports zod) → issues[0].message
isPermissionError(e): boolean; isNotFoundError(e): boolean; isChunkLoadError(e): boolean
shouldRetryQuery(failureCount: number, error: unknown): boolean
class NotSignedInError extends Error { code: 'unauthenticated' }
```

Server (functions): throw `HttpsError('failed-precondition', 'Prices changed — review your pit stop.')` etc. with **user-facing** messages; the client shows them verbatim (the Functions SDK reports them as `functions/<code>`, which is what unlocks the pass-through).

### `product.ts`

```ts
LOW_STOCK_THRESHOLD = 10; isSoldOut(stock); isLowStock(stock); stockStatus(stock): StockInfo   // IN STOCK / ONLY 3 LEFT / SOLD OUT
RARITY_ORDER: Record<Rarity, number>; RARITY_LABELS; rarityLabel(r): string; compareByRarityDesc(a, b): number
isRare(productOrRarity: Pick<Product,'rarity'> | Rarity): boolean
primaryImageOf(product: Pick<Product,'images'|'primaryImage'|'name'>): ProductImage
toCartItem(product: Product): Omit<CartItem, 'qty'>
getRelatedProducts(product: Product, all: readonly Product[], limit = 8): Product[]
discountPercent(p: Pick<Product,'price'|'compareAtPrice'>): number | null
limitedEditionInfo(p: Pick<Product,'limitedEdition'|'stock'>): LimitedEditionInfo | null
productMetaLine(p): string /* 'HW EXOTICS · 2026 SERIES' */; productHudLine(p): { series: 'SERIES 03'; collection: '#142' }
interface ProductSpec { label: string; value: string }; productSpecs(product: Product): ProductSpec[]   // SCALE YEAR SERIES COLOR MATERIAL TYPE
```

### `order.ts`

```ts
type OrderStatusTone = 'neutral'|'accent'|'success'|'danger'; interface OrderStatusMeta { label: string; description: string; tone: OrderStatusTone; step: number }
ORDER_STATUS_META: Record<OrderStatus, OrderStatusMeta>; ORDER_TRACK_STEPS: readonly OrderStatus[]
formatOrderRef(orderId): string /* #A1B2C3D4 */; orderItemCount(order): number
```

### `theme.ts`

`SYSTEM_LIGHT_QUERY`, `getSystemTheme(): Theme`, `getDocumentTheme(): Theme`, `applyTheme(theme: Theme): void`.

### `search.ts` (**layout agent** implements) — see §13.

---

## 8. Stores (`src/store/*`, barrel `@/store`)

### `cartStore.ts` (persist `hwa-cart-v1`)

```ts
CART_STORAGE_KEY; interface AddToCartResult { qty: number; added: number; limited: boolean }
interface CartState { items: CartItem[]; catalogueSyncedAt: number /* persisted; dataUpdatedAt of the catalogue last written back, 0 = never */;
  addItem(item: Omit<CartItem,'qty'>, qty?: number): AddToCartResult; removeItem(productId): void;
  setQty(productId, qty): void /* clamp 1..min(stock,10) */; clear(): void /* keeps catalogueSyncedAt */;
  reconcile(products: readonly Product[], syncedAt: number): void /* raises catalogueSyncedAt to syncedAt when it writes */ }
useCartStore; useCartItems(): CartItem[]; useCartCount(): number; useCartSubtotal(): number; useCartLine(id): CartItem | undefined; useCartQty(id): number
```

Persisted shape `{ items, catalogueSyncedAt }` (still v1; blobs without the stamp merge as 0). `useReconciledCart` never writes snapshots from a catalogue older than the stored stamp. It refetches the catalogue once per newer stamp instead, which stops the cross-tab ping-pong through PersistSync. If a successful refetch is still older (clock anomaly), it writes anyway.

Add-to-cart pattern: `const r = useCartStore.getState().addItem(toCartItem(product)); r.limited ? toast({ title: 'Max per collector reached' }) : toast.success('Added to your pit stop', product.name)`. When stock, not `MAX_QTY_PER_ITEM`, is what refuses the add, the title is `Only N in stock` instead (`AddToCartButton`; the wishlist's `blockedMoveToast` also says "Sold out" / "No longer available").

### `uiStore.ts` (persist `hwa-prefs-v1`: `theme` only once explicitly chosen, `soundEnabled`, `scanlines`)

```ts
PREFS_STORAGE_KEY
interface UiState { theme: Theme; themeExplicit: boolean; soundEnabled: boolean /* default false */; scanlines: ScanlineMode /* 'auto' */;
  mobileNavOpen: boolean; searchOpen: boolean; signInPrompt: SignInPromptState;
  setTheme(t); toggleTheme(); syncSystemTheme(t); setSoundEnabled(b); toggleSound(); setScanlines(m); cycleScanlines();
  setMobileNavOpen(b); openMobileNav(); closeMobileNav(); toggleMobileNav();
  setSearchOpen(b); openSearch() /* closes drawer */; closeSearch(); toggleSearch();
  openSignInPrompt(reason?: string); closeSignInPrompt() }
useUiStore; useScanlinesActive(): boolean   // resolves 'auto' (on in dark)
```

Select narrowly: `const theme = useUiStore((s) => s.theme)`.

### `garageStore.ts` (NOT persisted; mirror of garage + wishlist; hydrated by AuthProvider; reset on sign-out)

```ts
interface GarageMirrorEntry { isFavorite: boolean; quantity: number; addedAt: number | null; source: GarageSource }; interface WishlistMirrorEntry { addedAt: number | null }
interface GarageState { garage: Record<string, GarageMirrorEntry>; wishlist: Record<string, WishlistMirrorEntry>; garageHydrated: boolean; wishlistHydrated: boolean;
  hydrateGarage(entries); hydrateWishlist(entries); upsertGarageEntry(id, entry); patchGarageEntry(id, patch); removeGarageEntry(id);
  setWishlisted(id, wishlisted, addedAt?); reset() }
useGarageStore; useIsInGarage(id): boolean; useIsWishlisted(id): boolean; useIsFavorite(id): boolean; useGarageQuantity(id): number; useGarageCount(): number; useWishlistCount(): number
```

### `toastStore.ts`

```ts
MAX_TOASTS = 5; DEFAULT_TOAST_DURATION = { default: 4000, success: 4000, error: 6500, achievement: 7000 }
interface ToastState { toasts: Toast[]; push(input: ToastInput): string; dismiss(id): void; clear(): void }
useToastStore; useToasts(): Toast[]
MIN_ACTION_TOAST_DURATION = 8000   // toasts with an `action` stay at least this long
toast(input: ToastInput): string
toast.success(title, description?, options?): string; toast.error(title, description?, options?): string
toast.achievement(title, description?, icon?): string; toast.dismiss(id); toast.clear()
```

Identical toasts within 1.2s are de-duplicated. The ui-kit `<Toaster/>` owns rendering + auto-dismiss (pause on hover / keyboard focus; 2 visible on phones, the rest queued behind "+N more").

### `recentSearchStore.ts` (sessionStorage `hwa-recent-searches-v1`)

```ts
RECENT_SEARCHES_STORAGE_KEY; MAX_RECENT_SEARCHES = 8
interface RecentSearchState { recent: string[]; addRecent(q); removeRecent(q); clearRecent() }
useRecentSearchStore; useRecentSearches(): string[]
```

localStorage is reserved for cart + prefs. Never store anything else there.

---

## 9. Services (`src/services/*`) — components never import these directly; use hooks.

### `auth.ts`

```ts
type User (re-export from firebase/auth); googleProvider: GoogleAuthProvider
signInWithGoogle(): Promise<User | null>   // popup; redirect fallback on popup-blocked / unsupported env; null when cancelled/redirecting
completeRedirectSignIn(): Promise<User | null>; signOutUser(): Promise<void>
onAuthChange(cb: (user: User | null) => void): Unsubscribe
getCurrentUid(): string | null; getCurrentUser(): User | null; requireUid(): string /* throws NotSignedInError */
```

### `functions.ts` (callables, region asia-south1)

```ts
ensureUserProfile(): Promise<EnsureProfileResponse>
placeOrder(request: PlaceOrderRequest): Promise<PlaceOrderResponse>      // 30s timeout
submitReview(request: SubmitReviewRequest): Promise<SubmitReviewResponse>
subscribeNewsletter(request: NewsletterRequest): Promise<NewsletterResponse>
```

### `firestore/*` (barrel `@/services/firestore`)

- `converters.ts`: readers `readString readNullableString readNumber readNullableNumber readBoolean readStringArray readObject readEnum toMillis`; parsers `parseProduct(id, data)`, `parseCategory`, `parseSeries`, `parseReview(id, data, productId)`, `parseUserProfile(uid, data)`, `parseGarageEntry`, `parseWishlistEntry`, `parseAddress(value)`, `parseSavedAddress`, `parseOrder`, `parseSiteSettings(data)`; read-only converters `productConverter categoryConverter seriesConverter reviewConverter userProfileConverter garageEntryConverter wishlistEntryConverter orderConverter siteSettingsConverter savedAddressConverter`. Pending server timestamps are estimated; missing fields defaulted.
- `serverReads.ts`: `getDocsOnline(q)` rejects `FirebaseError('unavailable', OFFLINE_READ_MESSAGE)` ("Can't reach the track right now.") when the snapshot is `fromCache`; with the memory cache that only happens while the SDK is offline. Also `isUnavailableError(e)`. Every list/lookup query uses it (products list + slug, categories, series ×2, reviews, garage, wishlist, orders list, addresses), so an unreachable backend is a retryable query error, never an empty catalogue, a false 404 or an "unavailable" cart. Not used for `getDoc` readers, `subscribeToProfile` or `fetchSiteSettings` (defaults on error by design).
- `products.ts`: `productsCollection()`, `compareProductsNewest(a,b)`, `fetchActiveProducts(): Promise<Product[]>` (`isActive == true`), `fetchProductBySlug(slug): Promise<Product | null>` (null only for a server-confirmed miss), `fetchProductById(id)`, `fetchProductsByIds(ids)` (rejects when every read failed with `unavailable`).
- `categories.ts`: `fetchCategories()` (active, sorted by order). `series.ts`: `compareSeries`, `fetchSeries()`, `fetchSeriesBySlug(slug)`.
- `reviews.ts`: `REVIEWS_PAGE_SIZE = 20`, `fetchReviews(productId, max?)` (`orderBy createdAt desc`).
- `users.ts`: `userDoc(uid)`, `fetchProfile(uid)`, `subscribeToProfile(uid, onData, onError?)`, `updateProfileBasics(uid, { displayName?, photoURL? })`.
- `garage.ts`: `fetchGarage(uid)`, `clampGarageQuantity(n)`, `addGarageEntry(uid, productId, { isFavorite?, quantity? })`, `removeGarageEntry`, `setGarageFavorite(uid, id, bool)`, `setGarageQuantity(uid, id, n)`.
- `wishlist.ts`: `fetchWishlist(uid)`, `addToWishlist(uid, id)`, `removeFromWishlist(uid, id)`.
- `orders.ts`: `ORDERS_PAGE_SIZE = 50`, `fetchOrders(uid, max?)` (`where uid ==`, `orderBy createdAt desc`), `fetchOrder(orderId)`.
- `settings.ts`: `fetchSiteSettings(): Promise<SiteSettings>` (never throws; defaults on error).
- `addresses.ts`: `MAX_SAVED_ADDRESSES = 10`, `fetchAddresses(uid)`, `saveAddress(uid, address, { id?, isDefault?, otherIds? }): Promise<string>`, `deleteAddress(uid, id)`.

### `payment/*` (commerce agent may extend in WF2)

```ts
interface PaymentCustomer { name: string; email: string; phone: string }
interface PaymentRequest { amount: number; currency: 'INR'; method: PaymentMethod; customer: PaymentCustomer; reference: string; signal?: AbortSignal }
interface PaymentProvider { readonly id: PaymentProviderId; label: string; mode: PaymentMode; supportedMethods: readonly PaymentMethod[];
  createPayment(req: PaymentRequest): Promise<PaymentResult> }    // declines resolve with status 'failed'
class PaymentAbortedError extends Error; createPaymentReference(): string
interface DummyPaymentOptions { processingMs?: number /*2000*/; successRate?: number /*0.9*/; random?: () => number }
class DummyPaymentProvider implements PaymentProvider   // 'test' mode, COD always succeeds, txn 'test_' + 20 hex
generateTestTransactionId(): string
```

`@/services/payment` (index) also re-exports `ACTIVE_PAYMENT_PROVIDER`, `PAYMENT_METHOD_OPTIONS`, `getPaymentProvider`, `isTestPaymentMode`.

---

## 10. Firestore write contracts (infra: enforce in rules; functions: honour)

| Path                                             | Client may                                                                                                                                                                                                               | Exact shape                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `products`, `categories`, `series`, `settings/*` | read (public)                                                                                                                                                                                                            | write: admin claim only. Client lists query `where('isActive','==',true)`; `getDoc` by id is also used (garage entries of retired cars) → allow public read of all product docs                                                                                                                                                                                                                                               |
| `products/{id}/reviews/{uid}`                    | read (public)                                                                                                                                                                                                            | writes **functions only** (`submitReview`)                                                                                                                                                                                                                                                                                                                                                                                    |
| `users/{uid}`                                    | read own; update only `displayName` (1..80, no control/zero-width-space/bidi characters, ZWNJ/ZWJ allowed — rules `hasNoHiddenChars`), `photoURL`, `updatedAt(==request.time)`                                           | created by `ensureUserProfile`/`onUserCreate` with `{ uid?, displayName, email, photoURL, xp:0, level:1, badges:[], stats:{…7 counters}, role:'customer', createdAt, updatedAt }`; functions also maintain `statsSyncedAt` (server timestamp of the last `onGarageWrite` full recompute; function-owned)                                                                                                                      |
| `users/{uid}/garage/{productId}`                 | read own; **create** keys exactly `productId (== docId), addedAt (== request.time), source == 'manual', isFavorite (bool), quantity (int 1..99)`; **update** only `isFavorite` and/or `quantity` (int 1..99); **delete** | functions write `source: 'purchase'` entries (quantity incremented on repeat purchase)                                                                                                                                                                                                                                                                                                                                        |
| `users/{uid}/wishlist/{productId}`               | read own; create keys exactly `productId (== docId), addedAt (== request.time)`; delete; no update                                                                                                                       |                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `users/{uid}/addresses/{id}`                     | read/create/update/delete own                                                                                                                                                                                            | keys `name, phone, pincode, line1, line2, landmark, city, state, isDefault, createdAt, updatedAt` (line2/landmark always strings, `''` allowed; create sets createdAt=updatedAt=request.time; update keeps createdAt, sets updatedAt=request.time); text fields (name, line1, line2, landmark, city) contain no control/zero-width-space/bidi characters, ZWNJ/ZWJ allowed (rules `hasNoHiddenChars`, `AddressSchema` refine) |
| `orders/{id}`                                    | read own (`resource.data.uid == auth.uid`)                                                                                                                                                                               | create/update: functions only (admin may update status)                                                                                                                                                                                                                                                                                                                                                                       |
| `newsletter/*`                                   | nothing                                                                                                                                                                                                                  | functions only                                                                                                                                                                                                                                                                                                                                                                                                                |

**Indexes needed**: `orders (uid ASC, createdAt DESC)`. (Reviews use single-field `createdAt`; everything else is equality-only or client-sorted.)

Users stats written by functions: `{ carsOwned, uniqueCars, seriesCompleted, ordersPlaced, racingCars, rareCars, totalSpent }` — compute garage-derived ones with `computeGarageStats` from `shared/gamification`.

---

## 11. Hooks (`src/hooks/*`)

### Auth

```ts
useAuth(): AuthContextValue
  // { user: User | null; profile: UserProfile | null; status: AuthStatus; isProfileLoading: boolean;
  //   signIn(): Promise<User | null> /* toasts on failure */; signOut(): Promise<void>; isSigningIn: boolean }
useUid(): string | null
useRequireAuthAction(): RequireAuthAction   // (action: () => void | Promise<void>, reason?: string) => void
runPendingAuthAction(): boolean; clearPendingAuthAction(): void   // used by AuthProvider only
```

**Require auth for an action**: `const requireAuth = useRequireAuthAction(); onClick={() => requireAuth(() => doThing(), 'Sign in to …')}`. Signed out → `uiStore.openSignInPrompt(reason)`; after a successful sign-in AuthProvider closes the prompt and **runs the queued action**. Actions must read the uid at call time (`getCurrentUid()`/`requireUid()`), never from a render closure.

### Catalogue queries

```ts
productListQueryOptions                                     // for queryClient.ensureQueryData / prefetch
useProducts<TData = Product[]>(select?: (p: Product[]) => TData): UseQueryResult<TData>   // all active products
productSelectors = { newArrivals, featured, vault }         // stable selectors for useProducts(select)
// null = not found. Seeded from the cached catalogue as initialData (with the list's dataUpdatedAt), but every
// (re)fetch reads fetchProductBySlug, so invalidateQueries(['products']) refreshes the rating, stock and so on.
useProduct(slug: string | undefined): UseQueryResult<Product | null>
// Keeps previous data while ids change; the catalogue comes from fetchQuery(productListQueryOptions)
// (a stale or invalidated list is refetched or joined).
useProductsByIds(ids: readonly string[]): UseQueryResult<Product[]>
useCategories(): UseQueryResult<Category[]>
useSeries(): UseQueryResult<Series[]>; useSeriesBySlug(slug): UseQueryResult<Series | null>
useReviews(productId: string | undefined): UseQueryResult<Review[]>
useSiteSettings(): UseQueryResult<SiteSettings>  /* placeholder = defaults */; useSettings(): SiteSettings
useCartTotals(): CartTotals   // OrderTotals & { settings } for the current cart
```

### User queries (disabled when signed out)

```ts
profileQueryOptions(uid: string | null); useProfile(): UseQueryResult<UserProfile | null>
garageQueryOptions(uid); useGarage(): UseQueryResult<GarageEntry[]>
useGarageCars(): GarageCarsResult   // { cars: GarageCar[]; entries; isLoading; isError; error: Error | null; refetch(): void }
wishlistQueryOptions(uid); useWishlist(): UseQueryResult<WishlistEntry[]>
useWishlistProducts(): WishlistProductsResult   // { products: Product[]; entries; isLoading; isError; error; refetch }
useOrders(): UseQueryResult<Order[]>
// Ids failing DocIdSchema (e.g. 'a/b', reserved '__x__') resolve null (not found) without a read.
useOrder(orderId: string | undefined): UseQueryResult<Order | null>
useSavedAddresses(): UseQueryResult<SavedAddress[]>
```

### Mutations

```ts
usePlaceOrder(): UseMutationResult<PlaceOrderResponse, Error, PlaceOrderRequest>      // invalidates orders+garage; no toast; does NOT clear the cart
useSubmitReview(): UseMutationResult<SubmitReviewResponse, Error, SubmitReviewVariables> // SubmitReviewRequest & { isUpdate? } ("Review updated" vs "Review posted" toast; isUpdate is stripped before the call) + refetch reviews/products; errors inline
useSubscribeNewsletter(): UseMutationResult<NewsletterResponse, Error, NewsletterRequest> // validates with NewsletterSchema; no toasts
interface SaveAddressVariables { address: Address; id?: string; isDefault?: boolean }
useSaveAddress(): UseMutationResult<string, Error, SaveAddressVariables>; useDeleteAddress(): UseMutationResult<void, Error, string>
type ProductRef = string | (Pick<Product,'id'> & { name?: string })
useGarageActions(options?: { toasts?: boolean }): GarageActions
  // { addToGarage(p); removeFromGarage(p); toggleFavorite(p); setQuantity(p, n); isPending: boolean; pendingProductId: string | null }
useWishlistActions(options?: { toasts?: boolean }): WishlistActions
  // { toggleWishlist(p); addToWishlist(p); removeFromWishlist(p); isPending; pendingProductId }
```

Garage/wishlist actions: already auth-gated (prompt + auto-run after sign-in), optimistic on **both** the query cache and `garageStore`, rollback + `toast.error` on failure, success toasts (disable with `{ toasts: false }`), refetch after the last concurrent mutation settles. `addToGarage` is a no-op if the car is already parked; `toggleFavorite` requires the car in the garage. `toggleWishlist` is resolved at click time against the mirror (signed out or not hydrated → add). Queued (post-sign-in) and pre-hydration actions decide from the real data: the mirror if hydrated, else `ensureQueryData(wishlistQueryOptions|garageQueryOptions)`. When the state already matches, it is a quiet no-op: add of a parked car, or a favorite already set. Favorite/remove/quantity for a car not in the garage writes nothing (favorite shows "Not in your garage yet"). If that read fails, nothing is written and the friendly "Couldn't finish that" toast shows.

### Utility hooks

```ts
MEDIA_QUERIES = { sm, md, lg, xl, hover, reducedMotion, prefersLight }
useMediaQuery(query: string, fallback = false): boolean; useIsDesktop(): boolean /* ≥1024 */; useCanHover(): boolean
useReducedMotion(): boolean; useMotionSafeVariants(variants: Variants): Variants
useDebounce<T>(value: T, delay = 250): T
useLockBodyScroll(locked = true): void   // ref-counted, scrollbar-compensated
usePrevious<T>(value: T): T | undefined
```

Layout-owned hooks (**layout agent**): `useSound`, `useHotkey`, `useScrollProgress` — see §13.

---

## 12. Providers, router, conventions

### Providers (`src/providers/*`)

`AppProviders` = `QueryClientProvider(queryClient)` → `MotionConfig reducedMotion="user"` → `AuthProvider` (+ `ThemeSync`, `PersistSync`). Mounted in `App.tsx` **outside** the router (so providers can't use router hooks; AppLayout and everything inside can).

- `queryClient.ts`: `createQueryClient()`, `queryClient` — staleTime 60s, gcTime 10m, `retry: shouldRetryQuery` (1 retry; never permission/auth/not-found/validation), no refetch on focus.
- `AuthProvider`: onAuthStateChanged → `ensureUserProfile` once per uid per session (failure = `console.warn`, app keeps working without the functions emulator) → `onSnapshot(users/{uid})` → `setQueryData(queryKeys.profile(uid))`. Completes redirect sign-in on boot. Mirrors garage/wishlist into `garageStore`. On sign-out/user switch: `removeQueries(queryKeys.user(prevUid))` + `garageStore.reset()`.
- `authContext.ts`: `AuthContext`, `AuthContextValue`. `ThemeSync`: applies theme; follows OS until an explicit choice. `PersistSync`: cross-tab rehydration of cart/prefs.

### Router (`src/router.tsx`)

`createBrowserRouter(routes)`; root element `RootLayout` (= `AppLayout` + `RouteAnnouncer` + `ScrollRestoration`), pathless child with `errorElement`, every page route `React.lazy` + `<Suspense fallback={<RouteFallback/>}>` + its own `errorElement={<RouteErrorBoundary/>}`. Auth routes (`/checkout`, `/checkout/success/:orderId`, `/orders`, `/orders/:orderId`, `/garage`, `/wishlist`) are wrapped in `<RequireAuth reason?>`. `/new-drops` → `<Navigate to="/shop?view=new" replace/>`. `*` → NotFoundPage.
**Pages must default-export their component** and may use named sub-components from their own folders.
Scroll: `ScrollRestoration` scrolls to top on new navigations. For in-page URL updates (filters, tabs) use `setSearchParams(next, { replace: true, preventScrollReset: true })`.

Route announcements + focus: `RouteAnnouncer` (src/components/common) renders one visually hidden polite `role="status"` region `#route-announcer`. On a **pathname** change (never on the initial load, a load-time `<Navigate replace>` redirect, or search/hash-only updates such as filters, `?step=`, `?tab=`, FAQ anchors) it waits until the route has settled — no `[aria-busy="true"]` inside `#main-content` and `document.title` changed, or 3 s — then announces `document.title`. Pages therefore must keep calling `useDocumentMeta` and mark loaders `aria-busy`. Focus moves to `#main-content` (`preventScroll`) only when navigation dropped it (`<body>`/null/disconnected); a still-mounted control keeps focus.

### Page metadata

```tsx
export default function VaultPage() {
  useDocumentMeta({ title: 'The Vault', description: 'Numbered limited editions…' });   // noindex: true for cart/checkout/orders/garage/wishlist/404
  useJsonLd('breadcrumbs', buildBreadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: 'Vault', path: '/vault' }]));
  …
}
```

Product page: `useDocumentMeta({ title: product.name, description: product.description, image: productImageUrl(primaryImageOf(product), { w: 1200, h: 630 }), type: 'product' })` + `useJsonLd('product', product ? buildProductDetailJsonLd(product) : null)`. `buildProductDetailJsonLd` (components/product-detail/productSeo.ts): brand = `BRAND_PRODUCT_LINE` (the toy line, never the car maker), `model` = "<make> <model>" of the real car (omitted when empty), generated fallback description.

### Toasts

`import { toast } from '@/store/toastStore'` → `toast.success('Added to your pit stop', product.name)`, `toast.error("Couldn't …", getFriendlyErrorMessage(err))`, `toast.achievement('BADGE UNLOCKED', 'Treasure Hunter', '💎')`, `toast({ title, description, variant, icon, duration })`.

### Data fetching & optimistic conventions

- Components call hooks, never Firestore. New queries: key from `queryKeys`, staleTime from `STALE_TIMES`, user-scoped keys under `queryKeys.user(uid)` with `skipToken` when signed out.
- The catalogue is fetched once (`useProducts`); derive filtered lists client-side (`useMemo`/`select`). Never add realtime listeners for products/stock (profile is the only listener).
- Optimistic mutations: `onMutate` (cancelQueries → snapshot → setQueryData → mirror store) / `onError` (rollback + toast) / `onSettled` (invalidate when `isMutating(key) === 1`).
- Money: `formatINR`; totals: `computeOrderTotals`/`useCartTotals`; never trust client prices server-side.

### Loading / error / empty conventions

- Use `DataState` (ui-kit) for every data view: skeleton (shimmer, matching final layout) while `isLoading`, `ErrorState` with retry (`refetch`) on `isError`, `EmptyState` when empty.
- Wrap independent page sections in `<ErrorBoundary label="Featured collection">` so one crash doesn't kill the page.
- Route-level crashes → `RouteErrorBoundary`. Lazy route loading → `RouteFallback`.
- Buttons with async work: `loading` prop + `aria-busy`, disable while pending.
- Racing microcopy (“Your pit stop is empty”, “Start engine”), but keep functional labels clear (“Add to cart”, “Sign in with Google”).

### Common components (core, initial — ui-kit may refine without breaking props)

```ts
<RequireAuth reason?: string>{children}</RequireAuth>
<RouteErrorBoundary />                        // errorElement
<ErrorBoundary fallback?: ReactNode | ((p: { error: Error; reset(): void }) => ReactNode) label?: string onError? onReset? resetKeys?: readonly unknown[]>
<PageStub title eyebrow? description? children? />
<RouteFallback label? fullScreen? className? />
<RootLayout />                                // core glue: AppLayout + RouteAnnouncer + ScrollRestoration (don't edit)
```

---

## 13. Component APIs expected from WF1 agents (MUST implement; may add props, must not rename)

All components: named exports, one component per file (`PascalCase.tsx`), `className` passthrough merged with `cn()`, `forwardRef` for anything wrapping a native focusable element, full keyboard + ARIA, token colours only, reduced-motion safe. Each agent documents its API in `docs/components/<agent>.md`.

### ui-kit → `src/components/ui/*` (+ `src/components/ui/index.ts` barrel)

| Component           | Key props                                                                                                                                                                                                                                                                                                                                                                                |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Button`            | `variant?: 'primary'\|'secondary'\|'ghost'\|'outline'\|'danger'\|'link'` (primary = bg-accent text-on-accent), `size?: 'sm'\|'md'\|'lg'`, `loading?`, `loadingText?`, `leftIcon?`, `rightIcon?`, `fullWidth?`, `to?: To` (renders react-router `Link`), `href?` (renders `<a>`; external → `target=_blank rel=noopener noreferrer`), native button props (`type` defaults `'button'`)    |
| `IconButton`        | **`label: string` (required → aria-label + title)**, `icon: ReactNode`, `variant?: 'ghost'\|'outline'\|'solid'\|'danger'`, `size?`, `loading?`, `pressed?: boolean` (aria-pressed), `badge?: number` (CountBadge overlay), `to?`, `href?`                                                                                                                                                |
| `Chip`              | `tone?: 'neutral'\|'accent'\|'danger'\|'highlight'\|'success'\|'metal'`, `variant?: 'solid'\|'soft'\|'outline'`, `size?: 'sm'\|'md'`, `icon?`, `selected?`, `onClick?` (→ button, aria-pressed), `onRemove?`                                                                                                                                                                             |
| `RarityChip`        | `rarity: Rarity`, `size?` (common neutral; rare/super-rare/limited highlight)                                                                                                                                                                                                                                                                                                            |
| `CountBadge`        | `count: number`, `max?: number` (99 → "99+"), `label?: string` (sr-only context), hides at 0 unless `showZero`                                                                                                                                                                                                                                                                           |
| `Skeleton`          | `variant?: 'block'\|'text'\|'circle'`, `lines?`, `className` (uses `.shimmer`, aria-hidden)                                                                                                                                                                                                                                                                                              |
| `Spinner`           | `size?: 'sm'\|'md'\|'lg'`, `label?: string` (sr-only, default "Loading")                                                                                                                                                                                                                                                                                                                 |
| `Modal`             | `open`, `onClose()`, `title: ReactNode`, `description?`, `children`, `footer?`, `size?: 'sm'\|'md'\|'lg'\|'xl'`, `initialFocusRef?`, `closeOnOverlayClick?` (true), `hideCloseButton?` — portal, focus trap, Esc, `aria-modal`, labelled/described, returns focus, locks scroll                                                                                                          |
| `Drawer`            | `open`, `onClose()`, `side?: 'left'\|'right'\|'bottom'`, `title`, `children`, `footer?`, `size?` — same a11y as Modal                                                                                                                                                                                                                                                                    |
| `Tabs` + `TabPanel` | `Tabs`: `items: Array<{ id: string; label: ReactNode; badge?: number; disabled?: boolean }>`, `value: string`, `onChange(id)`, `label: string` (tablist aria-label), `idPrefix: string`, `variant?: 'underline'\|'pill'`; arrow/Home/End keys, roving tabindex. `TabPanel`: `idPrefix`, `tabId`, `active: boolean`, `children` (ids `${idPrefix}-tab-${id}` / `${idPrefix}-panel-${id}`) |
| `Toaster`           | `position?: 'bottom-right'\|'top-center'` — renders `useToasts()`, polite live region (assertive for errors), auto-dismiss by `toast.duration`, pause on hover/keyboard focus, dismiss button, optional `action` button (outline, sm; announced as "… available in notifications"); achievement = highlight styling                                                                      |
| `ProgressBar`       | `value: number` (0–100), `label: string` (aria-label), `tone?: 'accent'\|'highlight'\|'success'\|'danger'`, `size?: 'xs'\|'sm'\|'md'`, `showValue?`, `animated?` (fills on mount/in view; instant under reduced motion)                                                                                                                                                                  |
| `StatBar`           | `label: string`, `value: number`, `max: number`, `display?: string` (e.g. `320 KM/H`, `8/10`), `tone?`, `animateOnView?` (true)                                                                                                                                                                                                                                                          |
| `StarRating`        | `value: number` (0–5, halves), `count?: number`, `size?`, `showValue?` — `role="img"` aria-label "Rated 4.5 out of 5"                                                                                                                                                                                                                                                                    |
| `StarRatingInput`   | `value: number`, `onChange(n)`, `label: string`, `name?`, `disabled?`, `invalid?` — radio-group semantics, arrow keys                                                                                                                                                                                                                                                                    |
| `PriceTag`          | `price: number`, `compareAtPrice?: number \| null`, `size?: 'sm'\|'md'\|'lg'\|'xl'` — mono, `formatINR`, sr-only "was ₹…"                                                                                                                                                                                                                                                                |
| `Input`, `Textarea` | native props + `invalid?: boolean`; `Input` also `leftIcon?`, `rightSlot?` (forwardRef; works with `register`)                                                                                                                                                                                                                                                                           |
| `Select`            | native select + `options?: Array<{ value: string; label: string; disabled?: boolean }>`, `placeholder?`, `invalid?`                                                                                                                                                                                                                                                                      |
| `Checkbox`          | native checkbox props + `label: ReactNode`, `description?`                                                                                                                                                                                                                                                                                                                               |
| `RadioGroup`        | `name`, `value`, `onChange(value)`, `options: Array<{ value: string; label: ReactNode; description?: ReactNode; icon?: ReactNode; disabled?: boolean }>`, `legend: string`, `orientation?`, `variant?: 'default'\|'card'`                                                                                                                                                                |
| `FormField`         | `label: string`, `htmlFor: string`, `error?: string`, `hint?: string`, `required?`, `children` — error id `${htmlFor}-error`, hint id `${htmlFor}-hint` (children set `aria-describedby`/`aria-invalid`)                                                                                                                                                                                 |
| `RangeSlider`       | `min`, `max`, `step?`, `value: [number, number]`, `onChange(v)`, `onCommit?(v)`, `label: string`, `formatValue?: (n) => string` (default `formatINR`) — two `role="slider"` thumbs, arrows/PageUp/PageDown/Home/End, `aria-valuetext`                                                                                                                                                    |
| `QuantityStepper`   | `value`, `onChange(n)`, `min?` (1), `max`, `label: string`, `size?`, `disabled?`                                                                                                                                                                                                                                                                                                         |
| `EmptyState`        | `icon?`, `title: string`, `description?`, `action?: ReactNode`                                                                                                                                                                                                                                                                                                                           |
| `ErrorState`        | `title?` ("ENGINE TROUBLE"), `error?: unknown` (→ `getFriendlyErrorMessage`), `message?`, `onRetry?()`, `retryLabel?`, `compact?`                                                                                                                                                                                                                                                        |
| `SectionHeading`    | `eyebrow?: string` (HUD), `title: ReactNode`, `description?`, `action?: ReactNode`, `as?: 'h1'\|'h2'\|'h3'` (h2), `align?: 'left'\|'center'`, `id?`                                                                                                                                                                                                                                      |
| `HudReadout`        | `label: string`, `value: ReactNode`, `unit?: string`, `tone?: 'default'\|'accent'\|'highlight'`, `size?`                                                                                                                                                                                                                                                                                 |
| `Kbd`               | `children`                                                                                                                                                                                                                                                                                                                                                                               |
| `VisuallyHidden`    | `children`, `as?`                                                                                                                                                                                                                                                                                                                                                                        |
| `Container`         | `as?: ElementType`, `size?: 'content'\|'narrow'\|'wide'`, `children` (`mx-auto max-w-content px-4 sm:px-6 lg:px-8`)                                                                                                                                                                                                                                                                      |

**Additive ui-kit APIs (as built — details in [`docs/components/ui-kit.md`](components/ui-kit.md)):**

- `ProgressBar`: `max?` (default 100), `valueLabel?: ReactNode` (visible readout / `aria-valuetext`), `segments?: number` (tachometer ticks), `striped?`.
- `Modal`: `tone?: ModalTone` (e.g. achievement styling), `eyebrow?: ReactNode` (HUD line above the title).
- `Tabs`: generic ids (`Tabs<T extends string>`), `activation?: 'automatic'|'manual'`, `fullWidth?`; helpers `tabId(prefix, id)` / `tabPanelId(prefix, id)`.
- `FormField`: `children` may be a render function receiving the wired `id` / `aria-describedby` / `aria-invalid` props (`FormFieldRenderProps`).
- `IconButton`: `badgeLabel?: string` (sr-only context for the `badge` count).
- Barrel extras: `buttonClasses` / `buttonGapClass` / `isExternalHref`, `fieldClasses`, `fieldDescribedBy` / `fieldErrorId` / `fieldHintId` / `joinIds`, `Portal`, `useFocusTrap` / `getTabbableElements`, `useOverlayBehavior`, `mergeRefs`.
- Loading buttons use `aria-disabled` + `aria-busy` (focus is kept); the `disabled` prop still sets native `disabled` unless `focusableWhenDisabled` is set (`<button>` only: `aria-disabled`, clicks blocked, focus kept — added 2026-10-08 for `AddToCartButton`'s max state).
- `Toaster` (2026-10-08): only keyboard focus pauses timers (hover pauses for pointers); keyboard dismiss moves focus to the next toast's ×, else back to its origin / `#main-content`; below `sm` at most `SMALL_SCREEN_VISIBLE_TOASTS` (2) show and the rest queue behind "+N more notifications"; toasts pushed together are announced in one live-region update.

### ui-kit → `src/components/gamification/*`

| Component          | Key props                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `LevelBadge`       | `level: number`, `size?: 'sm'\|'md'\|'lg'`, `showTitle?` (uses `levelTitle`)                                                                                                                                                                                                                                                                                                                |
| `XpBar`            | `xp: number`, `showLabels?` (true: `LEVEL 07`, `1,240 XP`, `160 XP TO LEVEL 08`), `size?` — uses `xpProgress` + `ProgressBar`                                                                                                                                                                                                                                                               |
| `BadgeCard`        | `badgeId: BadgeId`, `unlocked: boolean`, `progress?: BadgeProgress`, `size?: 'sm'\|'md'`, `showProgress?` — locked: muted emoji (dimmed + mostly desaturated, faint light outline in dark so dark glyphs like 🏎️ stay legible) + lock icon + progress; unlocked: `BADGE_UI` tone glow. In the `md` card the XP line + progress bar sit at the bottom (`mt-auto`) so they align across a row |
| `BadgeGrid`        | `unlocked?: readonly BadgeId[]`, `stats?: Partial<UserStats>`, `size?`, `columns?`                                                                                                                                                                                                                                                                                                          |
| `BadgeUnlockModal` | `badgeId: BadgeId \| null`, `open: boolean`, `onClose()`, `queueCount?`                                                                                                                                                                                                                                                                                                                     |
| `BadgeWatcher`     | no props — mounted once in AppLayout; diffs `useAuth().profile?.badges` vs previous (skips the first load and user switches), shows `toast.achievement` + queued `BadgeUnlockModal`; level-up toast when `profile.level` increases                                                                                                                                                          |

Barrel `@/components/gamification` also exports the pure helpers `snapshotFromProfile(profile)` / `diffBadgeSnapshots(prev, next)` (`BadgeSnapshot`, `BadgeSnapshotDiff`) used by `BadgeWatcher`. `BadgeWatcher` also celebrates badges awarded by `placeOrder`; as built (WF2 commerce) it **skips the unlock modal on `/checkout` and `/checkout/success/:orderId`** (toasts still fire), because the success page shows the unlocked badges itself and the live profile snapshot can land a moment before checkout navigates.

### ui-kit → `src/components/common/DataState.tsx`

`DataState({ isLoading: boolean; isError: boolean; error?: unknown; onRetry?: () => void; isEmpty?: boolean; skeleton?: ReactNode; empty?: ReactNode; children: ReactNode | (() => ReactNode) })`

### layout → `src/components/layout/*` (+ search, effects, auth, newsletter)

- `AppLayout` (replaces core's placeholder; keep export name, `<main id="main-content" tabIndex={-1}>` and `<Outlet/>`) mounts **once**: `PageBackdrop`, `SkipLink`, `Navbar` (which renders `ScrollProgress` along its bottom edge), `<main>` (`min-h-[calc(100svh-var(--header-height))]`, see §3.5) with `<Suspense fallback={<RouteFallback/>}><Outlet/></Suspense>`, `Footer`, then the global overlays `MobileDrawer`, `CommandPalette`, `SignInPrompt`, `Toaster`, `BadgeWatcher`, `ScanlinesOverlay`. The route announcer lives one level up, in `RootLayout`.
- `Navbar` (sticky `glass`, shrinks on scroll, `z-header`, NAV_LINKS with `isNavLinkActive` → `aria-current`, search button (Ctrl/Cmd+K), `WishlistNavButton`, `CartButton`, `ThemeToggle`, `SoundToggle`, `ScanlinesToggle`, `UserMenu`), `Footer` (FOOTER_LINK_GROUPS, SOCIAL_LINKS, NewsletterForm inline, FOOTER_DISCLAIMER, © COPYRIGHT_OWNER), `MobileDrawer` (uiStore.mobileNavOpen), `ThemeToggle`, `SoundToggle`, `ScanlinesToggle` (cycles auto/on/off), `CartButton` (useCartCount badge → /cart), `WishlistNavButton` (useWishlistCount → /wishlist), `UserMenu` (avatar/profile level, links My Garage/Orders/Wishlist, Sign out; signed out → GoogleSignInButton).
- `search/CommandPalette` (Ctrl/Cmd+K via `useHotkey`, uiStore.searchOpen, combobox ARIA, grouped suggestions, recent searches, Enter → `/search?q=`), `search/SearchInput` (`value`, `onChange(v)`, `onSubmit?(v)`, `placeholder?` = "Search the garage…", `autoFocus?`, `size?`).
- `src/lib/search.ts`: `buildSearchIndex(products: readonly Product[]): SearchIndex`, `searchProducts(index: SearchIndex, query: string, limit?: number /* default: all */): Product[]`, `searchProductsScored(index, query, limit?): ScoredProduct[]` (`{ product, score }`), `groupSuggestions(products: readonly Product[], query: string, options?: { maxMakes?: number /* 4 */; maxModels?: number /* 6 */ }): MakeSuggestion[]` (`MakeSuggestion = { make; models: ModelSuggestion[] }`, `ModelSuggestion = { model; count; slugs: string[] }`), `matchText(text, query): number`, plus `normalizeSearchText`, `tokenize`, `editDistance`, `SEARCH_FIELD_WEIGHTS`. Strict token/prefix/joined-prefix/substring matching; typo tolerance only as a fallback pass when nothing matches strictly.
- `effects/*`: `GridBackground` (`fade?`), `RacingLines` (`count?`), `TireMarks`, `ScanlinesOverlay` (no props; `useScanlinesActive`), `Speedometer` (`value`, `max?` 320, `label?`, `unit?`, `size?`), `Tachometer` (`rpm`, `redline?`, `size?`), `HudPanel` (`title?`, `children`). All decorative → `aria-hidden`, all accept `className`.
- `newsletter/NewsletterForm` (`variant?: 'section'|'inline'`, `headingId?` — id of the section-variant heading so an ancestor landmark can point `aria-labelledby` at it) — `useSubscribeNewsletter`, inline success/error status (`aria-live`).
- `auth/SignInPrompt` (no props; Modal bound to `uiStore.signInPrompt`, shows `reason`, calls `useAuth().signIn()`, closes on success — AuthProvider also closes it and runs the queued action), `auth/GoogleSignInButton` (`fullWidth?`, `size?`, `label?`, `onSignedIn?(user)`).
- Hooks: `useSound(): (name: SoundName) => void` (lazy `import('howler')`, plays `SOUND_SOURCES[name]` at `SOUND_VOLUME[name]`; no-op when `soundEnabled` is false or the file is missing) + `playSound(name)` (same, outside React), `useHotkey(combo: string | readonly string[], handler: (e: KeyboardEvent) => void, opts?: { enabled?: boolean; preventDefault?: boolean /* true */; allowInInputs?: boolean; allowRepeat?: boolean })` (`'mod+k'` = Ctrl on Windows / Cmd on macOS) + helpers `parseHotkey`, `matchesHotkey`, `isEditableTarget`, `isMacPlatform`, `hotkeyLabels(combo)` (`['Ctrl','K']` / `['⌘','K']`), `hotkeyAria(combo)`; `useScrollProgress(): number` (0..1, rAF-throttled shared store) + `useIsScrolled(threshold = 8): boolean`.

**Additive layout APIs (as built — details in [`docs/components/layout.md`](components/layout.md)):** `SearchButton` (`variant?: 'pill'|'compact'|'icon'|'row'`, `aria-keyshortcuts`), `Gauge` (shared base of `Speedometer` / `Tachometer`), `HudPanel` (`meta?`, `tone?: 'default'|'accent'|'highlight'`, `titleAs?`, `as?`, `padding?`), `GoogleSignInButton` (`loadingText?`, `variant?` default `'secondary'`; also reused by `RequireAuth`), `GoogleMark` (`tile?`), `NewsletterForm` (`eyebrow?`, `title?`, `description?`, `headingAs?`), `Logo` (`size?`, `asLink?`, `onClick?`, `className?`, `textClassName?` — the Navbar passes `max-[359px]:sr-only`), `NavLinks`, `SocialLinks`, `PageBackdrop`, `ToggleRow`, `UserAvatar`, `SkipLink` (`targetId?`). The command palette dialog (`CommandPaletteDialog`) and the footer `NewsletterForm` are code-split (lazy + idle prefetch). There is no `@/components/auth` barrel — import files directly.

### product → `src/components/product/*`

| Component             | Key props                                                                                                                                                                                                                                                                                                                                                                                                       |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CarImage`            | `image?: ProductImage \| null`, `src?: string` (plain URL, e.g. cart line), `alt: string`, `width: number`, `height: number`, `sizes?`, `priority?` (eager + `fetchPriority="high"`; default lazy), `className`, `imgClassName?` — Cloudinary via `productImageUrl`/`productImageSrcSet`, `onError` → `url` → `FALLBACK_CAR_IMAGE`, `decoding="async"`; structured so a 3D viewer can replace the `<img>` later |
| `ProductCard`         | `product: Product`, `priority?`, `variant?: 'default'\|'compact'` — `SERIES 03 #142`, name (link to `productPath`), StarRating + "Collector Edition" tag, RarityChip, scale/year/type mini-meta, StockStatus, PriceTag, `AddToCartButton` + `WishlistButton`; hover: card → card-hover metallic, racing stripe, slight 3D tilt (framer; off without hover/with reduced motion)                                  |
| `ProductCardSkeleton` | `variant?`                                                                                                                                                                                                                                                                                                                                                                                                      |
| `ProductGrid`         | `products: Product[]`, `isLoading?`, `skeletonCount?` (8), `empty?: ReactNode`, `columns?: 2\|3\|4`                                                                                                                                                                                                                                                                                                             |
| `VaultCard`           | `product: Product` — large, yellow highlight, `LIMITED EDITION`, `limitedEditionInfo` label `#001/500`, "Only 37 remaining" + animated ProgressBar (tone highlight)                                                                                                                                                                                                                                             |
| `HorizontalRail`      | `ariaLabel: string`, `children`, `title?` — scroll-snap + drag, prev/next IconButtons, `role="region" aria-roledescription="carousel"`                                                                                                                                                                                                                                                                          |
| `AddToCartButton`     | `product: Product`, `qty?`, `size?`, `variant?`, `fullWidth?`, `label?` — uses `cartStore.addItem(toCartItem(p), qty)`, toasts, sold-out disabled state, engine-shake + `useSound()('click')`                                                                                                                                                                                                                   |
| `WishlistButton`      | `product: Product`, `variant?: 'icon'\|'button'`, `size?` — `useWishlistActions`, `useIsWishlisted`, `aria-pressed`                                                                                                                                                                                                                                                                                             |
| `AddToGarageButton`   | `product: Product`, `size?`, `fullWidth?` — `useGarageActions`, `useIsInGarage` ("IN YOUR GARAGE ✓" state)                                                                                                                                                                                                                                                                                                      |
| `StockStatus`         | `stock: number`, `size?` — `stockStatus()` colours: in-stock success, low danger-ink, sold-out muted                                                                                                                                                                                                                                                                                                            |
| `CollectorMeta`       | `product: Product`, `layout?: 'inline'\|'stacked'` — scale / year / vehicleType / series HUD line                                                                                                                                                                                                                                                                                                               |

**Additive product APIs (as built — details in [`docs/components/product.md`](components/product.md)); barrel `@/components/product`:**

- `HorizontalRail` also accepts `items` + `renderItem(item, index)` + `getItemKey?` (instead of `children`), `label` (alias of `ariaLabel`; one of them is required), `action?`, `itemWidth?`, `gap?: 'sm'|'md'|'lg'`, `showControls?`, `slideLabel?(index, total)`, `trackClassName?`. The title wrapper has a `basis-[min(100%,18rem)]` so a long title wraps above the controls at 375px instead of being squeezed.
- `ProductGrid`: `emptyState` (alias of `empty`), `variant?`, `priorityCount?` (first N cards eager + no entrance fade), `label?`, `loadingLabel?`, `cardHeadingAs?`.
- `ProductCard`: `headingAs?`, `imageSizes?`. `VaultCard`: `layout?: 'vertical'|'horizontal'`, `priority?`, `headingAs?` (the card is a flex column with the price/CTA row pushed down, so rows line up across a grid even when a name wraps).
- `CarImage`: `fit?`, `crop?`, `gravity?`, `widths?` (srcset), `aspectBox?`, `style?`, `renderMedia?` (slot for a future 3D viewer).
- `AddToCartButton`: `onAdded?` (e.g. BUY NOW → checkout). `WishlistButton`: `iconVariant?`, `fullWidth?`. `AddToGarageButton`: `variant?` (two-step "CONFIRM REMOVE?" when already parked).
- The barrel also exports `COLLECTOR_EDITION_MIN_SCORE` (collectorScore ≥ 8 → "COLLECTOR EDITION" tag).

---

## 14. Notes for the other WF1 agents

### functions

- Callable names from `CALLABLES`, region `FUNCTIONS_REGION`; request/response types from `shared/types.ts`; validate with `shared/schemas.ts` (`PlaceOrderRequestSchema`, `SubmitReviewSchema`, `NewsletterSchema`); totals with `computeOrderTotals` + `DEFAULT_SITE_SETTINGS` fallback; XP via `computeOrderXp` + `newlyUnlockedBadges` + `badgeXpTotal` + `levelForXp`; garage stats via `computeGarageStats`.
- Import shared relatively from `functions/src/*`: `import { … } from '../../shared/index.js'` (shared uses `.js` extensions internally). Dummy verifier: `DUMMY_TRANSACTION_ID_REGEX`.
- Errors: `HttpsError` with user-facing messages (shown verbatim by the client for invalid-argument / failed-precondition / out-of-range / already-exists / resource-exhausted).
- `npm install --include=dev` inside `functions/` (NODE_ENV=production quirk).
- `subscribeNewsletter` keys the per-IP limit on the **right-most** `X-Forwarded-For` entry (`extractClientIp`, `CLIENT_IP_TRUSTED_HOPS = 0`; raise it if a trusted proxy or load balancer is added). The fallback is the socket address, never `req.ip`. IPv6 is keyed per /64 (`rateLimitKeyForIp`).
- `submitReview` stores a sanitised reviewer name (`stripUnsafeText`, whitespace collapsed, at most 80 code points, falling through profile → token → "Collector"). It keeps only Google avatar photos (`https://lh3–6.googleusercontent.com/…`), else `null`.
- `onGarageWrite` stamps `statsSyncedAt` on every full recompute. It reads only the profile first and skips events whose garage write provably committed before the stamp (`garageWriteCommitBoundMs`: the after document's `updateTime`, or for deletes `event.time` rounded up to its precision, because the emulator sends whole seconds).

### infra

- Emulator ports: `EMULATOR_PORTS`; project `demo-hotwheelsarena`; hosting serves `dist/`, SPA rewrite, `no-cache` for `/index.html` **and `/site.webmanifest`**, immutable for `/assets/**`.
- CSP: the only inline script is the no-flash theme script in index.html — hash **`'sha256-aIqL7EE1q9wXoi4hpRs7G1lGkyaiOE5b1BnhqFG3LaY='`** (index.html is excluded from Prettier to keep it byte-stable; recompute if it ever changes). Needed hosts: `style-src https://fonts.googleapis.com` (+ `'unsafe-inline'` for React/framer inline styles), `font-src https://fonts.gstatic.com`, `img-src 'self' data: blob: https://res.cloudinary.com https://lh3.googleusercontent.com`, `connect-src` Firebase (`https://*.googleapis.com https://*.cloudfunctions.net https://securetoken.googleapis.com https://identitytoolkit.googleapis.com https://firestore.googleapis.com https://www.google-analytics.com`), `frame-src https://<project>.firebaseapp.com https://accounts.google.com https://apis.google.com`, `script-src 'self' <hash> https://apis.google.com https://www.googletagmanager.com`, `media-src 'self'` (sounds).
- Rules must match §10 exactly; index `orders(uid ASC, createdAt DESC)`.

### seed-assets

- IDs: category doc id == slug (6 `CATEGORY_SLUGS`); series doc id == slug (e.g. `hw-exotics-2026`); product docs with every `Product` field (incl. `description`, `seriesName`, `series` = series id, `images[0].url === primaryImage`, `publicId` like `hotwheelsarena/<slug>`, `currency: 'INR'`, Firestore `Timestamp` createdAt/updatedAt, `isActive: true`); `series.carIds` = product ids; reviews at `products/{id}/reviews/{uid}` with `productId, uid, displayName, photoURL, rating, text, verifiedBuyer, createdAt, updatedAt` + product `ratingAvg/ratingCount` consistent; `settings/site` = `DEFAULT_SITE_SETTINGS` + timestamps. Import shared relatively.
- Public assets referenced by code: `/favicon.svg`, `/og-image.png` (1200×630), `/placeholders/car-generic.svg`, `/placeholders/hero-car.svg`, `/placeholders/category-{sports,off-road,racing,special,rescue,limited}.svg`, per-product silhouettes under `/placeholders/`, `/sounds/{rev,click,start}.wav`. Do **not** create `public/site.webmanifest` (generated by Vite).

---

## 15. Routes & pages (as built in WF2)

Every page is `React.lazy` (its own chunk), default-exported, calls `useDocumentMeta` (title `"<Page> | HotWheelsArena"`, `noindex` on cart/checkout/orders/garage/wishlist/404/unknown series/unknown product/search) and renders exactly one `<h1>`. Feature code lives in the folder named in the last column.

| Path                                                               | Page                            | Auth | Feature folder / notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------------------------------------------------ | ------------------------------- | ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`                                                                | `HomePage`                      |      | `components/hero`, `components/home`. Sections `hero → collection → new-arrivals → featured → vault → garage → achievements → about` (ids in `home/homeSections.ts`).                                                                                                                                                                                                                                                                                                                                |
| `/shop`                                                            | `ShopPage`                      |      | `components/shop` + `config/shop.ts` + `hooks/useProductFilters.ts` — URL contract in §16. While the catalogue can't load (error state with Try again) the results heading shows a neutral `— machines` (announced "machines unavailable"; `ResultsToolbar unavailable`) and the header telemetry shows dashes with `NO SIGNAL` (`GridTelemetry unavailable`), never "Loading machines" or zero counts                                                                                               |
| `/search?q=`                                                       | `SearchPage`                    |      | same rail/grid as the shop; refinement chips from `lib/search.groupSuggestions`; blank query = recent searches + shortcuts; same neutral `— machines` heading in the error state                                                                                                                                                                                                                                                                                                                     |
| `/collections`                                                     | `CollectionsPage`               |      | `components/collections` (series cards, signed-in completion)                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `/collections/:slug`                                               | `SeriesPage`                    |      | `components/collections` (completion panel, missing cars, series grid; unknown slug → in-page "Series not found")                                                                                                                                                                                                                                                                                                                                                                                    |
| `/product/:slug`                                                   | `ProductPage`                   |      | `components/product-detail` + `components/reviews` (gallery, spec sheet, Meet the Machine + disclaimer, series card, related rail, reviews, Product + Breadcrumb JSON-LD)                                                                                                                                                                                                                                                                                                                            |
| `/vault`                                                           | `VaultPage`                     |      | `components/vault` (`?filter=&sort=` in the URL)                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `/cart`                                                            | `CartPage`                      |      | `components/cart` (`useReconciledCart` re-prices against the catalogue + settings; inline Undo row **and** an Undo toast action); START ENGINE is blocked while purchasable lines > `MAX_ORDER_LINES` (20): "An order can hold at most 20 different cars — remove N to start your engine." (`useReconciledCart().lineLimitExcess`)                                                                                                                                                                   |
| `/checkout?step=`                                                  | `CheckoutPage`                  | yes  | `components/checkout` (address → payment → review; `usePlaceOrderFlow` = payment provider + `placeOrder`); the review step shows the same line-limit alert (Place order disabled), and `usePlaceOrderFlow` refuses > 20 lines before any payment. `classifyPlaceOrderError`: `invalid-argument` → `invalid-order` (server message, payment dropped, no refresh; PaymentFailedPanel shows "Couldn't place this order" + "Back to pit stop"); `failed-precondition` / `out-of-range` → `order-changed` |
| `/checkout/success/:orderId`                                       | `OrderSuccessPage`              | yes  | `components/orders` (confetti, XP count-up, badges; data from `location.state` only when its `uid` matches the signed-in collector (`readOrderSuccessState(value, orderId, uid)`); otherwise falls back to `useOrder`)                                                                                                                                                                                                                                                                               |
| `/orders`, `/orders/:id`                                           | `OrdersPage`, `OrderDetailPage` | yes  | `components/orders`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `/garage?tab=`                                                     | `GaragePage`                    | yes  | `components/garage` (`collection` = bare `/garage`; `wishlist`, `favorites`, `achievements`, `stats`)                                                                                                                                                                                                                                                                                                                                                                                                |
| `/wishlist`                                                        | `WishlistPage`                  | yes  | `components/garage/WishlistCollection` (shared with the garage tab)                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `/about` `/contact` `/faq` `/shipping-returns` `/privacy` `/terms` | `AboutPage` … `TermsPage`       |      | `components/content` (`ContentPage` layout, TOC, FAQ accordion, mailto contact form, PIN-code checker)                                                                                                                                                                                                                                                                                                                                                                                               |
| `/new-drops`                                                       | redirect                        |      | → `/shop?view=new`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `*`                                                                | `NotFoundPage`                  |      | "Wrong turn — back to the garage" (`components/content/notfound`)                                                                                                                                                                                                                                                                                                                                                                                                                                    |

**Home hero** (`components/hero/HeroSection.tsx`, simplified at the user's request on 2026-10-08 — a deviation from spec §5.1, which asked for a GSAP scroll sequence plus a page scroll-track): a static `<section id="hero">` only as tall as its content (~470px at 1440×900, so "Choose your ride" is on screen without scrolling far). Eyebrow (`Digital garage · N machines parked`, live count, one line from 320px), the `<h1>` (`BRAND_HERO_TITLE` + `BRAND_TAGLINE`, plain markup for LCP), one line of copy, **Explore Collection** (`href="#collection"`; `scrollToSection` glides there — instant under reduced motion — and moves focus to the section, no URL hash) and **Enter the Vault** (→ `/vault`), plus one static `HeroCar` SVG (theme-aware, `aria-hidden`, inside an `aspect-[800/270]` box so it reserves its height). `HeroBackdrop` is the faint `GridBackground` and a fade to `bg`. Nothing is pinned, sticky, scroll-linked or animated. Layout: text left / car right from 1024px (the CTAs stack at one equal width between 1024 and 1279px), stacked below. There is no scroll-track or "jump to section" navigation.

**Polish pass (2026-10-08) — behaviour worth knowing:**

- **Focus is never dropped to `<body>`** when an action removes or swaps the control that had it. Targets follow one pattern: the next item's equivalent action, else a stable heading (`tabIndex=-1`), tab or empty-state CTA. Cart (empty pit stop → next Undo row or "Explore the garage"), wishlist (`data-wishlist-action` slot), garage empty states (Collection tab / ALL chip), Add-a-car dialog (one stable action button; next row or the search field when "Hide parked" removes it), missing models (next "I have it" or the series link), shop filters (§16), recent searches, `/search` "Clear search" (→ search field), contact "Write another" (→ name field), sign-out (→ navbar "Sign in"), keyboard toast dismiss (§13).
- **In-page `#hash` buttons** use `components/content/focusTarget.ts` → `focusHashTarget(id)`: after the router scrolls, focus moves to `<id>-title` (or the target, given `tabindex=-1`), so the next Tab continues from the section (Vault "Browse editions" / "Get drop alerts", `TableOfContents`). Vault "Show all editions" focuses the All filter chip (`VAULT_FILTER_GROUP_ID`).
- `ProductPage` renders `<ProductDetail key={product.id}>`, so review drafts and "show more" state never carry over between cars. `MobileDrawer` links close the drawer on click (a link to the current route changes no location).
- Checkout `AddressStep`: a new address saved during this checkout is reported as `{kind:'saved', id}`, so returning to the step selects the saved card instead of offering to save it again.
- Copy: free shipping applies at **or above** the threshold, so the meter says "orders of ₹999 or more ship free", the product page "Free shipping on orders of ₹999 or more" and the home About point "Free shipping from ₹999" (never "over ₹999"); the cart eyebrow reads "N UNITS"; the 404 page shows the path as typed (`normal-case`, `title`); stock-capped adds/moves say "Only N in stock".
- Fit: `PageHeader` h1 clamp minimum is 1.25rem (long single words like HOTWHEELSARENA no longer break at 320px); the shop's sort select gets its own full-width row below `sm`; the COLOR facet is one column from `lg` to `xl`; Choose Your Ride names step down a size at < 360px and 1024–1279px and taglines reserve their lines so titles align per row; Just Off The Track compact cards are at least 17rem; the garage teaser dial max is a multiple of 40 so labels are whole numbers; `VaultCard` hides "N% claimed" below 360px; `BadgeCard` aligns XP/progress rows and keeps locked emoji legible.

## 16. Shop / search URL contract

The URL is the single source of truth for `/shop` and `/search` (`hooks/useProductFilters.ts`), e.g. `/shop?view=premium&make=Porsche,Land+Rover&scale=1:43&price=499-1999&sort=price-asc&shown=24`.

- Params owned by the codec (`FILTER_PARAM_KEYS`): `q`, `view` (`all` default, `new`, `premium`, `limited`, `racing`, `sports`, `off-road`, `special`), `category` (any `CategorySlug`; with the All view it resolves to the matching category view — `rescue`/`limited` stay a removable chip), list facets `make`, `model`, `series`, `year`, `color`, `scale`, `rarity`, `availability` (comma lists; a literal comma is `\,`), `price=MIN-MAX` (either side optional), `sort` (`newest` default, `price-asc`, `price-desc`, `rarity`, `rating`; search adds `relevance` = default), `shown` (multiples of `PAGE_SIZE` 12).
- Defaults are omitted and unknown params (`utm_*`) are preserved. Filter, sort and load-more changes use history **replace** + `preventScrollReset`; switching view tabs **pushes**. Price-slider writes are debounced (`PRICE_DEBOUNCE_MS`). Any filter change resets `shown`.
- Deep links from other pages: `shopPath({ view, category, series, sort, q })` (`config/routes.ts`), or hand-build list params with the encoding above (e.g. `/shop?make=Porsche`).
- Focus is never dropped to `<body>` when a control removes itself: removing a filter chip focuses the next chip, else the previous one, else the results heading (`tabIndex=-1`); `ProductBrowser`'s `renderEmpty({ filtered, clearAll })` gets a `clearAll` that clears every filter **and** focuses the results heading; the rail's Clear all focuses the rail heading, the drawer's focuses "Show N cars", Reset price the minimum thumb.
- Facet checkboxes are controlled by the URL, which updates inside a router transition (`v7_startTransition`): tests must click and then assert with a retrying matcher (`await expect(box).toBeChecked()`), not Playwright's synchronous `check()`.

## 17. End-to-end tests (Playwright)

`npm run e2e` = `pree2e` (functions build) → `firebase emulators:exec --only auth,firestore,functions` → `npm run seed:emulator && playwright test`. `playwright.config.ts` starts its own dev server (`npm run dev -- --port 5173 --strictPort`, reused locally if one is already running) with emulator env + `VITE_DUMMY_PAYMENT_SUCCESS_RATE=1`.

- **Projects**: `desktop-dark` (1440×900), `desktop-light` (1440×900), `mobile` (375×812, touch). The `theme` fixture option is persisted into `hwa-prefs-v1` before first paint; `setTheme(page, theme)` switches it mid-test (the route spec re-checks every route in light on mobile).
- **Isolation**: tests share one emulator database, so each test signs in as its own collector — `signIn(page, { email: uniqueEmail(testInfo, 'label') })` uses the dev hook `window.__hwaTest.signIn` (Auth emulator, unsigned Google ID token). Only `auth.spec.ts` drives the real Google popup (Auth emulator UI: "Add new account" → "Auto-generate user information" → "Sign in with Google.com"), once, in `desktop-dark`.
- **Error guard**: the automatic `consoleGuard` fixture fails any test with a page error or a `console.error` outside `BENIGN_CONSOLE_ERRORS` (only aborted Firestore channel requests). Allow an intentional error for one test with `consoleGuard.allow(/pattern/)`.
- **Selectors**: roles and accessible names first (`getByRole('button', { name: 'Add <car> to cart' })`, `getByRole('link', { name: /^Pit stop cart/ })`); data attributes only for decorative structure (`a[data-category]`, `section#hero [data-hero="car"]`). Visually hidden radios (stars, payment cards) are clicked through their `<label>`.
- **Waiting**: `gotoRoute(page, path)` waits for the lazy route's `main h1`; never use `networkidle` (Firestore keeps a channel open).
- **axe**: `a11y.spec.ts` scans with `@axe-core/playwright` (`wcag2a`, `wcag2aa`) under reduced motion after scrolling once through the page (reveals scroll-into-view content); serious/critical violations fail; counts are attached as test annotations (`E2E_AXE_LOG=1` prints them). Besides the routes it walks a signed-in "filled pit stop" (two cars seeded with `seedCart()` → `/cart`, each checkout step with COD, the order-success page), because empty states hide most commerce UI. Exclude a rule only for a documented false positive, narrowly (`.exclude(selector)`), never globally.
- **Shell + resilience**: `routes.spec.ts` also checks the route announcer (a product-card Enter → `#route-announcer` holds the title and focus is on `#main-content`; a shop-view chip changes neither) and that the footer stays below the fold while a lazy page module is held. `reflow.spec.ts` runs at 320×640 (no sideways scroll, cart/menu buttons on screen) and checks the wordmark is visible at 375. `resilience.spec.ts` refuses the Firestore emulator (`page.route` abort of `:8080`): `/shop` and `/product/…` must show Engine trouble + Try again (never the empty grid, a 404 or `noindex`) and recover via Try again once unblocked (retried while the SDK's reconnect backoff runs).
- **Helpers** (`fixtures.ts`): `signIn`, `uniqueEmail`, `gotoRoute`, `setTheme`, `cartButton`, `addProductToCart`, `seedCart` (writes `hwa-cart-v1` directly), `fillAddress`, `choosePaymentMethod`, `expectSingleH1`, `expectNoHorizontalOverflow`.
- Artifacts: traces + screenshots on failure under `test-results/e2e/`, HTML report in `playwright-report/` (both gitignored). CI (`CI=1`): 1 worker, 1 retry, `forbidOnly`.
