# scripts/

Node tooling for data seeding, admin access and generated assets. Run TypeScript scripts with
`npx tsx <file>` (tsx is a root devDependency). They import `shared/` with relative paths,
because tsx does not resolve the `@shared` alias.

| Script                | npm                                              | What it does                                                                                        |
| --------------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| `seed.ts`             | `npm run seed` / `npm run seed:emulator`         | Validates and writes the launch catalogue to Firestore                                              |
| `verify-seed.ts`      | `npm run seed:verify`                            | Reads the seeded data back and checks it against the catalogue                                      |
| `set-admin.ts`        | `npm run set-admin`                              | Grants or revokes the `admin` custom claim for a user                                               |
| `generate-images.ts`  | `npm run images` / `npm run images:check`        | Generates every SVG in `public/placeholders/`, plus the favicon and social card                     |
| `rasterize-images.ts` | —                                                | Renders `og-image.png` and `apple-touch-icon.png` from their SVGs                                   |
| `generate-sounds.mjs` | `npm run sounds`                                 | Generates the engine sound effects in `public/sounds/`                                              |
| `smoke-e2e.mjs`       | `npm run smoke`                                  | End-to-end smoke test of the Cloud Functions, rules and seed on the Emulator Suite (see below)      |
| `dev/snap.mjs`        | `npm run snap`                                   | Playwright screenshot of a route (dev server) + console/page errors and 375px overflow (`--help`)   |

Pass flags to npm scripts after `--`, for example `npm run seed -- --dry-run`.

> **Windows note:** this machine sets `NODE_ENV=production` globally, so a plain `npm install`
> skips devDependencies. Use `npm install --include=dev`.

---

## Seeding Firestore — `seed.ts`

The seed writes **6 categories, 6 series, 36 products, 40 reviews (on 12 products) and
`settings/site`**. Every document has a fixed id, so running the seed again updates the same
documents and never creates duplicates.

```bash
npm run seed -- --dry-run                 # validate and print the plan, no Firebase needed
npm run emulators                         # terminal 1: start the Emulator Suite (default ports)
npm run seed:emulator                     # terminal 2: seed the Firestore emulator (127.0.0.1:8080)
npm run seed -- --emulator --reset        # wipe the seeded collections, then seed again

# Or do it in one step: start a throwaway emulator, seed it, then shut it down
npx firebase emulators:exec --only firestore --project demo-hotwheelsarena "npm run seed:emulator"
```

| Flag             | Meaning                                                                                                                                                                                                       |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--emulator`     | Target the Firestore emulator. Uses `FIRESTORE_EMULATOR_HOST` if it is set (`firebase emulators:exec` sets it), otherwise `127.0.0.1:8080`. The project is `demo-hotwheelsarena` unless you pass `--project`. |
| `--project <id>` | Firebase project id. Without `--emulator`, the seed writes to that **live** project using Application Default Credentials.                                                                                    |
| `--reset`        | Recursively delete `products` (including their `reviews`), `categories`, `series` and `settings` first. **`users` and `orders` are never touched.**                                                           |
| `--yes`, `-y`    | Required together with `--reset` when the target is a live project.                                                                                                                                           |
| `--dry-run`      | Validate the catalogue and print the plan without connecting to Firebase.                                                                                                                                     |
| `--help`, `-h`   | Show usage.                                                                                                                                                                                                   |

**Seeding a live project:** create a service-account key in the Firebase console (Project settings → Service accounts),
save it **outside the repo** (`service-account*.json` is gitignored anyway), and then run:

```bash
# macOS / Linux / Git Bash
GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json npm run seed -- --project your-project-id
# PowerShell
$env:GOOGLE_APPLICATION_CREDENTIALS = "C:\keys\key.json"; npm run seed -- --project your-project-id
```

If you leave out `--project`, the script uses `GOOGLE_CLOUD_PROJECT` / `GCLOUD_PROJECT`, then the key file's `project_id`.
`demo-*` project ids are refused in live mode, because they only exist inside the emulator.

### What the seed guarantees

Before it writes anything, `lib/validate.ts` checks the catalogue. Any error stops the run with exit code 1:

- exactly **36 products**, with unique slugs and collector numbers; `id === slug`
- exactly **8 `isNew`**, and they are the 8 most recent by `createdAt`; exactly **8 `isFeatured`**; **≥ 6 `isVault`**
- each vault car has `limitedEdition { editionNumber, editionSize }`, rarity `limited` and low stock (≤ 50)
- every category has at least 4 cars; prices are whole rupees from ₹199 to ₹2,499 and fit the price band for their rarity; `compareAtPrice` is above the price
- series ↔ product links go both ways: `series.carIds` equals the set of products with that `series`, `seriesNumber` equals the car's position in `carIds`, and `seriesName` and `year` match the series
- images: 1–3 per product, `primaryImage === images[0].url`, `publicId = hotwheelsarena/cars/<slug>[-n]`, and every `/placeholders/*.svg` file exists
- premium items (the vault cars and anything not at 1:64 scale) carry the `premium` tag; scores from 1 to 10 fit the rarity
- reviews: one per reviewer per product, 10–1000 characters (same limits as `SubmitReviewSchema`), dated after the product was listed; product `ratingAvg` / `ratingCount` match the reviews
- `settings/site` equals `DEFAULT_SITE_SETTINGS` from `shared/commerce.ts`

The composition targets (18 common · 9 rare · 3 super-rare · 6 limited, 2 sold out, 2–5 reviews each) are only reported as warnings.

### Stored document shape

- Document ids: category and series id = slug (for example `hw-exotics-2026`), product id = slug, review id = reviewer uid (`products/{id}/reviews/{uid}`). The `id` itself is **not** stored inside the document.
- Products store every `Product` field from `shared/types.ts`, including `description`, `seriesName`, `series` (the series document id), `currency: 'INR'`, `isActive: true`, `compareAtPrice: null` and `limitedEdition: null` when those don't apply.
- `createdAt` / `updatedAt` are Firestore `Timestamp`s. `createdAt` comes from the data files, so it is stable. `updatedAt` is set to the time of each seed run (reviews keep `updatedAt = createdAt`).
- `ratingAvg` is stored with 4 decimals, the same convention as the `submitReview` function, so `round(avg × count)` gives back the exact rating sum.
- **Collector reviews are kept.** A normal (non-`--reset`) seed leaves reviews that users submitted through the app in place, and includes them in the product's rating aggregates. `--reset` deletes all of them.
- Seed reviewers have uids starting with `seed-`, so they never collide with real Firebase Auth uids.
- If you rename or remove products in the data files, old documents stay behind unless you run with `--reset`.

### Editing the catalogue

| File                   | Contents                                                                                                                          |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `data/categories.ts`   | 6 categories (names, lucide icons and order match `CATEGORY_DISPLAY` in `src/config/site.ts`)                                     |
| `data/series.ts`       | 6 series; `carIds` in order of `seriesNumber`                                                                                     |
| `data/products.ts`     | 36 cars written with `defineProduct()`, which fills in `id`, `seriesName`, `seriesNumber`, `year`, images, `currency`, `isActive` |
| `data/reviews.ts`      | 40 reviews                                                                                                                        |
| `data/settings.ts`     | `settings/site`                                                                                                                   |
| `data/placeholders.ts` | The placeholder art catalogue, shared by products (image ids are type-checked) and the image generator                            |
| `data/index.ts`        | `buildSeedCatalog()`: converts dates and computes the derived fields                                                              |
| `lib/validate.ts`      | The invariants listed above                                                                                                       |

After an edit, run `npm run seed -- --dry-run`. If you add a new placeholder variant, run `generate-images.ts` too.

### Checking a seeded database — `verify-seed.ts`

```bash
npx tsx scripts/verify-seed.ts --emulator            # or --project <id>
```

This checks that the counts are exact (36 / 6 / 6 / `settings/site`), that every seeded review exists,
that the key fields and `Timestamp` types match the catalogue, that `series.carIds` point to existing products,
and that each product's `ratingAvg` / `ratingCount` match the reviews actually stored.
It exits with code 1 on any mismatch, including extra products that are not part of the catalogue.

---

## Admin access — `set-admin.ts`

The Firestore rules allow catalogue, settings and order-status writes only when `request.auth.token.admin == true`.

```bash
npx tsx scripts/set-admin.ts --email you@example.com --emulator          # Auth emulator (127.0.0.1:9099)
npx tsx scripts/set-admin.ts --email you@example.com --project my-proj   # live project (ADC, see above)
npx tsx scripts/set-admin.ts --email you@example.com --project my-proj --revoke
npx tsx scripts/set-admin.ts --email you@example.com --emulator --check  # print claims only
```

1. Sign in to the app once with that Google account, so the user exists.
2. Run the script. Other custom claims on the user are kept.
3. Sign out and back in (or refresh the ID token) so the browser picks up the new claim.

---

## End-to-end smoke test — `smoke-e2e.mjs`

```bash
npm run smoke                  # presmoke builds functions/, then emulators:exec runs seed + smoke
node scripts/smoke-e2e.mjs     # against emulators you already started and seeded
```

`npm run smoke` = `firebase emulators:exec --only auth,firestore,functions --project demo-hotwheelsarena "npm run seed:emulator && node scripts/smoke-e2e.mjs"`
(its `presmoke` hook runs `npm run functions:build` first, because the emulator loads `functions/lib`). It needs Java 21 and
free ports 9099 / 8080 / 5001 (plus the emulator hub/logging ports 4400 / 4500), and leaves nothing running.

The script uses only Node 22's `fetch`. It signs up a collector through the Auth emulator REST API and calls the callables over
the `onCall` HTTP protocol with that ID token, reading results back through the Firestore emulator REST API (`Bearer owner`).
It checks:

- `ensureUserProfile` creates `users/{uid}` and is idempotent;
- `placeOrder` for two in-stock cars, charging exactly the total computed from seeded prices + `settings/site` with the
  `computeOrderTotals` rules: order document, garage entries with `source: 'purchase'`, XP, the FIRST RIDE badge and stats;
- the same transaction id replayed returns the same order (still one order); a tampered amount, a sold-out car and an
  unauthenticated call are rejected with the right error codes;
- `submitReview` raises `ratingCount` and flags the verified buyer;
- `subscribeNewsletter` returns `subscribed`, then `already-subscribed`, and the 6th sign-up from one IP is rate limited
  (the emulator exposes no client IP, so the script sends `X-Forwarded-For`);
- the security rules deny a client-forged `source: 'purchase'` garage entry but accept a manual one written as the user,
  after which `onGarageWrite` recomputes the stats and awards TREASURE HUNTER.

It prints a PASS/FAIL table and exits with code 1 if any check fails. Override hosts with `FIREBASE_AUTH_EMULATOR_HOST`,
`FIRESTORE_EMULATOR_HOST`, `SMOKE_FUNCTIONS_HOST` and the project with `SMOKE_PROJECT_ID`.

## Screenshots — `dev/snap.mjs`

`npm run snap -- --path /shop --out shots/shop.png [--width 375] [--theme light] [--full] [--signin]` opens the running dev
server (`http://localhost:5173`) in headless Chromium (`@playwright/test`), takes a screenshot and reports console errors,
page errors and horizontal overflow. `--signin` uses the dev-only emulator hook in `src/dev/testHooks.ts`. Run with `--help`
for every option.

---

## Generated assets

### Images — `generate-images.ts`

```bash
npx tsx scripts/generate-images.ts          # write all 44 SVGs
npx tsx scripts/generate-images.ts --check  # exit 1 if any file is missing or out of date (useful in CI)
```

| Output                                        | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `public/placeholders/<variant>.svg` (34)      | Side-view die-cast illustrations, 800×450 viewBox, transparent background, facing right. There are 8 body types (supercar, coupe, muscle, off-road, prototype, rescue, fantasy, hatch) with metallic paints and race / rally / police / patrol / fire / ambulance / crash / flames liveries. Each is under 8 KB. They are built from gradients only, with no filters, so they are cheap to paint, and they read clearly on both `#080808` and `#F6F5F2`. |
| `public/placeholders/car-generic.svg`         | Neutral graphite fallback (`FALLBACK_CAR_IMAGE`)                                                                                                                                                                                                                                                                                                                                                                                                         |
| `public/placeholders/category-<slug>.svg` (6) | "Parked car" silhouettes in dark garage metal for the _Choose Your Ride_ cards. Headlights are grouped under `class="headlight"` and dimmed with an `opacity` attribute, tail lamps use `class="taillight"`, and rescue light bars use `class="beacon"`. When the SVG is **inlined**, CSS can turn the lights on, e.g. `.group:hover .headlight { opacity: 1 }`. The Limited silhouette has a gold vault pinstripe.                                      |
| `public/placeholders/hero-car.svg`            | 1600×800, chrome with an orange double stripe. Groups `#body`, `#wheel-rear`, `#wheel-front` and `#headlights`. The wheels have `transform-box: fill-box; transform-origin: center`, so an inlined copy can spin them with `rotate()`. All other ids are prefixed `hc-`.                                                                                                                                                                                 |
| `public/favicon.svg`                          | Orange racing monogram (the first letter of `BRAND_SHORT_NAME`) with speed lines, on ink                                                                                                                                                                                                                                                                                                                                                                 |
| `public/og-image.svg`                         | Source for the 1200×630 social card                                                                                                                                                                                                                                                                                                                                                                                                                      |

Brand text (logo, tagline, short name, country) is read from `src/config/brand.ts`, so a rename only needs that edit and a re-run.
All text is drawn with a small built-in stroke font (`images/glyphs.ts`), so no font files are involved and the output is identical on every machine.
Every id inside a file is prefixed per file, so several SVGs can be inlined on the same page safely.

Code layout: `images/bodies.ts` (body geometry), `images/car.ts` (the layered car renderer), `images/scenes.ts` (the documents above), `images/palette.ts`, `images/glyphs.ts`, `images/svg.ts`.

### PNGs — `rasterize-images.ts`

`@resvg/resvg-js` is **not** a project dependency. It ships a native binary and is only needed when the art changes.
Install it in a throwaway folder outside the repo and point the script at that folder:

```bash
mkdir ../hwa-rasterize && cd ../hwa-rasterize
npm init -y && npm install --include=dev @resvg/resvg-js@2
cd - && npx tsx scripts/rasterize-images.ts --resvg ../hwa-rasterize    # or set RESVG_DIR
```

This writes `public/og-image.png` (1200×630, used by `og:image` / `twitter:image`) and `public/apple-touch-icon.png` (180×180, with a full ink background).
Do **not** add `public/site.webmanifest`: the Vite `brandPlugin` generates it from `src/config/brand.ts`.

### Sounds — `generate-sounds.mjs`

`npm run sounds` synthesises `public/sounds/{rev,click,start}.wav` as 16-bit mono 22,050 Hz PCM, each under 70 KB:
an engine rev (harmonic stack, pitch sweep and exhaust noise, 1.2 s), a mechanical click (80 ms) and an ignition crank settling into idle (1.5 s).
The script has no dependencies and uses seeded noise, so the output is byte-for-byte reproducible.
**Every sound is generated from scratch by this script, so the files are royalty-free.** Playback (`useSound`) is off by default and quietly skips missing files.

### Other public files

`public/robots.txt` allows all crawlers. Private pages are kept out of search results with `noindex` meta tags instead of robots rules. There is also a commented-out `Sitemap:` line to fill in once a sitemap is generated.
