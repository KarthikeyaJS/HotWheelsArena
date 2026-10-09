# HotWheelsArena — the Digital Collector's Garage

> **Every Hot Wheels car is a collectible machine, not just a product.**

HotWheelsArena is a production-grade e-commerce and collector-experience web app for Indian Hot Wheels collectors. It looks and feels like an underground racing garage: shopping becomes collecting, and every purchase feeds a virtual garage with XP, levels and badges.

It is a React 18 + Vite + TypeScript single-page app on Firebase (Google sign-in, Cloud Firestore, callable Cloud Functions in `asia-south1`, Hosting), with Cloudinary for images. **Payments are simulated (test mode)** behind a provider interface, so a real gateway can be added later.

---

## Contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Folder structure](#folder-structure)
- [Prerequisites](#prerequisites)
- [Quick start (no Firebase project needed)](#quick-start-no-firebase-project-needed)
- [npm scripts](#npm-scripts)
- [Environment variables](#environment-variables)
- [Firebase setup (real project)](#firebase-setup-real-project)
- [Seeding a live project](#seeding-a-live-project)
- [Granting the admin custom claim](#granting-the-admin-custom-claim)
- [Cloudinary](#cloudinary)
- [Payments (test mode)](#payments-test-mode)
- [Data model](#data-model)
- [Security model](#security-model)
- [Gamification rules](#gamification-rules)
- [Hosting, caching and CSP](#hosting-caching-and-csp)
- [Testing](#testing)
- [CI/CD (GitHub Actions)](#cicd-github-actions)
- [Troubleshooting](#troubleshooting)
- [Out of scope and extension points](#out-of-scope-and-extension-points)
- [Disclaimer](#disclaimer)

---

## Features

- **Digital Garage design system**: black/white foundation with orange (`#FF5A00`) reserved for interaction. Dark "garage" theme and light "showroom" theme, both AA-contrast. Orbitron / Inter / JetBrains Mono. CRT scanlines, racing HUD readouts, metallic cards and racing-stripe hovers, all toned down under `prefers-reduced-motion`.
- **Home**: a calm static hero (headline, two CTAs and the hero car on a faint garage grid), "Choose Your Ride" category garage, "Just Off The Track" rail, featured grid, the Collector's Vault (numbered limited editions such as `#001/500`), a garage teaser, achievements preview and newsletter. The original scroll-driven hero sequence and page scroll-track were removed at the user's request (2026-10-08).
- **Shop and search**: client-side filters (make, model, series, year, colour, scale, ₹ price range, rarity, availability) and sorting over a cached catalogue. <kbd>Ctrl</kbd>/<kbd>⌘</kbd>+<kbd>K</kbd> command palette with grouped make → model suggestions and recent searches.
- **Product detail**: gallery with 3D tilt, spec table, "Meet the Machine" themed stat bars, related cars, reviews (signed-in collectors), SEO title/meta and JSON-LD.
- **Pit Stop cart and checkout**: GST-inclusive totals, free-shipping progress, Indian address validation (phone, PIN code, state), test-mode payments (card / UPI / COD). Orders are priced and created **only** by the `placeOrder` Cloud Function.
- **My Garage**: owned cars (manual or auto-added after purchase), favourites, duplicates tracker, missing cars per series, collection value, wishlist, achievements and stats.
- **Gamification**: 25 collector levels, XP for orders and badges, five badges (First Ride, Speed Demon, Treasure Hunter, Garage Builder, Master Collector), awarded server-side with live unlock toasts.
- **Performance and accessibility**: route-level code splitting (zod stays out of the ~60 kB gzip entry chunk); metric-matched local fallbacks for the web fonts (`src/styles/fonts.css`) so the font swap moves nothing; Lighthouse desktop 95 on Home (median of three runs after the hero was simplified, 2026-10-09) and 96–97 on Shop and a product page, CLS ≤ 0.003, and 100 for accessibility, best practices and SEO (production build against the emulators). Route changes are announced to screen readers, the layout reflows at 320 px, and axe finds no serious issues in either theme.
- **Admin-ready backend**: admin custom claim, every admin-editable document in Firestore with `createdAt`/`updatedAt` and `isActive` soft-delete flags, strict security rules with 320+ emulator tests.

## Tech stack

| Layer          | Choice                                                                                                               |
| -------------- | -------------------------------------------------------------------------------------------------------------------- |
| UI             | React 18.3, TypeScript 5.9 (strict), Vite 5.4, Tailwind CSS 3.4 (CSS-variable tokens, `darkMode: "class"`)           |
| Motion         | Framer Motion 11 for UI animation only (GSAP removed at the user's request on 2026-10-08), CSS transitions           |
| Routing, state | React Router 6.30 (data router, lazy routes), Zustand 5 (cart, UI prefs, garage mirror, toasts)                      |
| Data           | TanStack Query 5 (every Firestore read and mutation), Zod 3 (shared validation), React Hook Form 7                   |
| Firebase       | Firebase JS SDK 10.14 (modular): Auth (Google only), Firestore, callable Functions, Hosting, optional Analytics      |
| Backend        | Cloud Functions for Firebase (TypeScript, Node.js 22, region `asia-south1`), firebase-functions 7, firebase-admin 13 |
| Images         | Cloudinary delivery URLs (`f_auto,q_auto`), local SVG fallbacks                                                      |
| Tooling        | ESLint 9 (flat config), Prettier 3, Vitest 3, `@firebase/rules-unit-testing`, firebase-tools 15, tsx                 |

## Architecture

```
Browser (React SPA on Firebase Hosting)
 ├─ TanStack Query hooks ── Firestore (public catalogue reads, own user data, own orders)
 ├─ Firebase Auth (Google popup → redirect fallback)
 └─ httpsCallable ───────── Cloud Functions (asia-south1)
                              ├─ ensureUserProfile   profile bootstrap (idempotent)
                              ├─ placeOrder          server pricing, payment verification, order + garage + XP in one transaction
                              ├─ submitReview        one review per collector, exact rating aggregates
                              ├─ subscribeNewsletter deduplicated, rate-limited sign-up
                              ├─ onUserCreate        Auth trigger → profile bootstrap
                              └─ onGarageWrite       garage changes → stats, badges, XP, level
shared/  pure TypeScript used by BOTH sides: domain types, zod schemas, gamification rules, commerce totals
```

- The client **never** writes orders, XP, levels, badges, stats, reviews or newsletter entries. Security rules enforce this and Cloud Functions do the writing.
- Client and server compute totals with the same `computeOrderTotals()` from `shared/commerce.ts`, so the test payment amount always equals the server total.
- The catalogue (36 cars) is fetched once and filtered client-side. The only realtime listener is the signed-in user's own profile, so XP and badges appear live.

The binding contract (every export, token, hook, store, write shape and component API) lives in **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**.

## Folder structure

```
.
├─ .github/workflows/        CI checks, deploy on merge to main, PR preview channels
├─ docs/ARCHITECTURE.md      architecture contract
├─ functions/                Cloud Functions package (own package.json and node_modules)
│  └─ src/
│     ├─ callables/          ensureUserProfile, placeOrder, submitReview, subscribeNewsletter
│     ├─ triggers/           onUserCreate (Auth, 1st gen), onGarageWrite (Firestore, 2nd gen)
│     ├─ payments/           server-side payment verifier registry (dummy provider)
│     ├─ lib/                pure domain logic (pricing, orders, stats, reviews, rate limits) + unit tests
│     └─ index.ts            the six deployed functions
├─ public/                   static files copied verbatim (placeholders/, favicon, OG image)
├─ scripts/                  seed + verify-seed, set-admin, e2e smoke test, image generators, dev/snap.mjs (see scripts/README.md)
├─ shared/                   pure TS shared by web + functions (types, schemas, gamification, commerce, india)
├─ src/
│  ├─ components/            ui/, layout/, product/, gamification/, common/ and feature folders
│  ├─ config/                brand.ts (all brand strings), env.ts, firebase.ts, payment.ts, routes.ts, …
│  ├─ dev/                   dev-only emulator test hooks (never in production builds)
│  ├─ hooks/                 TanStack Query hooks and utility hooks
│  ├─ lib/                   cn, cloudinary, format (₹), queryKeys, seo, animations, …
│  ├─ pages/                 route components (lazy-loaded)
│  ├─ providers/             QueryClient, Auth, theme and cross-tab sync
│  ├─ services/              firestore/, payment/, auth.ts, functions.ts
│  ├─ store/                 Zustand stores
│  ├─ styles/                tokens.css (both themes), globals.css
│  └─ router.tsx             routes
├─ tests/rules/              Firestore security-rules tests + deploy-config drift tests
├─ tests/e2e/                Playwright end-to-end suite (+ fixtures.ts helpers); config in playwright.config.ts
├─ firebase.json             Hosting, Firestore, Functions, Emulators
├─ firestore.rules           security rules
├─ firestore.indexes.json    composite indexes + TTL policy
├─ .firebaserc               default project: demo-hotwheelsarena (emulator-only)
├─ .env.example              every VITE_* variable, documented
└─ index.html                app shell (inline no-flash theme script, see CSP)
```

## Prerequisites

- **Node.js 22 LTS** (recommended: it matches the Cloud Functions runtime, and the Functions emulator runs your functions on the host's Node) and npm 10. The web tooling alone also runs on Node 20.
- **Java 21 or newer** (a JDK, e.g. Temurin 21). The Firestore emulator needs it, both for `npm run emulators` and for `npm run test:rules`.
- **firebase-tools**: already a devDependency, so use `npx firebase …`. A global `npm i -g firebase-tools` works too.
- A Google account. For production you also need a Firebase project on the **Blaze** plan (Cloud Functions requirement) and optionally a Cloudinary account.

## Quick start (no Firebase project needed)

The Emulator Suite runs Auth, Firestore, Functions and Hosting locally under the demo project id `demo-hotwheelsarena`. Demo projects need no Google Cloud project and no credentials.

```bash
# 1. Install dependencies (web app + Cloud Functions)
npm install --include=dev
npm --prefix functions ci --include=dev

# 2. Compile the functions once (the emulator loads functions/lib)
npm run functions:build

# 3. Terminal 1: start the emulators (Auth 9099, Firestore 8080, Functions 5001, Hosting 5000, UI 4000)
npm run emulators

# 4. Terminal 2: seed categories, series, 36 cars, reviews and settings/site
npm run seed:emulator

# 5. Terminal 3: start the storefront
npm run dev
```

Open <http://localhost:5173> and click **Sign in**. The Auth emulator opens a fake Google sign-in popup: choose **Add new account**, then **Auto-generate user information** (or type a name and email), then **Sign in with Google.com**. Your profile is created by `ensureUserProfile` / `onUserCreate`, so you can park cars, check out with test payments and watch XP and badges arrive.

- **No `.env` file is needed.** Without `VITE_FIREBASE_PROJECT_ID` the app falls back to `demo-hotwheelsarena` and connects to the emulators automatically. To be explicit, create `.env.local` with:

  ```ini
  VITE_FIREBASE_API_KEY=demo-api-key
  VITE_FIREBASE_AUTH_DOMAIN=demo-hotwheelsarena.firebaseapp.com
  VITE_FIREBASE_PROJECT_ID=demo-hotwheelsarena
  VITE_USE_EMULATORS=true
  ```

- Emulator UI: <http://127.0.0.1:4000> (browse Firestore data, Auth users and function logs).
- Emulator data is wiped when the emulators stop. To keep it between runs, start them with `npx firebase emulators:start --project demo-hotwheelsarena --import=./emulator-data --export-on-exit` (`emulator-data/` is gitignored).
- Editing functions? Run `npm --prefix functions run build:watch` in another terminal; the emulator reloads the compiled code.
- If this machine exports `NODE_ENV=production`, npm silently skips devDependencies, which is why the commands above pass `--include=dev` (harmless elsewhere).
- **Don't run `npm --prefix functions install` without a package name.** npm 10 then installs the _root_ package into `functions/` as a `"hotwheelsarena": "file:.."` dependency (plus a junction/symlink back to the repo). Use `npm --prefix functions ci --include=dev`, or run `npm install --include=dev` from inside `functions/`.
- Want the whole backend checked in one go? `npm run smoke` builds the functions, boots the Auth, Firestore and Functions emulators, seeds them and runs the end-to-end smoke test (see [Testing](#testing)).

## npm scripts

| Script                            | What it does                                                                                                                        |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `npm run dev`                     | Vite dev server on <http://localhost:5173>                                                                                          |
| `npm run build`                   | `typecheck` + production build into `dist/`                                                                                         |
| `npm run preview`                 | Serves `dist/` with Vite (does **not** apply the `firebase.json` headers)                                                           |
| `npm run typecheck`               | `tsc -b` over the web app, `shared/`, scripts, rules + e2e tests and configs                                                        |
| `npm run lint` / `lint:fix`       | ESLint (flat config)                                                                                                                |
| `npm run format` / `format:check` | Prettier write / check                                                                                                              |
| `npm test` / `test:watch`         | Vitest unit tests for `src/` (jsdom) and `shared/` (node)                                                                           |
| `npm run test:rules`              | Starts the Firestore emulator and runs `tests/rules/**` (security rules + deploy-config drift checks)                               |
| `npm run emulators`               | Starts every emulator in `firebase.json` for `demo-hotwheelsarena`                                                                  |
| `npm run seed`                    | Seeds a **live** project (service account required, see below)                                                                      |
| `npm run seed:emulator`           | Seeds the local Firestore emulator                                                                                                  |
| `npm run seed:verify`             | Reads a seeded database back and checks it against the catalogue (`-- --emulator` or `-- --project <id>`)                           |
| `npm run set-admin`               | Grants/revokes/checks the `admin` custom claim (`-- --email you@example.com [--emulator] [--revoke]`)                               |
| `npm run images` / `images:check` | Regenerates the placeholder SVGs, favicon and OG card / fails if any is missing or stale                                            |
| `npm run snap`                    | Playwright screenshot of a dev-server route + console errors and 375px overflow (`-- --help`)                                       |
| `npm run functions:build`         | Compiles `functions/` to `functions/lib/`                                                                                           |
| `npm run smoke`                   | End-to-end smoke test: builds functions (`presmoke`), boots Auth/Firestore/Functions emulators, seeds, runs `scripts/smoke-e2e.mjs` |
| `npm run e2e`                     | Playwright browser suite: builds functions (`pree2e`), boots Auth/Firestore/Functions emulators, seeds, runs `playwright test`      |
| `npm run e2e:ui`                  | Playwright UI mode for debugging (start `npm run emulators` + `npm run seed:emulator` first)                                        |
| `npm run e2e:report`              | Opens the last Playwright HTML report (`playwright-report/`)                                                                        |
| `npm run deploy`                  | `build`, then `firebase deploy` (Hosting, Firestore rules and indexes, Functions) to the active project                             |

Inside `functions/`: `build`, `build:watch`, `typecheck`, `test`, `serve` (build + Auth/Firestore/Functions emulators), `shell`, `deploy`, `logs`.

Seeding, admin claims, the smoke test, screenshots and asset generation are documented in detail in [`scripts/README.md`](scripts/README.md); the Cloud Functions in [`functions/README.md`](functions/README.md); the frontend contract in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Environment variables

Vite embeds every `VITE_*` value in the client bundle, so **never put secrets in them**. `.env.example` documents all of them. Invalid values fall back to safe defaults instead of crashing the app (`src/config/env.ts`).

| Variable                            | Default when empty                      | Purpose                                                                                                                 |
| ----------------------------------- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `VITE_FIREBASE_API_KEY`             | `demo-api-key`                          | Web API key (public identifier, not a secret)                                                                           |
| `VITE_FIREBASE_AUTH_DOMAIN`         | `<projectId>.firebaseapp.com`           | Domain that serves the Auth helper (`/__/auth/*`)                                                                       |
| `VITE_FIREBASE_PROJECT_ID`          | `demo-hotwheelsarena`                   | Project id. A `demo-*` id turns the emulators on unless overridden                                                      |
| `VITE_FIREBASE_STORAGE_BUCKET`      | `<projectId>.appspot.com`               | Part of the web config (Firebase Storage itself is not used)                                                            |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `000000000000`                          | Part of the web config                                                                                                  |
| `VITE_FIREBASE_APP_ID`              | placeholder                             | Web app id                                                                                                              |
| `VITE_FIREBASE_MEASUREMENT_ID`      | (none)                                  | `G-…` id, only needed for Analytics                                                                                     |
| `VITE_USE_EMULATORS`                | `true` for `demo-*` ids, else `false`   | Connect Auth/Firestore/Functions to the local emulators                                                                 |
| `VITE_EMULATOR_HOST`                | `127.0.0.1`                             | Emulator host (ports are fixed in `shared/constants.ts`)                                                                |
| `VITE_FUNCTIONS_REGION`             | `asia-south1`                           | Region of the callable functions                                                                                        |
| `VITE_CLOUDINARY_CLOUD_NAME`        | (none): local SVG placeholders are used | Cloudinary cloud name                                                                                                   |
| `VITE_PAYMENT_PROVIDER`             | `dummy`                                 | Payment provider id (`razorpay` is reserved)                                                                            |
| `VITE_DUMMY_PAYMENT_SUCCESS_RATE`   | `0.9`                                   | Test mode only: approval probability (0–1) of simulated card/UPI payments; the e2e suite uses `1` (COD always succeeds) |
| `VITE_ENABLE_ANALYTICS`             | `false`                                 | Firebase Analytics (never initialised on the emulators)                                                                 |
| `VITE_SITE_URL`                     | current origin                          | Absolute URLs for canonical links, Open Graph and JSON-LD (no trailing `/`)                                             |

Cloud Functions read one runtime flag from `functions/.env` or `functions/.env.<projectId>` (standard Firebase dotenv files):

| Variable              | Default | Purpose                                                                                   |
| --------------------- | ------- | ----------------------------------------------------------------------------------------- |
| `ALLOW_TEST_PAYMENTS` | `true`  | Accept dummy/test-mode payments. Set to `false` once a live gateway verifier is in place. |

**Which env file wins?** Vite loads `.env` < `.env.local` < `.env.[mode]` < `.env.[mode].local`, and real environment variables override all of them. `npm run build` runs in `production` mode, so put the real project config in **`.env.production.local`**. Your emulator `.env.local` keeps working for `npm run dev`, and production builds never point at the emulators by accident.

## Firebase setup (real project)

Console menus move around between Firebase releases. Where two paths are given, the first is the current layout and the second the older one.

### 1. Create the project

1. Open <https://console.firebase.google.com> and click **Create a project** (or **Add project**).
2. Enter a name such as `HotWheelsArena`. Note the generated **project id** (for example `hotwheelsarena-1a2b3`); you will need it everywhere below.
3. Google Analytics is optional. Enable it only if you plan to set `VITE_ENABLE_ANALYTICS=true`. Click **Create project**.

### 2. Enable Google sign-in

1. **Security → Authentication** (older: **Build → Authentication**), then **Get started**.
2. **Sign-in method** tab → **Google** → toggle **Enable**.
3. Choose a **Project support email** and click **Save**.
4. Optional: set **Project settings → General → Public-facing name** to `HotWheelsArena`. The Google consent screen shows it.

### 3. Create Cloud Firestore in asia-south1

1. **Databases & Storage → Firestore** (older: **Build → Firestore Database**), then **Create database**.
2. If asked for an edition, choose **Standard edition**. Keep the database id `(default)`.
3. Location: **`asia-south1` (Mumbai)**. This cannot be changed later, and the functions run in the same region.
4. Choose **Start in production mode** (deny-all). The rules in this repo replace it on deploy. Click **Create**.

> `firebase.json` pins `"location": "asia-south1"`. If you skip this step, `firebase deploy --only firestore` creates the database for you, in asia-south1 rather than the CLI's default `nam5`.

### 4. Upgrade to the Blaze plan (required for Cloud Functions)

1. Click **Upgrade** next to the plan name (bottom of the left menu), or open **Project settings → Usage and billing**.
2. Select **Blaze (pay as you go)** and link or create a Cloud Billing account.
3. Recommended: add a **budget alert** (for example ₹500). Low-traffic usage of this app normally stays inside the free tier, but Cloud Build and Artifact Registry storage for functions can cost a little.

Cloud Functions (and the Cloud Build / Artifact Registry / Cloud Run / Eventarc APIs they use) are only available on Blaze. The first functions deploy enables those APIs for you.

### 5. Register the web app and configure the env

1. **Project Overview** (home) → **Add app** → the **Web** (`</>`) icon.
2. Enter a nickname (`hotwheelsarena-web`). You do not need to tick "Also set up Firebase Hosting", since `firebase.json` is already configured. Click **Register app**.
3. Copy the `firebaseConfig` values. You can find them later under **Project settings → General → Your apps → SDK setup and configuration → Config**.
4. Create **`.env.production.local`** (gitignored) for production builds:

   ```ini
   VITE_FIREBASE_API_KEY=AIza...            # apiKey
   VITE_FIREBASE_AUTH_DOMAIN=<project-id>.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=<project-id>
   VITE_FIREBASE_STORAGE_BUCKET=<project-id>.firebasestorage.app
   VITE_FIREBASE_MESSAGING_SENDER_ID=1234567890
   VITE_FIREBASE_APP_ID=1:1234567890:web:abc123
   VITE_FIREBASE_MEASUREMENT_ID=            # G-XXXX, only with Analytics
   VITE_USE_EMULATORS=false
   VITE_FUNCTIONS_REGION=asia-south1
   VITE_CLOUDINARY_CLOUD_NAME=              # see Cloudinary below
   VITE_PAYMENT_PROVIDER=dummy
   VITE_ENABLE_ANALYTICS=false
   VITE_SITE_URL=https://<project-id>.web.app
   ```

   To run `npm run dev` against the real project instead of the emulators, put the same values in `.env.local` (with `VITE_USE_EMULATORS=false`).

### 6. Connect the Firebase CLI

```bash
npx firebase login
npx firebase use --add        # pick your project, give it the alias "prod"
npx firebase use prod         # make it the active project for this folder
```

`.firebaserc` keeps `demo-hotwheelsarena` as the `default` project. The emulator scripts always pass `--project demo-hotwheelsarena`, so they never touch production. `firebase use --add` adds a `prod` alias. Alternatively, replace the `default` id in `.firebaserc` with your project id; the emulator scripts keep working because they pass the demo id explicitly.

### 7. `firebase init` is not needed

`firebase.json`, `.firebaserc`, `firestore.rules`, `firestore.indexes.json` and the `functions/` package are committed and ready. If you run `firebase init` anyway:

- Select **Firestore, Functions, Hosting, Emulators** and **use an existing project**.
- Firestore: keep `firestore.rules` and `firestore.indexes.json`, and answer **No** to overwriting either file.
- Functions: **TypeScript**, and answer **No** to overwriting `functions/package.json`, `functions/tsconfig.json`, `functions/src/index.ts` and any lint config. Do not install dependencies from the wizard.
- Hosting: public directory **`dist`**, single-page app **Yes**, automatic GitHub builds **No** (the workflows already exist), overwrite `dist/index.html` **No**.
- Emulators: Auth, Functions, Firestore, Hosting, with the ports already in `firebase.json` (9099, 5001, 8080, 5000, UI 4000).

Afterwards, run `git diff` and revert anything the wizard changed.

### 8. Deploy

Deploy the backend first, then the web app:

```bash
# Firestore security rules + indexes (+ the rateLimits TTL policy)
npx firebase deploy --only firestore

# Cloud Functions (predeploy compiles functions/ automatically)
npx firebase deploy --only functions

# Web app: build with .env.production.local, then upload dist/
npm run build
npx firebase deploy --only hosting
```

Or run everything at once with `npm run deploy` (`build` + `firebase deploy`).

- The first functions deploy takes several minutes while it enables APIs. If the CLI asks about an **Artifact Registry cleanup policy**, accept it (for example 1 day) so old container images don't pile up.
- The 2nd-gen Firestore trigger (`onGarageWrite`) uses Eventarc. A first deploy sometimes fails with "permissions are still propagating". Wait a few minutes and deploy again.
- New composite indexes build in the background, and queries fail with "requires an index" until they finish (see **Firestore → Indexes**).
- Your site is live at `https://<project-id>.web.app` and `https://<project-id>.firebaseapp.com`.

### 9. Authorized domains for sign-in

**Authentication → Settings → Authorized domains** lists the domains allowed to start Google sign-in. `localhost`, `<project-id>.web.app` and `<project-id>.firebaseapp.com` are there by default. Add every **custom domain** (for example `hotwheelsarena.in`) with **Add domain**. The PR preview workflow adds preview-channel domains automatically (see [CI/CD](#cicd-github-actions)).

## Seeding a live project

The seed script writes the catalogue with the Admin SDK, so it needs a service-account key.

1. **Project settings → Service accounts → Firebase Admin SDK → Generate new private key**. Save the JSON **outside the repository** (for example `~/keys/hwa-admin.json`). Never commit it; `service-account*.json` is gitignored as a safety net.
2. Point Application Default Credentials at it and run the seed:

   ```bash
   # macOS / Linux / Git Bash
   export GOOGLE_APPLICATION_CREDENTIALS="$HOME/keys/hwa-admin.json"
   # Windows PowerShell
   $env:GOOGLE_APPLICATION_CREDENTIALS = "C:\keys\hwa-admin.json"

   npm run seed -- --dry-run                                # validate the catalogue and print the plan (no Firebase connection)
   npm run seed -- --project <project-id>                   # write 6 categories, 6 series, 36 cars + reviews, settings/site
   npm run seed -- --project <project-id> --reset --yes     # delete the seeded collections first, then seed
   npm run seed -- --help                                   # every flag
   ```

Document ids are deterministic, so re-running the seed is idempotent. Every catalogue invariant is validated before the first write. `--reset` deletes only the seeded collections (products with their reviews, categories, series, settings) and, against a live project, refuses to run without `--yes`.

`npm run seed:emulator` runs the same script with `--emulator` (the emulator at `FIRESTORE_EMULATOR_HOST`, else `127.0.0.1:8080`, project `demo-hotwheelsarena`). Use `npm run seed -- --emulator --reset` to start over locally. The seed never touches users or orders; those come from real sign-ins and checkouts.

## Granting the admin custom claim

Admin rights come from a custom claim, `admin: true`, never from a Firestore field. Only admins can write products, categories, series, settings and order status.

```bash
# live project (uses GOOGLE_APPLICATION_CREDENTIALS, as for seeding)
npm run set-admin -- --email you@example.com --project <project-id>

# local Auth emulator (sign in once first so the account exists)
npm run set-admin -- --email you@example.com --emulator

# remove it again / only print the current claims
npm run set-admin -- --email you@example.com --emulator --revoke
npm run set-admin -- --email you@example.com --emulator --check
```

The `--` matters: it stops npm from treating `--email` / `--emulator` as its own options. `npm run set-admin -- --help` lists every flag (see also [`scripts/README.md`](scripts/README.md)).

The claim reaches the browser with the next ID token. **Sign out and back in** (or wait up to an hour). The storefront has no admin UI; the claim exists for the future admin site that will share this project.

## Cloudinary

Product images are served from Cloudinary when a cloud name is configured. Otherwise the bundled SVG placeholders in `public/placeholders/` are used, so the app works either way.

1. Sign up at <https://cloudinary.com> and copy your **Cloud name** from the dashboard.
2. Upload car photos with public ids that match the seed data: **`hotwheelsarena/cars/<slug>`** for the primary image and `hotwheelsarena/cars/<slug>-2`, `-3`, … for extra gallery images (slugs are in `scripts/data/products.ts`). In the Media Library, create the folder `hotwheelsarena/cars` and set each asset's public id, or upload with the Upload API or CLI, passing `public_id`.
3. Set `VITE_CLOUDINARY_CLOUD_NAME=<cloud-name>` and rebuild.

URLs are built by `cl(publicId, { w, h, crop })` in `src/lib/cloudinary.ts` as `https://res.cloudinary.com/<cloud>/image/upload/f_auto,q_auto,c_fill,w_…,h_…/<publicId>`. If a Cloudinary image fails to load, `<CarImage>` falls back to the local placeholder.

**Uploads**: the storefront never uploads. The future admin site should use **signed uploads**: a callable function signs upload parameters with the Cloudinary API secret (kept in Secret Manager via `defineSecret`) and the browser uploads directly to Cloudinary. This is left as a stub note by design.

## Payments (test mode)

Checkout runs in **TEST MODE** (a banner says so). No real money moves and no card details are collected.

- **Client**: `src/services/payment/PaymentProvider.ts` defines the `PaymentProvider` interface (`createPayment(request) → Promise<PaymentResult>`). `DummyPaymentProvider` simulates about 2 s of processing and succeeds about 90% of the time (COD always succeeds; tune it with `VITE_DUMMY_PAYMENT_SUCCESS_RATE`, e.g. `1` for deterministic demos and e2e runs or `0` to rehearse declines). Its transaction ids look like `test_` + 20 hex characters. The active provider comes from `VITE_PAYMENT_PROVIDER` via `getPaymentProvider()` in `src/config/payment.ts`.
- **Server**: `placeOrder` re-prices the cart from Firestore and verifies the payment result with the verifier registered for its provider (`functions/src/payments/`). The dummy verifier requires `status: 'success'`, `mode: 'test'`, a well-formed transaction id and **amount = server total** (otherwise "Prices changed — review your pit stop."). It only accepts test payments while `ALLOW_TEST_PAYMENTS` is `true`. Each transaction id can create one order: replays return the original result (`processedPayments/{provider}_{transactionId}`).

**Adding Razorpay later** takes three changes:

1. **Client**: implement `RazorpayProvider implements PaymentProvider` (create the Razorpay order through a callable, open Checkout, map the result to `PaymentResult`) and register it in `PROVIDER_FACTORIES` in `src/config/payment.ts`.
2. **Server**: add a `razorpay` verifier in `functions/src/payments/` that checks the `razorpay_signature` HMAC with the key secret (Secret Manager) and fetches the payment amount from Razorpay.
3. **Config**: set `VITE_PAYMENT_PROVIDER=razorpay` (and `ALLOW_TEST_PAYMENTS=false`).

Also extend the CSP for Razorpay Checkout, typically `https://checkout.razorpay.com` in `script-src` and `https://api.razorpay.com` in `frame-src` and `connect-src` (see [CSP](#hosting-caching-and-csp)).

## Data model

Client models convert Firestore `Timestamp`s to epoch milliseconds. The full field documentation is in `shared/types.ts` and [docs/ARCHITECTURE.md §5](docs/ARCHITECTURE.md).

```
products/{productId}                 public read · admin write
  slug, name, description, make, model, series (series id), seriesName, seriesNumber, collectionNumber,
  year, scale, color, material, vehicleType, category, rarity, rarityScore, collectorScore,
  themedStats { topSpeedKmh, powerHp }, price (₹, GST-inclusive), compareAtPrice, currency: "INR",
  stock (static counter), limitedEdition { editionNumber, editionSize } | null,
  images [{ publicId, url, alt }], primaryImage, ratingAvg, ratingCount, tags[],
  isNew, isFeatured, isVault, isActive, createdAt, updatedAt
  └─ reviews/{uid}                   public read · written by submitReview only
       productId, uid, displayName (sanitised), photoURL (Google avatar or null), rating (1–5), text,
       verifiedBuyer, createdAt, updatedAt
categories/{slug}                    name, slug, icon, order, description, isActive, createdAt, updatedAt
series/{slug}                        name, slug, year, totalCars, carIds[], description, isActive, createdAt, updatedAt
settings/site                        shippingThreshold, shippingFee, taxRate, taxInclusive, showGstLine,
                                     codEnabled, maxQtyPerItem, createdAt, updatedAt
users/{uid}                          owner read · created by functions
  uid, displayName, email, photoURL, xp, level, badges[], role: "customer",
  stats { carsOwned, uniqueCars, seriesCompleted, ordersPlaced, racingCars, rareCars, totalSpent },
  statsSyncedAt (functions only: last full stats recompute), createdAt, updatedAt
  ├─ addresses/{addressId}           name, phone, pincode, line1, line2, landmark, city, state, isDefault, createdAt, updatedAt
  ├─ garage/{productId}              productId, addedAt, source ("purchase" | "manual"), isFavorite, quantity
  └─ wishlist/{productId}            productId, addedAt
orders/{orderId}                     owner read · created by placeOrder only
  uid, items [{ productId, slug, name, price, qty, image }], subtotal, shipping, tax, total, currency,
  address {…}, status ("placed" | "processing" | "shipped" | "delivered" | "cancelled"),
  payment { provider, status, transactionId, mode: "test" }, paymentMethod, xpEarned, badgesUnlocked[],
  createdAt, updatedAt
newsletter/{sha256(email)}           functions only: email, createdAt, updatedAt
rateLimits/{hash}                    functions only: fixed-window counters, expiresAt (TTL policy)
processedPayments/{provider_txn}     functions only: payment idempotency markers
```

**Schema extensions beyond the original brief:**

- `garage` docs have `productId` and `quantity` (1–99). Quantity powers the duplicates tracker.
- `wishlist` docs have `productId`.
- `users` have `updatedAt`, and `users.stats` has 7 counters: `carsOwned` (sum of quantities), `uniqueCars`, `seriesCompleted`, `ordersPlaced`, `racingCars`, `rareCars`, `totalSpent` (₹).
- `orders` have `xpEarned`, `badgesUnlocked`, `items[].slug` and `paymentMethod`.
- `reviews` have `photoURL`, `verifiedBuyer` and `updatedAt`. The review id is the reviewer's uid, so there is one review per collector per product.
- `settings/site` holds `{ shippingThreshold: 999, shippingFee: 79, taxRate: 0.18, taxInclusive: true, showGstLine: true, codEnabled: true, maxQtyPerItem: 10 }`. The app falls back to these defaults when the document is missing.
- `products` have `description` and `seriesName`. `categories` and `series` have `description`.

**Indexes** (`firestore.indexes.json`, derived from the real queries in `src/services/firestore/*` and `functions/src/**`):

| Index                                       | Why                                                                                                                                 |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `orders`: `uid ASC, createdAt DESC`         | "My orders": `where('uid', '==', me).orderBy('createdAt', 'desc')` in `fetchOrders()`                                               |
| TTL on `rateLimits.expiresAt` (not indexed) | Firestore deletes expired rate-limit counters automatically. The field is excluded from indexing, as recommended for TTL timestamps |

Every other query uses equality filters only (`isActive == true`, `slug ==` + `isActive ==`, `uid ==` + `limit` in `submitReview`) or a single-field `orderBy` (reviews by `createdAt`). Firestore's automatic single-field indexes serve those.

## Security model

- **Default deny.** `firestore.rules` lists every readable or writable path explicitly and ends with a catch-all deny.
- **Identity**: `isSignedIn()`, `isOwner(uid)`, and `isAdmin()` (`request.auth.token.admin == true`, a custom claim; a `role` field in a document grants nothing).
- **Validated client writes**: exact key sets, types, sizes, server timestamps (`== request.time`) and immutable fields, mirroring the write shapes in `src/services/firestore/*.ts` and the zod `AddressSchema`.

| Path                                                           | Client access                                                                                                                                                                                                                                                                                              |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `products`, `categories`, `series`, `settings`                 | Public read (including inactive products, which garage views fetch by id). Write: admin claim only                                                                                                                                                                                                         |
| `products/{id}/reviews`                                        | Public read. No client writes: `submitReview` writes reviews and keeps rating aggregates exact                                                                                                                                                                                                             |
| `users/{uid}`                                                  | Owner (and admin) read. No client create or delete. Owner may update only `displayName` (1–80 chars, no control / zero-width-space / bidi characters; ZWNJ/ZWJ allowed), `photoURL` (https or null) and `updatedAt`; `xp`, `level`, `badges`, `stats`, `statsSyncedAt`, `role`, `email` are function-owned |
| `users/{uid}/addresses`                                        | Owner CRUD with Indian-format validation: phone `^[6-9]\d{9}$`, PIN `^[1-9]\d{5}$`, one of 36 states/UTs, size limits, no control / zero-width-space / bidi characters in the text fields (ZWNJ/ZWJ allowed), server timestamps, `createdAt` immutable                                                     |
| `users/{uid}/garage/{productId}`                               | Owner read and delete. Create only `{ productId == doc id, addedAt == request.time, source: 'manual', isFavorite, quantity 1–99 }` for an existing product. Update only `isFavorite` and `quantity`                                                                                                        |
| `users/{uid}/wishlist/{productId}`                             | Owner read and delete. Create only `{ productId == doc id, addedAt == request.time }` for an existing product. No updates                                                                                                                                                                                  |
| `orders`                                                       | Owner get and list (queries must filter `uid == me`), admin read. No client create or delete. Admin may change only `status` (+ `updatedAt`)                                                                                                                                                               |
| `newsletter`, `rateLimits`, `processedPayments`, anything else | No client access                                                                                                                                                                                                                                                                                           |

- **Server-side authority**: `placeOrder` validates the cart against Firestore prices, `isActive` and stock (stock is checked, never decremented), recomputes totals, verifies the payment amount, and writes the order, purchased garage entries, XP, badges and stats in **one transaction**, idempotent per payment. `submitReview` requires sign-in and sets `verifiedBuyer` from the collector's own non-cancelled orders. `subscribeNewsletter` normalises and deduplicates emails (document id = SHA-256 of the email) and rate-limits by salted IP hash (5 attempts per 10 minutes). The client IP is the right-most `X-Forwarded-For` entry, the one Google's front end appends; the entries before it are caller-controlled and ignored. IPv6 clients share one bucket per /64. If a load balancer or other trusted proxy is ever put in front of the functions, raise `CLIENT_IP_TRUSTED_HOPS` in `functions/src/lib/net.ts` to the number of entries it appends.
- **Input hygiene**: callable document ids must match the shared `DocIdSchema` (`A–Z a–z 0–9 _ -`, 1–128 chars, no reserved `__…__` ids), so `.`, `..` or `__x__` are rejected as `invalid-argument` before any Firestore call. Address text fields reject control characters, the zero-width space, bidi marks/overrides/isolates and the BOM (`shared/text.ts`); ZWNJ/ZWJ (U+200C/U+200D) are allowed everywhere because Indic spellings (Marathi eyelash-ra, Malayalam chillu, explicit half forms) and emoji ZWJ sequences need them, and they cannot reorder text. Public reviews show a sanitised display name (control and invisible characters stripped, whitespace collapsed) and only Google account avatars (`https://lh3–6.googleusercontent.com/…`).
- **Design note (garage-based badges)**: the garage doubles as a collection tracker, so collectors may park cars they own offline (`source: 'manual'`). `onGarageWrite` computes stats from the whole garage, which means Speed Demon, Treasure Hunter, Garage Builder and Master Collector (and their one-time XP) can be earned from manual entries. First Ride and order XP require a real `placeOrder`. If badges should reflect purchases only, compute stats from `source == 'purchase'` entries in `onGarageWrite`.
- **Tests**: `npm run test:rules` runs 310+ emulator tests covering every rule above.
- Not configured: **App Check**. Register the web app with App Check (reCAPTCHA Enterprise) before a public launch, then enforce it: set `enforceAppCheck: true` on the callables (above all `subscribeNewsletter`, which needs no sign-in and is otherwise limited only per IP) and turn on App Check enforcement for Firestore, which keeps scripted clients from flooding garage writes (each one triggers an `onGarageWrite` recompute; bursts are already collapsed by the `statsSyncedAt` skip). This is deployment configuration, not code.

## Gamification rules

All rules live in `shared/gamification.ts` and are pure functions, shared by the web app (display) and Cloud Functions (the only writer).

- **Levels**: 25 levels. Reaching level _n_ takes `20·(n−1)² + 60·(n−1)` XP: level 2 = 80, level 5 = 560, **level 7 = 1,080** (so 1,240 XP shows `LEVEL 07`), level 10 = 2,160, level 25 = 12,960. Titles: ROOKIE (1), STREET RACER (5), PRO DRIVER (10), TRACK LEGEND (15), HALL OF FAME (20), ARENA CHAMPION (25).
- **Order XP** (awarded by `placeOrder`): 100 per order, plus 25 per car unit, plus a rarity bonus per unit (common 0, rare 25, super-rare 50, limited 100).
- **Badges** (each badge's XP is awarded exactly once):

| Badge               | Requirement                                      | XP  |
| ------------------- | ------------------------------------------------ | --- |
| 🔥 FIRST RIDE       | Place your first order (`ordersPlaced ≥ 1`)      | 100 |
| 🏁 SPEED DEMON      | Own 10 racing cars (`racingCars ≥ 10`)           | 250 |
| 💎 TREASURE HUNTER  | Own a rare, super-rare or limited car            | 150 |
| 🏎️ GARAGE BUILDER   | Own 25 cars (`carsOwned ≥ 25`, duplicates count) | 300 |
| 👑 MASTER COLLECTOR | Complete a series (own every car in it)          | 500 |

- **Where it happens**: `placeOrder` awards order XP and any badges the purchase unlocks in its transaction. `onGarageWrite` recomputes stats from the full garage and the active series whenever a car is added, removed or its quantity changes, then unlocks badges idempotently. Each recompute stamps `statsSyncedAt`; an event whose garage write committed before the latest stamp was already covered, so it is skipped after reading only the profile. The client diffs the live profile (`BadgeWatcher`) to show unlock toasts, the badge modal and level-up toasts.

## Hosting, caching and CSP

`firebase.json` serves `dist/` as a single-page app (`**` → `/index.html`) with these headers:

| Paths                                                         | Headers                                                                                                                                                                                                                 |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| all                                                           | `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Strict-Transport-Security: max-age=31536000; includeSubDomains`, `Permissions-Policy: camera=(), microphone=(), geolocation=()` |
| all except Firebase's reserved `/__/*` URLs                   | `Content-Security-Policy` (below), `X-Frame-Options: DENY`                                                                                                                                                              |
| `/assets/**` (content-hashed JS/CSS)                          | `Cache-Control: public, max-age=31536000, immutable`                                                                                                                                                                    |
| `/placeholders/**`                                            | `Cache-Control: public, max-age=86400`                                                                                                                                                                                  |
| `/index.html`, `/site.webmanifest`, extension-less app routes | `Cache-Control: no-cache` (always revalidate, so a deploy is picked up immediately)                                                                                                                                     |

**Why `/__/*` is excluded**: Firebase Auth's popup and redirect flows load the helper page `https://<authDomain>/__/auth/iframe` in an iframe, and `<authDomain>` is served by your own Hosting site. `X-Frame-Options: DENY` or this app's CSP on those pages would break sign-in, so the rule uses an RE2 regex, `^/(?:[^_].*|_(?:[^_].*)?|__(?:[^/].*)?)?$` (every path whose first segment is not `__`). The `no-cache` rule for app routes uses the same idea.

**Content-Security-Policy**, directive by directive:

| Directive     | Sources and reasons                                                                                                                                                                                                                                                                    |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `default-src` | `'self'`                                                                                                                                                                                                                                                                               |
| `script-src`  | `'self'`, the **sha256 hash of the inline theme script**, `https://apis.google.com` (the Auth popup/redirect loads `gapi`), `https://www.googletagmanager.com` (optional Analytics). No `'unsafe-inline'`, no `'unsafe-eval'`                                                          |
| `style-src`   | `'self'`, `'unsafe-inline'`, `https://fonts.googleapis.com`. `'unsafe-inline'` is needed because Framer Motion and a few libraries inject `<style>` elements, and a static host cannot issue per-request nonces. Style injection cannot execute script, and script-src stays strict    |
| `font-src`    | `'self'`, `https://fonts.gstatic.com`                                                                                                                                                                                                                                                  |
| `img-src`     | `'self'`, `data:`, `blob:`, `https://res.cloudinary.com`, Google avatars (`https://lh3.googleusercontent.com`, `https://*.googleusercontent.com`), Analytics pixels                                                                                                                    |
| `connect-src` | `'self'`, `https://*.googleapis.com` (Firestore, Identity Toolkit, Secure Token, Installations), `https://*.cloudfunctions.net` and `https://*.a.run.app` (callables), Analytics endpoints, and the **local emulator ports** (`http://127.0.0.1:9099/8080/5001`, `http://localhost:…`) |
| `frame-src`   | `'self'`, `https://*.firebaseapp.com`, `https://accounts.google.com`, `https://apis.google.com` (Auth helper iframe), plus the Auth emulator (`http://127.0.0.1:9099`, `http://localhost:9099`)                                                                                        |
| others        | `manifest-src 'self'`, `worker-src 'self' blob:`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'none'`                                                                                                                                               |

Notes:

- **Editing the inline script in `index.html` requires a new hash.** `index.html` is excluded from Prettier to keep the script byte-stable. After an edit, `npm run test:rules` fails with the new hash in the message (`tests/rules/config.test.ts`). Or compute it yourself:

  ```bash
  node -e "const h=require('fs').readFileSync('index.html','utf8').match(/<script>([\s\S]*?)<\/script>/)[1];console.log(\"'sha256-\"+require('crypto').createHash('sha256').update(h).digest('base64')+\"'\")"
  ```

  Put the value in `script-src` in `firebase.json`. The current hash is `'sha256-aIqL7EE1q9wXoi4hpRs7G1lGkyaiOE5b1BnhqFG3LaY='`.

- **Loopback emulator origins** are allowed so a local production build served by the Hosting emulator can reach the local Auth/Firestore/Functions emulators. They only reach the visitor's own machine, so they add no data-exfiltration channel. If you want a stricter policy for production, remove them (the local Hosting emulator then only works with builds that use a real project).
- `upgrade-insecure-requests` is intentionally omitted. Firebase Hosting is HTTPS-only with HSTS and every allowed host is `https://`, so it adds nothing in production, and it could break plain-http local serving.
- **Adding a host** (a new CDN, Razorpay, other analytics): extend the matching directive in `firebase.json`, then check the browser console for `Refused to …` CSP errors on a preview channel.
- **HSTS preload**: add `; preload` only for a custom apex domain whose subdomains are all HTTPS, and after submitting it to <https://hstspreload.org>.
- `npm run preview` (Vite) does **not** apply these headers. Use a preview channel (`npx firebase hosting:channel:deploy test`) or the Hosting emulator to check them.

## Testing

| Command                                                     | What it covers                                                                                                                                                                                                                                      |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm test`                                                  | Vitest unit + component tests: `shared/` (gamification, commerce totals, schemas, text hygiene) and `src/` (stores, hooks, services, helpers, pages and components in jsdom) — 82 files, 701 tests                                                  |
| `npm --prefix functions test`                               | Functions unit tests (pricing, order planning, stats, garage sync, reviews, profiles, rate limits, client IP, email, env) — 18 files, 214 tests                                                                                                     |
| `npm run test:rules`                                        | Boots the Firestore emulator (Java 21) and runs `tests/rules/**` — 7 files, 322 tests                                                                                                                                                               |
| `npm run smoke`                                             | Backend end-to-end: builds functions, boots Auth/Firestore/Functions emulators, seeds, runs `scripts/smoke-e2e.mjs` (20 checks over HTTP)                                                                                                           |
| `npm run e2e`                                               | Browser end-to-end: builds functions, boots the emulators, seeds, runs the Playwright suite in `tests/e2e/` (3 projects, 219 tests: 214 pass, 5 skipped by design — desktop-only checks on mobile, the real popup once, the 320 px rail check once) |
| `npm run typecheck`, `npm run lint`, `npm run format:check` | Static checks                                                                                                                                                                                                                                       |

`tests/rules/` covers:

- catalogue public reads, admin-claim writes (non-admin, `admin: false` and `admin: "true"` claims denied), and reviews being read-only;
- profiles: owner read, no client create, only displayName/photoURL updates (no hidden characters in the name), function-owned fields immutable (including deletes, `increment`/`arrayUnion` transforms and the `statsSyncedAt` stamp);
- garage: exact create shape, `source: 'purchase'` denied, extra and missing keys, quantity bounds, immutable fields, other users denied;
- wishlist, addresses (every Indian-format rule, all 36 states and UTs, hidden characters rejected), orders (own get/list, others denied, no client create, admin status updates only), and locked collections (`newsletter`, `rateLimits`, `processedPayments`, unknown collections);
- `config.test.ts`: deploy-config drift guards. The CSP hash matches `index.html`, emulator ports match `shared/constants.ts`, rule constants match `shared/`, headers and caching behave as intended per path, the orders index and TTL policy exist, and the functions ignore list cannot strip `lib/`.

**Automated end-to-end smoke test** — `npm run smoke` (about a minute, Java 21, ports 9099/8080/5001 free). It signs up a collector in the Auth emulator and drives the real callables over HTTP: `ensureUserProfile` (+ idempotent repeat), `placeOrder` for two in-stock cars charged exactly the `computeOrderTotals` total (order doc, `source: 'purchase'` garage entries, XP, FIRST RIDE, stats), an idempotent replay of the same transaction id, rejections for a tampered amount, a sold-out car and an unauthenticated call, `submitReview` aggregates, newsletter dedupe and the per-IP rate limit, a forged `purchase` garage entry denied by the rules, and a manual garage entry whose `onGarageWrite` sync unlocks TREASURE HUNTER. It prints a PASS/FAIL table and exits non-zero on any failure; see [`scripts/README.md`](scripts/README.md#end-to-end-smoke-test--smoke-e2emjs).

**Browser end-to-end suite (Playwright)** — `npm run e2e` (about 7 minutes; Java 21, ports 9099/8080/5001/4400/4500 and **5173** free; first time: `npx playwright install chromium`). `firebase emulators:exec` boots Auth/Firestore/Functions and seeds them, then Playwright starts its own Vite dev server on port 5173, wired to the emulators with `VITE_DUMMY_PAYMENT_SUCCESS_RATE=1` (deterministic payments). Three projects run every spec: **desktop-dark** and **desktop-light** at 1440×900, and **mobile** at 375×812 (which also re-checks every route in the light theme). Coverage:

- every route (public and signed-in, all garage tabs): exactly one `<h1>`, a meaningful title, no page errors, no console errors, no horizontal overflow, `noindex` on private pages;
- axe-core scans (`wcag2a` + `wcag2aa`) of the main routes in both themes: zero serious/critical violations;
- home section order, the static hero (not pinned, no sticky stage, shorter than the viewport, no scroll-track), Explore Collection → `#collection` (focus moves there), the next section visible after a short scroll, Choose Your Ride names never truncating and titles lining up per row (320 / 375 / 1024 / 1440 px), whole labels on the rail's cards at 320 px, category card → `/shop?category=…`, and a reduced-motion run (instant jump, no errors);
- command palette (<kbd>Ctrl</kbd>+<kbd>K</kbd>, `/`, Esc, Make → Models group, Enter → `/search?q=…`) and shop load more + sort + MAKE filter + clear all (URL-synced; drawer on mobile);
- product page: add-to-cart badge, signed-out PIT PASS prompt, Product JSON-LD, the themed-specs note; reviews (validation, post, edit mode);
- a signed-in "filled pit stop" axe flow in every project: a seeded two-car cart, each checkout step (address, COD payment, review) and the order-success page;
- resilience (`resilience.spec.ts`): with Firestore unreachable, `/shop` and `/product/…` show Engine trouble + Try again (never an empty grid, a 404 or `noindex`) and recover once it is back;
- shell: route-change announcements (`#route-announcer` + focus on `<main>` after a product-card Enter; filters change neither), the footer staying below the fold while a lazy page loads, and 320 px reflow on six routes (`reflow.spec.ts`);
- the **real Google popup** through the Auth emulator UI (once, desktop-dark);
- checkout end to end with COD and with card: cart totals and free-shipping meter → address validation → payment → review → place order → success (order id, XP, FIRST RIDE, no modal on top) → `/orders` → order detail → purchased cars in `/garage`;
- My Garage: picker → favourite → copies → duplicates tracker → tabs with URL sync → achievements progress; newsletter subscribe → already subscribed.

Conventions (`tests/e2e/fixtures.ts`): every test signs in as its **own** collector (`uniqueEmail()` + the dev hook `window.__hwaTest.signIn`), so tests stay independent on the shared emulator database and run two at a time (one on CI, with one retry). The automatic `consoleGuard` fixture fails a test on any page error or unexpected `console.error` (the allowlist only holds aborted Firestore channel requests; the resilience tests additionally allow the SDK's offline noise), and the per-project `theme` option is persisted before first paint. Failures keep a trace and a screenshot under `test-results/e2e/`; the HTML report goes to `playwright-report/` (`npm run e2e:report`). To debug interactively: `npm run emulators`, `npm run seed:emulator`, then `npm run e2e:ui` or `npx playwright test tests/e2e/checkout.spec.ts --project=desktop-dark --headed`. Locally Playwright reuses a dev server already running on 5173, so start that one with `VITE_DUMMY_PAYMENT_SUCCESS_RATE=1` for deterministic payments.

**Manual smoke test in the browser** (about 5 minutes, on the emulators):

1. Follow the [Quick start](#quick-start-no-firebase-project-needed), then open the Emulator UI and check that `products` has 36 documents.
2. Browse Home, Shop (filters, sort, <kbd>Ctrl</kbd>+<kbd>K</kbd> search), a product page and the Vault, and toggle dark/light theme.
3. Sign in (fake Google account) and check that `users/{uid}` appears with `xp: 0` and `level: 1`.
4. Add a car to the garage from a product page, favourite it and change its quantity. `onGarageWrite` updates `stats` in the Emulator UI.
5. Add cars to the cart, check out with an address such as phone `9876543210`, PIN `560001`, state `Karnataka`, and pay (test mode). On success you see the order id, XP earned and the FIRST RIDE badge toast. The order shows under **Orders**, and the purchased cars show in the garage with `source: 'purchase'`.
6. Write a review, then subscribe to the newsletter twice (the second time returns "already subscribed").

For automation, dev builds on the emulators expose `window.__hwaTest.signIn({ email, displayName })` (`src/dev/testHooks.ts`), which signs in without the OAuth popup. It is never included in production builds.

## CI/CD (GitHub Actions)

| Workflow                                              | Trigger                    | What it does                                                                                                                                                                                                                                                                     |
| ----------------------------------------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.github/workflows/firebase-hosting-pull-request.yml` | every pull request         | `npm ci` (web + functions), format check, lint, typecheck, unit tests, functions typecheck and tests, rules tests, build, functions build. Then, for branches of this repository, deploys `dist/` to a **preview channel** (expires after 7 days) and comments the URL on the PR |
| `.github/workflows/firebase-hosting-merge.yml`        | push to `main`, manual run | Same checks, then deploys **Firestore rules + indexes → Cloud Functions (optional) → Hosting live**                                                                                                                                                                              |

**Repository configuration** (Settings → Secrets and variables → Actions):

| Name                                                                                                                     | Kind                 | Notes                                                                                                                             |
| ------------------------------------------------------------------------------------------------------------------------ | -------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `FIREBASE_PROJECT_ID`                                                                                                    | variable             | Your project id. **Deploys are skipped while it is unset**, but the checks still run                                              |
| `FIREBASE_SERVICE_ACCOUNT`                                                                                               | secret               | JSON key of the deploy service account (below)                                                                                    |
| `VITE_FIREBASE_*` (7 keys)                                                                                               | variable or secret   | The web app config from step 5. These values are public, but storing them as secrets is fine                                      |
| `VITE_CLOUDINARY_CLOUD_NAME`, `VITE_SITE_URL`, `VITE_ENABLE_ANALYTICS`, `VITE_PAYMENT_PROVIDER`, `VITE_FUNCTIONS_REGION` | variables (optional) | Defaults: none, current origin, `false`, `dummy`, `asia-south1`                                                                   |
| `DEPLOY_FUNCTIONS`                                                                                                       | variable (optional)  | `true` deploys Cloud Functions on every push to `main`. You can also run the workflow manually with "Also deploy Cloud Functions" |

**Deploy service account**: in Google Cloud Console → **IAM & Admin → Service Accounts**, create `github-deployer` and grant it:

- Hosting, rules and indexes: **Firebase Hosting Admin**, **Firebase Rules Admin**, **Cloud Datastore Index Admin**, **Firebase Authentication Admin** (preview-channel domains are added to Auth's authorized domains automatically), **Service Usage Consumer** and **API Keys Viewer**.
- Functions too: **Cloud Functions Admin**, **Service Account User** (on the runtime service account), **Artifact Registry Administrator**, **Cloud Build Editor**, **Cloud Run Admin** and **Eventarc Admin**. If a deploy still fails, the CLI error names the missing permission.

Then open **Keys → Add key → JSON** and paste the file into the `FIREBASE_SERVICE_ACCOUNT` secret. Alternatively, `npx firebase init hosting:github` creates a hosting-only account and secret for you. For keyless auth, swap the `google-github-actions/auth` step to Workload Identity Federation.

Preview channels use the **live** project's Firestore, Functions and Auth. Pull requests from forks get the checks only, because secrets are not shared with forks.

## Troubleshooting

- **`npm run e2e` fails at start-up**: port 5173 is taken (Playwright starts its own dev server with `--strictPort`) or the Chromium build is missing (`npx playwright install chromium`). Stop other dev servers first (`npx kill-port 5173`).
- **Port already in use** (`Could not start Firestore Emulator, port taken`): another emulator or app holds 8080, 9099, 5001, 5000 or 4000. Windows: `netstat -ano | findstr :8080`, then `Stop-Process -Id <pid>`. macOS/Linux: `lsof -i :8080`. Or change the port in `firebase.json` **and** `EMULATOR_PORTS` in `shared/constants.ts` (a test checks they match).
- **`Java … not found` or "requires Java 21"**: install a JDK 21+ and make sure `java -version` works in the same terminal (set `JAVA_HOME` or add it to `PATH`).
- **Functions don't load in the emulator**: run `npm run functions:build` first (the emulator loads `functions/lib/functions/src/index.js`), and check the Emulator UI logs.
- **The running Functions emulator still serves old code after `npm run functions:build`**: the build deletes and recreates `functions/lib`, which the emulator's file watcher can miss. Touch `functions/package.json` (or restart the emulators) to force a reload.
- **Missing devDependencies / `vite: not found`**: `NODE_ENV=production` is set globally. Run `npm install --include=dev`, and `npm --prefix functions ci --include=dev` (or `npm install --include=dev` from inside `functions/`).
- **`functions/package.json` suddenly depends on `"hotwheelsarena": "file:.."`**: someone ran `npm --prefix functions install` with no package name (npm 10 installs the current folder into the prefix). Run `npm uninstall hotwheelsarena --include=dev` from inside `functions/` (npm removes the junction/symlink safely — never `rm -rf` through it), then `npm install --include=dev` there.
- **Sign-in popup blocked or closes immediately**: allow popups for the site. The app falls back to redirect sign-in when a popup is blocked. On a real project, check that the domain is in **Authorized domains**. If redirect sign-in fails in Safari or other browsers that block third-party storage, set `VITE_FIREBASE_AUTH_DOMAIN` to the domain that serves the app (for example `<project-id>.web.app` or your custom domain, which Firebase Hosting serves `/__/auth/*` for) and add `https://<that-domain>/__/auth/handler` to the OAuth client's authorized redirect URIs (Google Cloud Console → APIs & Services → Credentials).
- **Console: `Refused to execute inline script because it violates … Content Security Policy`**: the inline script in `index.html` changed. Recompute the hash (see [CSP](#hosting-caching-and-csp)).
- **`Missing or insufficient permissions`**: the request doesn't match `firestore.rules`. Signed out? Querying orders without `where('uid', '==', me)`? Writing a field that only functions may write? Run `npm run test:rules` after rule changes.
- **`The query requires an index`**: deploy indexes (`npx firebase deploy --only firestore:indexes`) and wait for the build to finish in the console.
- **Production build talks to the emulators**: your `.env.local` has emulator values and no `.env.production.local` overrides them. See [Environment variables](#environment-variables).
- **Emulator data disappeared**: that's the default. Use `--import=./emulator-data --export-on-exit`, or re-run `npm run seed:emulator`.
- **Hosting emulator on Windows shows no custom headers**: a known firebase-tools/superstatic path-normalisation issue on Windows means the local Hosting emulator skips `headers` rules. Deployed sites are not affected. Check headers on a preview channel, or run the emulator on macOS/Linux/WSL.
- **`HTTP Error: 403, … has not been used in project` during deploy**: an API isn't enabled yet. Enable it from the link in the error (or wait a minute after the first deploy enables it) and retry.

## Out of scope and extension points

Deliberately not built, with clean seams for later:

- **Real payment gateway**: implement `PaymentProvider` plus a server verifier (see [Payments](#payments-test-mode)).
- **Admin site**: the admin custom claim, admin-writable catalogue/settings, admin order-status updates, `isActive` soft deletes and `createdAt`/`updatedAt` everywhere are ready. Cloudinary signed uploads should go through a callable.
- **Live inventory**: `stock` is a static counter that `placeOrder` validates but never decrements. Decrement it inside the `placeOrder` transaction when inventory goes live.
- **3D models**: `<CarImage>` is structured so a `.glb` viewer can replace the `<img>`.
- **Email/SMS notifications, multi-currency, other sign-in providers.**
- **Home hero (simplified at the user's request, 2026-10-08)**: the original spec (§5.1) asked for a GSAP ScrollTrigger hero in which the car accelerates as you scroll, plus a scroll-track down the page margin. Both were removed: the hero is now a static section (headline, copy, Explore Collection / Enter the Vault, one static car on a faint grid) and GSAP is no longer used anywhere. Framer Motion remains for UI animation.
- **Functions runtime**: Cloud Functions run on **Node.js 22**. The original spec asked for Node 20, but Node 20 reached upstream end-of-life in April 2026 and the `nodejs20` Cloud Functions runtime is deprecated (decommissioned 2026-10-30), so new projects may not be able to deploy it. `nodejs22` is supported until 2027-04-30.

## Disclaimer

HotWheelsArena is an independent fan and collector project. It is **not affiliated with, endorsed by or sponsored by Mattel, Inc.** Hot Wheels® is a trademark of Mattel, Inc. All brand strings live in `src/config/brand.ts` so the naming can be changed in one place. Product data, "Meet the Machine" statistics and images are placeholders; the themed vehicle specifications are not claims about the toys. Payments run in test mode only.
"# HotWheelsArena"
