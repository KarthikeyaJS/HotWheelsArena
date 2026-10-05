# product — component reference

> Written by the **product** agent. Feature agents (home, shop, product-detail, cart, garage, vault)
> build with these. Source: `src/components/product/**`. Contract: `docs/ARCHITECTURE.md` §13
> (names there are final; everything below that is not in the contract is additive).

```ts
import {
  CarImage,
  ProductCard,
  ProductCardSkeleton,
  ProductGrid,
  VaultCard,
  HorizontalRail,
  AddToCartButton,
  WishlistButton,
  AddToGarageButton,
  StockStatus,
  CollectorMeta,
} from '@/components/product';
```

## Conventions

- Named exports, one exported component per file, `className` merged with `cn()`.
- Token colours only. Orange = interaction (CTA, stripe, focus, active heart); yellow only on the
  Vault card and rarity chips; red for low stock ("hot") and the `NEW` tag.
- The global orange `:focus-visible` ring is never removed. The ProductCard's stretched link
  draws the same ring around the whole card instead.
- Reduced motion: no tilt, no engine shake, no heart pop, no grid/rail entrance motion (grid falls
  back to a plain fade), progress bars render filled.
- Auth: wishlist and garage buttons go through `useWishlistActions` / `useGarageActions`. Those
  hooks are optimistic and auth-gated: a signed-out click opens the SignInPrompt, and the action
  runs right after sign-in.
- Sounds go through `useSound()`: `click` on add to cart, `rev` on add to garage. Both are silent
  unless the visitor turned sounds on.

---

## `CarImage`

Car/product image with Cloudinary resolution and an error fallback chain.

| Prop                  | Type                                 | Default                  | Notes                                                                                                                                |
| --------------------- | ------------------------------------ | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| `image`               | `ProductImage \| null`               | —                        | Cloudinary (`productImageUrl` / `productImageSrcSet`) when `VITE_CLOUDINARY_CLOUD_NAME` is set and there is a `publicId`, else `url` |
| `src`                 | `string`                             | —                        | Plain URL, e.g. a cart line snapshot. Ignored when `image` is given                                                                  |
| `alt`                 | `string`                             | **required**             | Meaningful alt; `''` only for a decorative duplicate                                                                                 |
| `width` / `height`    | `number`                             | **required**             | Intrinsic size. Also the Cloudinary `w`/`h`, and the wrapper's `aspect-ratio`                                                        |
| `sizes`               | `string`                             | `${width}px`             | Used only when a Cloudinary `srcset` exists                                                                                          |
| `priority`            | `boolean`                            | `false`                  | LCP: `loading="eager"` + `fetchpriority="high"`. Otherwise lazy                                                                      |
| `fit`                 | `'contain' \| 'cover'`               | `'contain'`              | `object-fit` inside the box                                                                                                          |
| `crop` / `gravity`    | Cloudinary crop / gravity            | `'fit'` / —              | `fit` never crops the car                                                                                                            |
| `widths`              | `readonly number[]`                  | ½×, 1×, 1.5×, 2× `width` | `srcset` widths                                                                                                                      |
| `aspectBox`           | `boolean`                            | `true`                   | Set `false` when the parent sizes the box (`absolute inset-0`)                                                                       |
| `className`           | `string`                             |                          | Wrapper `<span class="relative block overflow-hidden">`                                                                              |
| `imgClassName`        | `string`                             |                          | Classes on the `<img>` (hover transforms, filters)                                                                                   |
| `renderMedia`         | `(resolvedSrc: string) => ReactNode` |                          | Replace the `<img>` (e.g. a future 3D `.glb` viewer) inside the same sized wrapper                                                   |
| …native `<img>` props |                                      |                          | `onLoad`, `onError` (still called), `title`, `data-*`…                                                                               |

Fallback chain on `onError`: Cloudinary URL → the image's local `url` → `/placeholders/car-generic.svg`.
The chain resets when the image changes. Always `decoding="async"` and `draggable={false}`. The
wrapper is a `<span>`, so it is valid inside links and buttons (gallery thumbnails).

```tsx
<CarImage image={primaryImageOf(product)} alt={product.name} width={960} height={600} priority />
<CarImage src={item.image} alt={item.name} width={96} height={60} className="w-24 rounded-md" />
```

## `ProductCard`

The Collectible Product Card (spec §5.2), used everywhere. It is memoized.

| Prop         | Type                     | Default            | Notes                                                     |
| ------------ | ------------------------ | ------------------ | --------------------------------------------------------- |
| `product`    | `Product`                | **required**       |                                                           |
| `priority`   | `boolean`                | `false`            | First row above the fold: eager, high-priority image      |
| `variant`    | `'default' \| 'compact'` | `'default'`        | `compact` = tighter spacing and a smaller name, for rails |
| `headingAs`  | `'h2' \| 'h3' \| 'h4'`   | `'h3'`             | Level of the name heading                                 |
| `imageSizes` | `string`                 | grid/rail defaults | `sizes` for the image                                     |
| `className`  | `string`                 |                    |                                                           |

Contents, top to bottom:

- HUD row: `SERIES 03 // #142` (`productHudLine`) and a `RarityChip`.
- 16:10 showroom stage: the car, a floor shadow, a red `NEW` tag when `isNew`, and a `SOLD OUT` stamp with a greyed car at stock 0.
- Name (Orbitron heading). The name is the card's link.
- `StarRating` with the count, or "No reviews yet". A **COLLECTOR EDITION** metal chip appears when `collectorScore >= 8` (`COLLECTOR_EDITION_MIN_SCORE`).
- `CollectorMeta`: scale / year / type.
- Footer: `StockStatus`, `PriceTag` (compare-at price struck through), `AddToCartButton` (`+ CART`) and `WishlistButton` (♡).

Interaction:

- The whole card opens `/product/:slug` through a **stretched link** on the name (`after:absolute after:inset-0`). The buttons sit above it at `z-10`, so there are no nested interactive elements. Tab order: name → cart → wishlist.
- On hover or focus-within, the card changes from `card` to `card-hover`, a metallic sheen fades in, the orange `.racing-stripe` slides in, and the car rotates −3° and scales ×1.06.
- With a fine pointer and no reduced motion, the car stage follows the cursor with a spring **3D tilt** (6°) and a glare highlight (framer `useMotionValue` / `useSpring`). Touch and reduced motion get no tilt.

```tsx
<ProductCard product={product} />
<ProductCard product={product} variant="compact" />
```

## `ProductCardSkeleton`

`variant?: 'default' | 'compact'`, `className?`. Same layout as the card, drawn with racing-shimmer `Skeleton`s. It is `aria-hidden`, so the parent (`ProductGrid` / `DataState`) announces loading.

## `ProductGrid`

| Prop                   | Type                   | Default            | Notes                                                                                    |
| ---------------------- | ---------------------- | ------------------ | ---------------------------------------------------------------------------------------- |
| `products`             | `readonly Product[]`   | **required**       |                                                                                          |
| `isLoading`            | `boolean`              | `false`            | While loading with no products: skeletons in a `role="status"` wrapper with sr-only text |
| `skeletonCount`        | `number`               | `8`                |                                                                                          |
| `emptyState` / `empty` | `ReactNode`            | generic EmptyState | Either name works (`empty` is the ARCHITECTURE name)                                     |
| `columns`              | `2 \| 3 \| 4`          | `4`                | Max columns: 1 → `sm` 2 → `lg` 3 → `xl` 4                                                |
| `variant`              | `ProductCardVariant`   | `'default'`        |                                                                                          |
| `priorityCount`        | `number`               | `0`                | The first N images are eager and high priority, with no entrance fade                    |
| `cardHeadingAs`        | `'h2' \| 'h3' \| 'h4'` | `'h3'`             |                                                                                          |
| `label`                | `string`               |                    | `aria-label` of the `<ul>`                                                               |
| `loadingLabel`         | `string`               | `'Loading cars…'`  |                                                                                          |
| `className`            | `string`               |                    | Classes on the grid                                                                      |

Items fade up with a per-column stagger the first time each row scrolls into view. Under reduced motion they only fade.

```tsx
<ProductGrid
  products={filtered}
  isLoading={query.isLoading}
  columns={3}
  priorityCount={3}
  label="All cars"
  emptyState={
    <EmptyState title="No cars match" action={<Button onClick={reset}>Reset filters</Button>} />
  }
/>
```

Use `DataState` around it when you also need the error state (`ErrorState` + retry).

## `VaultCard`

| Prop        | Type                         | Default      | Notes                                           |
| ----------- | ---------------------------- | ------------ | ----------------------------------------------- |
| `product`   | `Product`                    | **required** | Normally `isVault` with `limitedEdition`        |
| `layout`    | `'vertical' \| 'horizontal'` | `'vertical'` | `horizontal`: car left, details right from `md` |
| `priority`  | `boolean`                    | `false`      |                                                 |
| `headingAs` | `'h2' \| 'h3' \| 'h4'`       | `'h3'`       |                                                 |
| `className` | `string`                     |              |                                                 |

The card shows:

- A yellow display-case frame: corner brackets that grow on hover, and a `shadow-glow-highlight`.
- A brushed-metal texture and a pulsing yellow spotlight behind the car.
- A **LIMITED EDITION** chip and the edition number `#001/500` (`limitedEditionInfo`).
- The meta line (`HW LEGENDS · 2025 SERIES`) and the name.
- "Only **37** remaining" with "93% claimed", above an animated, striped `ProgressBar tone="highlight"`. The bar fills to `editionSize − stock` out of `editionSize`, and its `aria-valuetext` is "463 of 500 claimed, 37 remaining". Values are static from the product doc.
- `PriceTag` (lg), a ♡ button, and the CTA **VIEW EDITION →** linking to the product.

The card is a flex column whose details column grows and whose price/CTA row is pushed to the bottom (`mt-auto`), so price rows and CTAs line up across a grid row even when a name wraps to two lines (horizontal layout keeps its centred details from `md`).

When the edition is sold out (stock 0), the car is greyed with an "EDITION SOLD OUT" lock stamp, the text reads "Edition fully claimed", and the CTA becomes an outline **VIEW DETAILS**. Products without `limitedEdition` show "VAULT EXCLUSIVE" and a `StockStatus` instead of the bar. The car image is also a link, but with `tabIndex=-1` and `aria-hidden`, so it adds no second tab stop.

```tsx
<VaultCard product={product} />
<VaultCard product={hero} layout="horizontal" priority />
```

## `HorizontalRail`

Accessible horizontal scroller for card rails. It is generic over the item type.

| Prop                           | Type                                             | Default                       | Notes                                                                                                                                                                                  |
| ------------------------------ | ------------------------------------------------ | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `label` **or** `ariaLabel`     | `string`                                         | **one is required**           | Carousel `aria-label` (`ariaLabel` is the ARCHITECTURE name)                                                                                                                           |
| `items` + `renderItem`         | `readonly T[]` + `(item: T, index) => ReactNode` |                               | Data mode. Keys come from `getItemKey`, else `item.id`, else the index                                                                                                                 |
| `children`                     | `ReactNode`                                      |                               | Children mode: one slide per child                                                                                                                                                     |
| `title`                        | `ReactNode`                                      |                               | Header content left of the controls (e.g. a `SectionHeading`); its wrapper has `basis-[min(100%,18rem)]`, so a long title wraps above the controls on phones instead of being squeezed |
| `action`                       | `ReactNode`                                      |                               | Header content before the arrows (e.g. "View all")                                                                                                                                     |
| `itemWidth`                    | `number \| string`                               | `clamp(15rem, 74vw, 18.5rem)` | Slide width (px or any CSS length)                                                                                                                                                     |
| `gap`                          | `'sm' \| 'md' \| 'lg'`                           | `'md'`                        |                                                                                                                                                                                        |
| `showControls`                 | `boolean`                                        | `true`                        | Arrows are hidden automatically when nothing overflows                                                                                                                                 |
| `slideLabel`                   | `(index, total) => string`                       | `"3 of 12"`                   |                                                                                                                                                                                        |
| `className` / `trackClassName` | `string`                                         |                               |                                                                                                                                                                                        |

Semantics:

- `<section aria-roledescription="carousel" aria-label>`.
- The track is a `role="group"`, focusable (`tabIndex=0`) while it overflows, so arrow keys scroll it.
- Each slide is a `role="group" aria-roledescription="slide" aria-label="n of N"`.

Behaviour:

- CSS scroll-snap handles touch swipe, trackpads and Shift+wheel.
- Prev/next `IconButton`s (outline) scroll about one viewport and disable at the ends. Focus moves to the other arrow when the focused one disables.
- **Mouse drag-to-scroll** starts after 6px of movement. It suspends snapping, captures the pointer, and **suppresses the click** that follows the drag, then glides to the nearest slide, biased in the direction of travel.
- Edge fade masks appear while there is more to scroll.
- The first time the rail is seen, slides enter from the side with `accelerateIn` (quick acceleration ease, staggered). Reduced motion gets no entrance motion.

```tsx
<HorizontalRail
  label="Just off the track"
  title={<SectionHeading eyebrow="NEW ARRIVALS" title="Just off the track" />}
  action={
    <Button variant="link" to={shopPath({ view: 'new' })}>
      View all
    </Button>
  }
  items={newArrivals}
  renderItem={(product) => <ProductCard product={product} variant="compact" />}
/>
```

## `AddToCartButton`

| Prop        | Type                           | Default      | Notes                                                                             |
| ----------- | ------------------------------ | ------------ | --------------------------------------------------------------------------------- |
| `product`   | `Product`                      | **required** |                                                                                   |
| `qty`       | `number`                       | `1`          | Units per click (clamped by stock and `MAX_QTY_PER_ITEM`)                         |
| `size`      | `'sm' \| 'md' \| 'lg'`         | `'md'`       |                                                                                   |
| `variant`   | `ButtonVariant`                | `'primary'`  | Idle variant. Sold-out and max states switch to `outline`, in-cart to `secondary` |
| `fullWidth` | `boolean`                      | `false`      |                                                                                   |
| `label`     | `ReactNode`                    | `'Cart'`     | Idle label, shown as **+ CART**                                                   |
| `onAdded`   | `(r: AddToCartResult) => void` |              | Called after every click, e.g. BUY NOW → navigate to checkout                     |
| `className` | `string`                       |              | Classes on the wrapper                                                            |

Clicking calls `useCartStore.getState().addItem(toCartItem(product), qty)`. It then toasts **"Added to your pit stop"** (or "Max per collector reached" when capped), plays `useSound()('click')`, and runs a 1–2px engine shake.

| State      | Visible            | Accessible name                                | Enabled  |
| ---------- | ------------------ | ---------------------------------------------- | -------- |
| idle       | `+ CART`           | `Add {name} to cart`                           | yes      |
| just added | `✓ ADDED` (1.4s)   | `Added – {name} is in your pit stop (n)`       | yes      |
| in cart    | `+ IN PIT STOP ×n` | `In pit stop (n) – add another {name} to cart` | yes (+1) |
| at max     | `MAX IN CART`      | `Max in cart – …`                              | no       |
| sold out   | `SOLD OUT`         | `Sold out – {name}`                            | no       |

`data-state` is `idle | in-cart | max | sold-out`.

```tsx
<AddToCartButton product={product} size="lg" fullWidth />
<AddToCartButton product={product} label="Buy now" onAdded={() => navigate(ROUTES.checkout)} />
```

## `WishlistButton`

| Prop          | Type                           | Default      | Notes                                                             |
| ------------- | ------------------------------ | ------------ | ----------------------------------------------------------------- |
| `product`     | `Pick<Product,'id'\|'name'>`   | **required** |                                                                   |
| `variant`     | `'icon' \| 'button'`           | `'icon'`     | `button` = outline button with the text "Wishlist" / "Wishlisted" |
| `size`        | `'xs' \| 'sm' \| 'md' \| 'lg'` | `'md'`       | IconButton size; mapped to a Button size for `button`             |
| `iconVariant` | `'ghost' \| 'outline'`         | `'outline'`  |                                                                   |
| `fullWidth`   | `boolean`                      | `false`      | `button` variant only                                             |
| `className`   | `string`                       |              |                                                                   |

- Toggle semantics: `aria-pressed` = in the wishlist. The accessible name stays constant (`Save {name} to wishlist`); the tooltip changes with the state.
- Optimistic via `useWishlistActions` + `useIsWishlisted`.
- A signed-out click opens the sign-in prompt, and the car is saved after sign-in.
- The heart fills orange and **pops** (scale overshoot and ring burst), but only when the collector adds it — not when the wishlist hydrates.

## `AddToGarageButton`

| Prop        | Type                                    | Default       |
| ----------- | --------------------------------------- | ------------- |
| `product`   | `Pick<Product,'id'\|'name'>`            | **required**  |
| `size`      | `'sm' \| 'md' \| 'lg'`                  | `'md'`        |
| `fullWidth` | `boolean`                               | `false`       |
| `variant`   | `'secondary' \| 'outline' \| 'primary'` | `'secondary'` |
| `className` | `string`                                |               |

This adds the car to the collection, not the cart. It uses `useGarageActions`, which is optimistic and auth-gated.

1. Idle: **ADD TO GARAGE**. A click parks the car with the `rev` sound and an engine shake (only when signed in; signed-out visitors get the sign-in prompt and the car is parked after sign-in).
2. While saving, the button shows a loading state ("Parking…" / "Removing…").
3. Parked: **IN YOUR GARAGE ✓** (green, `×n` for duplicates).
4. Pressing it again arms **CONFIRM REMOVE?** (red) for 4 seconds, announced through a polite live region. Escape or blur cancels it, and a second press removes the car.

`data-state` is `idle | in-garage | confirm`.

## `StockStatus`

`stock: number`, `size?: 'sm' | 'md'` (`'md'`), `className?`. Uses `stockStatus()`:

| Stock | Text          | Dot                  | `data-status` |
| ----- | ------------- | -------------------- | ------------- |
| > 10  | `IN STOCK`    | green                | `in-stock`    |
| 1–10  | `ONLY 3 LEFT` | red, pulsing ("hot") | `low`         |
| 0     | `SOLD OUT`    | hollow grey ring     | `sold-out`    |

The text always carries the meaning, with an sr-only "Availability:" prefix; the dot is decorative. The root is an inline `<span>`.

## `CollectorMeta`

`product: Pick<Product, 'scale' | 'year' | 'vehicleType' | 'seriesName'>`, `layout?: 'inline' | 'stacked'` (`'inline'`), `showSeries?` (default: off inline, on stacked), `className?`.

- `inline`: a mono HUD line, `1:64 / 2025 / CONCEPT`.
- `stacked`: a 2-column spec grid.

Both are a `<dl>`, so screen readers hear "Scale 1:64, Year 2025, Type Concept". Empty values are skipped.

---

## Tests

`npx vitest run src/components/product`:

- `ProductCard`: key fields, price and compare-at, link, rating / "No reviews yet", collector tag, tab order, cart and wishlist actions, sold out.
- `AddToCartButton`: adds to the store and toasts, in-cart +1, `qty`, sold out, max, cap toast.
- `StockStatus`: all labels and the threshold.
- `ProductGrid`: loading, empty, items, priority.
- `HorizontalRail`: region, slides, `ariaLabel` alias.
- `CarImage`: error fallback.
