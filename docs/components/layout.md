# layout — component reference

> Written by the **layout** agent. Source: `src/components/{layout,search,effects,auth,newsletter}/**`,
> `src/lib/search.ts`, `src/hooks/{useSound,useHotkey,useScrollProgress}.ts`.
> Contract: `docs/ARCHITECTURE.md` §13. Names listed there are final; everything else is additive.
> All components are named exports (one component per file), accept `className`, and use token colours only.

```ts
import { SearchInput } from '@/components/search/SearchInput';
import { Speedometer } from '@/components/effects/Speedometer';
import { NewsletterForm } from '@/components/newsletter/NewsletterForm';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { buildSearchIndex, searchProducts, groupSuggestions } from '@/lib/search';
import { useSound } from '@/hooks/useSound';
```

There are no barrels in these folders on purpose: import each file directly so pages only pull what they use.

---

## 1. App shell (`src/components/layout/*`)

### `AppLayout` (no props)

Root route element (rendered by core's `RootLayout`). Order: `PageBackdrop` → `SkipLink` → `Navbar` (with `ScrollProgress`) →
`<main id="main-content" tabIndex={-1}>` + `<Suspense fallback={<RouteFallback/>}><Outlet/></Suspense>` → `Footer`.
Global overlays are mounted **once** here — never mount them again in a page:
`MobileDrawer`, `CommandPalette`, `SignInPrompt`, `Toaster`, `BadgeWatcher`, `ScanlinesOverlay`.

`<main>` is at least `calc(100svh - var(--header-height))` tall (`min-h-[…]`, on top of `flex-1`). While a lazy page, the
`RequireAuth` gate or a short skeleton is on screen the footer therefore starts below the fold, so nothing jumps when the
page lands (this removed a ≈0.45 CLS on cold loads). Short pages (404, empty cart) push the footer just below the fold;
browsers without `svh` ignore the declaration and keep the plain `flex-1` behaviour.

Route announcements live one level up: `RootLayout` (core glue, `src/components/common`) renders `AppLayout`, then
`RouteAnnouncer` (visually hidden polite `#route-announcer`: announces `document.title` once a new pathname has settled
and moves focus to `#main-content` only when navigation dropped it — see ARCHITECTURE §12 "Router", "Route announcements + focus"),
then `ScrollRestoration`.

The wrapper is `relative isolate bg-bg`, so the fixed `PageBackdrop` (`-z-10`, faint grid + skid marks + top glow) sits above
the page colour and below content. Pages that want a solid section simply give it a background.

### `Navbar` (no props)

Sticky `glass` header (`z-header`) that condenses from **76px → 60px** after 24px of scroll (`useIsScrolled`) and draws the
orange `ScrollProgress` line on its bottom edge.

| Width        | Contents                                                                                                                    |
| ------------ | --------------------------------------------------------------------------------------------------------------------------- |
| `< sm`       | hamburger · logo · search icon · cart (below 360px the wordmark text is `sr-only`, leaving the stripe mark)                 |
| `sm`–`md`    | + wishlist, account (sign-in button / avatar menu); `md` adds theme + sound toggles                                         |
| `lg` (1024+) | hamburger hidden; centre `NavLinks`; search icon · cart · theme · sound · account (wishlist moves to the account menu here) |
| `xl` (1280+) | + wishlist, search trigger with the `Ctrl K` / `⌘K` hint; `2xl` shows the full "Search the garage…" pill                    |

The CRT scanlines toggle lives in the account menu, the mobile drawer and the footer (not the bar itself — width budget).

### `NavLinks`

`NAV_LINKS` with `isNavLinkActive` → `aria-current="page"` + orange underline stripe. Uses plain `Link`s because `NavLink`
ignores the query string (`/shop` vs `/shop?view=new`). `<nav aria-label="Primary">`.

### `Logo` — `size?: 'sm' | 'md' | 'lg'`, `asLink?` (true), `onClick?`, `textClassName?`

Orange stripe mark + `BRAND_LOGO_TEXT` (Orbitron). As a link its accessible name is `"<BRAND_NAME> — home"`.
`textClassName` is merged into the wordmark text span; the Navbar passes `max-[359px]:sr-only` so the header row fits a
320px viewport (WCAG 1.4.10 reflow) while the link keeps its name. The wrapper is `min-w-0` (it may shrink in a tight
flex row; the Navbar's left cluster is `shrink` too) and the stripe mark never shrinks. Footer and drawer logos pass nothing.

### `SkipLink` — `targetId?` (`'main-content'`), `children?` (`'Skip to content'`)

First tab stop; focuses the target programmatically (no hash change, SPA-safe).

### `ScrollProgress`

Decorative orange `scaleX(progress)` bar, rAF-throttled via `useScrollProgress()`. Rendered inside `Navbar`.

### `SearchButton` — `variant?: 'pill' | 'compact' | 'icon' | 'row'`

Opens the command palette (`uiStore.openSearch`). `pill` = field-like with text + shortcut, `compact` = icon + shortcut
keys, `icon` = `IconButton`, `row` = full-width (drawer). Always `aria-haspopup="dialog"` + `aria-keyshortcuts`
(`Control+K` / `Meta+K`).

### `CartButton` — `size?`

`IconButton` → `/cart` with `useCartCount()` badge (name: "Pit stop cart (3 items)"). When the count increases the icon does a
1–2px engine shake and the badge pops (static under reduced motion). Orange ink + `aria-current` on `/cart`.

### `WishlistNavButton` — `size?`

`IconButton` → `/wishlist` with `useWishlistCount()` badge (garage mirror; 0 when signed out).

### `ThemeToggle` — `variant?: 'icon' | 'row' | 'text'`, `size?`

Dark ⇄ light. Icon variant's name describes the action ("Switch to light theme"). Persisted via `uiStore.toggleTheme`.

### `SoundToggle` — `variant?: 'icon' | 'row' | 'text'`, `size?`

Engine sounds on/off (off by default). Icon/text = toggle button with `aria-pressed` and a constant name "Engine sounds";
row = `role="switch"`. Turning sounds on plays the `start` cue.

### `ScanlinesToggle` — `variant?: 'icon' | 'row' | 'menuitem' | 'text'`, `size?`

Cycles `auto → on → off` (`uiStore.cycleScanlines`). Name states current + next mode ("CRT scanlines: auto. Switch to on").
`menuitem` renders a `role="menuitem"` row for the account menu (menu stays open so users can cycle).

### `ToggleRow` (internal building block)

Settings row used by the three toggles (`icon`, `label`, `value`, `onClick`, `kind?: 'switch' | 'button'`, `checked?`,
`highlighted?`, `ariaLabel?`, `menuItem?`).

### `UserMenu`

- `status === 'loading'` → a pill skeleton laid over an invisible, disabled copy of the signed-out "Sign in" button, so it
  reserves that button's exact width and the header (and the centred nav) doesn't shift when auth resolves; an sr-only
  "Checking your pit pass…" label stands in for the button.
- Signed out → `GoogleSignInButton` (`size="sm"`, outline, "Sign in", compact loading state).
- Signed in → WAI-ARIA **menu button**: avatar (Google photo, initials fallback) + level chip (`07`). Menu: name/email,
  `LevelBadge` + XP bar + "160 XP to LEVEL 08", links **My Garage · Orders · Wishlist · Achievements**, `ScanlinesToggle`,
  **Sign out**. Keys: ↓/↑ on the button open and focus first/last item; ↑/↓/Home/End move; Esc closes and returns focus;
  Tab / click-outside / navigation close.

### `UserAvatar` — `name`, `photoURL`, `size?: 'sm' | 'md' | 'lg'`

Decorative avatar (`referrerPolicy="no-referrer"`, lazy) with initials fallback on a metal disc.

### `MobileDrawer` (no props)

ui-kit `Drawer` (left, `size="sm"`) bound to `uiStore.mobileNavOpen`: search row, primary links (icon, description,
active racing stripe, lock hint for My Garage when signed out), "Your pit" links with counts (cart / wishlist / orders),
theme / sound / scanlines rows, account footer (user + level + Sign out, or Google sign-in). Closes on navigation and when
the viewport reaches `lg`.

### `Footer` (no props)

Brand block (logo, tagline, description, `SocialLinks`, support email/phone/hours in an `<address>`), `FOOTER_LINK_GROUPS`
in `<nav aria-label="Footer">`, inline `NewsletterForm` (lazy-loaded with a same-height skeleton — keeps
react-hook-form out of the entry chunk), "Garage settings" chips (theme / sound / scanlines), HUD details,
`FOOTER_DISCLAIMER`, `© <year> COPYRIGHT_OWNER`, and a **"Payments are in test mode"** chip when `isTestPaymentMode()`.

### `SocialLinks` — `size?`

`SOCIAL_LINKS` as outline `IconButton`s (external, new tab, name "HotWheelsArena on Instagram (opens in a new tab)").

### `PageBackdrop`

Fixed, `aria-hidden` page backdrop used by `AppLayout` (grid at 60% + drift skid marks + faint top glow).

---

## 2. Search

### `SearchInput` (`src/components/search/SearchInput.tsx`, forwardRef → `<input>`)

| Prop                                | Type                             | Default                | Notes                                                 |
| ----------------------------------- | -------------------------------- | ---------------------- | ----------------------------------------------------- |
| `value` / `onChange`                | `string` / `(v: string) => void` | **required**           | controlled                                            |
| `onSubmit`                          | `(v: string) => void`            |                        | Enter / submit with the **trimmed** value (not blank) |
| `placeholder`                       | `string`                         | `"Search the garage…"` |                                                       |
| `autoFocus`                         | `boolean`                        | `false`                | focuses via effect (no native `autofocus`)            |
| `size`                              | `'md' \| 'lg'`                   | `'md'`                 | 44 / 56px                                             |
| `variant`                           | `'field' \| 'bare'`              | `'field'`              | `bare` = borderless (palette header)                  |
| `label`                             | `string`                         | `"Search the garage"`  | visually hidden `<label>`                             |
| `loading`                           | `boolean`                        |                        | spinner replaces the search icon                      |
| `onClear` / `clearLabel`            | `() => void` / `string`          | / `"Clear search"`     | × button appears when there is text                   |
| `trailing`                          | `ReactNode`                      |                        | e.g. a `<Kbd>` hint                                   |
| `formClassName`, native input props |                                  |                        | extra props (ARIA, `onKeyDown`…) go to the `<input>`  |

Renders `<form role="search">` + `type="search"` input. Shop agent — SearchPage example:

```tsx
const [params, setParams] = useSearchParams();
const [draft, setDraft] = useState(params.get('q') ?? '');
<SearchInput
  size="lg"
  value={draft}
  onChange={setDraft}
  onSubmit={(q) => {
    useRecentSearchStore.getState().addRecent(q);
    setParams({ q }, { replace: true });
  }}
/>;
```

### `CommandPalette` (no props; mounted once by `AppLayout`)

"Search the garage…" dialog bound to `uiStore.searchOpen`. Open it from anywhere with `useUiStore.getState().openSearch()`.

- **Shortcuts:** `Ctrl/⌘ + K` toggles (works inside inputs), `/` opens (ignored while typing in a field). Exported
  constants `PALETTE_HOTKEY = 'mod+k'`, `PALETTE_SLASH_HOTKEY = '/'`.
- **ARIA:** `role="dialog" aria-modal` + WAI-ARIA combobox (`role="combobox"`, `aria-expanded`, `aria-controls`,
  `aria-autocomplete="list"`, `aria-activedescendant`) over a `role="listbox"` of `role="group"`s of `role="option"`s.
  Focus stays in the input. A polite live region announces result counts.
- **Keys:** ↑/↓ move (wrap), Home/End jump **while navigating the list** (otherwise they move the caret), Enter selects,
  Esc closes (focus returns to the trigger). Pointer hover activates, click selects.
- **Groups (blank query):** Recent searches (sessionStorage `recentSearchStore`, with "Clear history") → Quick links →
  Categories.
- **Groups (query, debounced 150ms):** **Search** ("Search the garage for “q”", active by default → `/search?q=`) →
  **Makes → Models** (make → `/search?q=<make>`, model → `/search?q=<make model>`) → **Cars** (thumbnail via product
  `CarImage`, series `#no`, price, rarity chip → `/product/:slug`) → **Categories** (`/shop?category=`) → **Quick links**.
- **States:** catalogue loading (skeleton rows + spinner in the input), error (`ErrorState` with retry), no matches
  (message + suggestion chips). Any selection saves the query to recent searches and closes the palette.
- **Code-split:** `CommandPaletteDialog` is `React.lazy` (prefetched on idle), so the search index, option rows and
  thumbnails stay out of the entry chunk.
- Built from `CommandPaletteDialog`, `PaletteOption` and the pure `paletteModel.ts` (`buildPaletteGroups`,
  `countPaletteResults`, `QUICK_LINKS`, `SEARCH_SUGGESTIONS`) — reusable for a page typeahead.

### `src/lib/search.ts` (pure)

```ts
buildSearchIndex(products: readonly Product[]): SearchIndex          // memoise on the product list
searchProducts(index: SearchIndex, query: string, limit = Infinity): Product[]   // ranked; blank query → []
searchProductsScored(index, query, limit?): { product; score }[]
groupSuggestions(products, query, { maxMakes = 4, maxModels = 6 }?): Array<{ make; models: Array<{ model; count; slugs }> }>
matchText(text: string, query: string): number   // same matching rules for small static lists (0 = no match)
normalizeSearchText(s), tokenize(s), editDistance(a, b, max?), SEARCH_FIELD_WEIGHTS
```

Rules: normalised tokens (lower case, accents stripped, punctuation → space); **every** query token must match a weighted
field (name 10, make/model 9, series 5, category/vehicle type/colour 4, rarity/tags 3, year/collection no. 2) by exact
token, prefix, joined-token prefix (`gtr` → "GT-R", `offroad` → "off-road", `911gt3` → "911 GT3 RS") or substring (≥ 3
chars). Only if nothing matches strictly, a **typo pass** allows edit distance 1 (2 for 7+ chars) — `porshe` → Porsche,
while `pors` never matches "Horse". Name-phrase bonuses; ties → featured, rating, name.

```tsx
const { data: products = [] } = useProducts();
const index = useMemo(() => buildSearchIndex(products), [products]);
const results = useMemo(() => searchProducts(index, q), [index, q]);
```

---

## 3. Effects (`src/components/effects/*`) — all decorative (`aria-hidden`, `pointer-events-none`)

Parents need `relative` (+ `overflow-hidden` for the moving ones). All respect `prefers-reduced-motion`.

| Component          | Props                                                                                                                                                 | Notes                                                                                                                                 |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `GridBackground`   | `fade?` (true), `perspective?` (tilted garage floor), `glow?` (orange floor glow)                                                                     | CSS only (`.bg-grid`)                                                                                                                 |
| `RacingLines`      | `count?` (3, max 8), `angle?` (−6°), `seed?`                                                                                                          | orange light-trails (last one red when ≥ 3) sweeping over faint guide rails; static streaks under reduced motion                      |
| `SpeedLines`       | `intensity?: 'low' \| 'medium' \| 'high'`, `tone?: 'fg' \| 'accent'`, `band?: [start%, end%]`, `seed?`                                                | motion-blur streaks right → left; static & dimmer under reduced motion                                                                |
| `ParticleField`    | `density?` (3.5 per 100k px²), `maxParticles?` (48), `accentRatio?` (0.22), `speed?` (1)                                                              | canvas; DPR-aware (≤ 2); pauses off-screen (IntersectionObserver) and in hidden tabs; theme colours; **renders nothing** when reduced |
| `TireMarks`        | `variant?: 'curve' \| 'straight' \| 'drift'`                                                                                                          | SVG skid marks in `currentColor` (default `text-fg/[0.05]`; override colour/opacity via `className`)                                  |
| `ScanlinesOverlay` | —                                                                                                                                                     | fixed CRT layer (`z-scanlines`); `useScanlinesActive()` (auto = dark only); mounted by AppLayout                                      |
| `Speedometer`      | `value`, `max?` (320), `label?` (`SPEED`), `unit?` (`KM/H`), `size?: 'sm'\|'md'\|'lg'\|number` (140/200/280), `animate?` (true), `decorative?` (true) | ticks every `max/8`, red zone last 15%, needle sweeps in when scrolled into view                                                      |
| `Tachometer`       | `rpm`, `redline?` (8000), `max?` (10000), `label?` (`RPM ×1000`), `size?`, `animate?`, `decorative?`                                                  | readout `RPM 8,200` (rounded to 50), red line zone                                                                                    |
| `Gauge`            | base dial: `value`, `min?`, `max`, `majorStep`, `minorPerMajor?`, `dangerFrom?`, `label?`, `unit?`, `formatTick?`, `formatValue?`, …                  | build other dials (e.g. fuel, boost)                                                                                                  |
| `HudPanel`         | `title?`, `titleAs?: 'p'\|'h2'\|'h3'\|'h4'`, `meta?`, `tone?: 'default'\|'accent'\|'highlight'`, `as?`, `padding?`, native attrs                      | bordered HUD frame with corner brackets; content stays accessible (`highlight` = vault/rare only)                                     |

Set `decorative={false}` on a gauge when the reading is real content: it becomes `role="img"` with a name like
"SPEED: 286 KM/H". Helpers: `gaugeGeometry.ts` (`polarToCartesian`, `describeArc`, `valueToAngle`, `gaugeTicks`),
`useAnimatedNumber(target, ref, { enabled, duration, from })`, `seededRandom`.

Hero example (home agent):

```tsx
<section className="relative isolate overflow-hidden">
  <GridBackground perspective glow />
  <TireMarks variant="curve" />
  <RacingLines count={4} />
  <SpeedLines intensity="medium" band={[35, 85]} />
  <ParticleField />…
  <HudPanel title="Telemetry" meta="LIVE">
    <Tachometer rpm={8200} size="sm" />
  </HudPanel>
</section>
```

---

## 4. Auth (`src/components/auth/*`)

### `GoogleSignInButton` (forwardRef → `HTMLElement`)

`label?` ("Sign in with Google"; " with Google" is added for screen readers when the label omits it), `loadingText?`
("Opening Google…", `null` = keep the button width), `onSignedIn?(user)`, plus `Button` props (`variant` default
`secondary`, `size`, `fullWidth`, `className`, `data-*`…). Calls `useAuth().signIn()` (AuthProvider toasts failures);
loading while the popup is open; unexpected throws are toasted with `getFriendlyErrorMessage`.

### `GoogleMark` — `tile?` (true)

Google "G" (brand colours required by Google's guidelines — the only non-token colours).

### `SignInPrompt` (no props; mounted once)

`Modal` bound to `uiStore.signInPrompt`: eyebrow "Access control · crew only", title **PIT PASS REQUIRED**, the `reason`
(or a default), 4 benefit tiles (virtual garage, XP & badges, synced wishlist, faster checkout), Google button (initial
focus) and "Maybe later". Closes on successful sign-in (AuthProvider then runs the queued action) and if the user signs
in elsewhere. Open it via `useRequireAuthAction()` or `useUiStore.getState().openSignInPrompt(reason)`.

---

## 5. Newsletter

### `NewsletterForm`

`variant?: 'section' | 'inline'` (`section`), section copy `eyebrow?` / `title?` / `description?`, `headingAs?: 'h2' | 'h3'`,
`headingId?: string` (id for the section-variant heading — pass it when an ancestor landmark needs `aria-labelledby` pointing at
this heading, as the home `#about` section does; defaults to a generated id).
React Hook Form + `zodResolver(NewsletterSchema)` + `useSubscribeNewsletter()`. Inline validation (`aria-invalid`,
described error), loading button (input becomes read-only, focus kept), and a polite live region for
**subscribed** ("You're on the grid!…"), **already-subscribed** and **error** (friendly message; cleared on edit). Resets
the field after success. `inline` is used in the footer; the home agent drops `<NewsletterForm />` into its newsletter
section (it renders its own heading, labelled form and racing-stripe panel).

---

## 6. Hooks

### `useHotkey(combo | combo[], handler, { enabled?, preventDefault? (true), allowInInputs? (false), allowRepeat? (false) })`

Global `keydown` shortcut. Combos: `'mod+k'` (Ctrl on Windows/Linux, ⌘ on macOS), `'/'`, `'escape'`, `'shift+?'`,
`'ctrl+alt+p'`, `'ctrl++'`. Aliases: `esc`, `space`, `return`, `up/down/left/right`, `del`, `plus`, `slash`; modifier
aliases `ctrl|control`, `meta|cmd|command|super|win`, `alt|option|opt`. Unwritten `shift` is ignored for punctuation keys
(layout-dependent) and required-released otherwise. Letters fall back to `event.code` (non-Latin layouts). Ignores IME
composition, already-`preventDefault`ed events, auto-repeat and editable targets. Always calls the latest handler.
Also exported: `parseHotkey`, `matchesHotkey(event, parsed, isMac?)`, `isEditableTarget`, `isMacPlatform`,
`hotkeyLabels(combo)` (→ `['Ctrl','K']` / `['⌘','K']` for `<Kbd>`), `hotkeyAria(combo)` (→ `Control+K`).

### `useScrollProgress(): number` and `useIsScrolled(threshold = 8): boolean`

One shared rAF-throttled scroll store (scroll, resize and a body ResizeObserver). `useScrollProgress` → 0..1 (3 decimals);
`useIsScrolled` re-renders only when the boolean flips.

### `useSound(): (name: SoundName) => void` and `playSound(name)`

No-op unless `uiStore.soundEnabled` (read at call time). The first real play does `import('howler')` (never loaded while
sounds are off), caches one `Howl` per sound (`SOUND_SOURCES` / `SOUND_VOLUME`), and swallows missing files, blocked
autoplay and decode errors (a broken sound is not retried). `playSound` works outside React.

---

## 7. Tests

`npx vitest run src/lib/search.test.ts src/hooks/useHotkey.test.ts src/components/search src/components/layout src/components/effects src/components/newsletter`

- `src/lib/search.test.ts` — normalisation, edit distance, AND semantics, joined tokens, typo fallback, ranking, limits,
  grouped Make → Models (counts, slugs, maxMakes/maxModels).
- `src/hooks/useHotkey.test.ts` — combo parsing (modifiers, aliases, `+`, shift rules, errors), matching on Windows vs
  macOS, `event.code` fallback, editable targets, labels, hook behaviour (inputs, enabled, repeat, defaultPrevented,
  latest handler, cleanup).
- `src/components/search/__tests__/` — `CommandPalette` (hotkeys, combobox ARIA, grouping, keyboard navigation, selection
  routes, recent searches, no-match state, Esc/toggle) and `paletteModel`.
- `src/components/layout/__tests__/NavLinks.test.tsx` — active detection incl. `/shop` vs `/shop?view=new`.
- `src/components/newsletter/__tests__/NewsletterForm.test.tsx` — validation, subscribed / already-subscribed / error.
- `src/components/effects/__tests__/ScanlinesOverlay.test.tsx` — auto / on / off.
