# ui-kit — component reference

> Written by the **ui-kit** agent. Later agents (layout, product, WF2 features) code against this file.
> Source: `src/components/ui/**`, `src/components/gamification/**`, `src/components/common/**`.
> Contract: `docs/ARCHITECTURE.md` §13. Names listed there are final; everything else here is additive.

```ts
import { Button, Modal, Tabs, TabPanel, FormField, Input } from '@/components/ui';
import { XpBar, BadgeGrid, LevelBadge } from '@/components/gamification';
import { DataState } from '@/components/common/DataState';
```

## Conventions (all components)

- Named exports, one exported component per file, `className` merged with `cn()`.
- Components that wrap a native focusable element use `forwardRef` (`Button`, `IconButton` → `HTMLElement`; `Input`, `Checkbox`, `StarRatingInput` → `HTMLInputElement`; `Textarea`, `Select`).
- Token colours only. Text on orange = `text-on-accent`; yellow (`highlight`) only for limited / vault / rare / achievements.
- Focus: the global orange `:focus-visible` ring is never removed. `clip-angled` is only used on decorative layers (the primary button's fill), never on the focusable element.
- Reduced motion: framer transforms are dropped globally by `<MotionConfig reducedMotion="user">`; components additionally switch to fade-only variants (`Modal`, `Drawer`), render final widths instantly (`ProgressBar`), and hide decorative sweeps/bursts (`Skeleton`, `Toaster`, `BadgeUnlockModal`) via `useReducedMotion()` / `motion-reduce:`.
- Every interactive element has hover / active / focus-visible / disabled and (where it does async work) loading states.

---

## Actions

### `Button`

Orange chamfered CTA (primary) with hover sheen + speed stripes, press-down on `:active`, spinner with a **stable width** while loading. Renders `<button>`, a router `<Link>` (`to`) or `<a>` (`href`).

| Prop                                                 | Type                                                                     | Default     | Notes                                                                                                  |
| ---------------------------------------------------- | ------------------------------------------------------------------------ | ----------- | ------------------------------------------------------------------------------------------------------ |
| `variant`                                            | `'primary' \| 'secondary' \| 'ghost' \| 'outline' \| 'danger' \| 'link'` | `'primary'` | primary = `bg-accent` + `text-on-accent`; danger = red fill + white text (5.0:1)                       |
| `size`                                               | `'sm' \| 'md' \| 'lg'`                                                   | `'md'`      | 36 / 44 / 56 px tall                                                                                   |
| `loading`                                            | `boolean`                                                                | `false`     | spinner, `aria-busy`, `aria-disabled`, clicks blocked, **focus kept** (not natively disabled)          |
| `loadingText`                                        | `ReactNode`                                                              | —           | replaces the label while loading (width reserved up-front, accessible name switches to it)             |
| `leftIcon` / `rightIcon`                             | `ReactNode`                                                              | —           | decorative (`aria-hidden`); right icon nudges on hover                                                 |
| `fullWidth`                                          | `boolean`                                                                | `false`     |                                                                                                        |
| `to`                                                 | `To`                                                                     | —           | react-router `<Link>`; also `replace`, `state`, `preventScrollReset`                                   |
| `href`                                               | `string`                                                                 | —           | `<a>`; absolute http(s) → `target="_blank" rel="noopener noreferrer"` + sr-only "(opens in a new tab)" |
| `type`                                               | `'button' \| 'submit' \| 'reset'`                                        | `'button'`  |                                                                                                        |
| `disabled`                                           | `boolean`                                                                | `false`     | native disabled; a disabled link renders a non-focusable `role="link" aria-disabled` span              |
| `target`, `rel`, `download`, `form`, `name`, `value` | native                                                                   |             |                                                                                                        |
| `onClick`                                            | `MouseEventHandler<HTMLElement>`                                         |             | not called while loading/disabled                                                                      |
| …rest                                                | `HTMLAttributes<HTMLElement>`                                            |             | `aria-*`, `data-*` (e.g. `data-autofocus`), `id`, `title`…                                             |

```tsx
<Button size="lg" rightIcon={<ArrowRight />} to={shopPath()}>Explore collection</Button>
<Button type="submit" loading={mutation.isPending} loadingText="Starting engine…">Place order</Button>
<Button variant="secondary" leftIcon={<RotateCcw />} onClick={() => void refetch()}>Try again</Button>
```

`buttonClasses({ variant, size, fullWidth, interactive, loading, className })` returns the root class string (e.g. to style a `NavLink` like a button — note the primary orange fill is a child layer that only `<Button>` renders). `buttonGapClass(size)`, `isExternalHref(href)` are exported too.

### `IconButton`

| Prop                                                               | Type                                          | Default               | Notes                                                                     |
| ------------------------------------------------------------------ | --------------------------------------------- | --------------------- | ------------------------------------------------------------------------- |
| `label`                                                            | `string`                                      | **required**          | `aria-label` + native tooltip (`title`, overridable)                      |
| `icon`                                                             | `ReactNode`                                   | **required**          |                                                                           |
| `variant`                                                          | `'ghost' \| 'outline' \| 'solid' \| 'danger'` | `'ghost'`             | solid = orange fill                                                       |
| `size`                                                             | `'xs' \| 'sm' \| 'md' \| 'lg'`                | `'md'`                | 28 / 36 / 40 / 48 px                                                      |
| `loading`                                                          | `boolean`                                     |                       | spinner replaces the icon                                                 |
| `pressed`                                                          | `boolean`                                     |                       | toggle → `aria-pressed` + orange active style                             |
| `badge`                                                            | `number`                                      |                       | `CountBadge` overlay (hidden at 0); count appended to the accessible name |
| `badgeMax` / `badgeLabel` / `badgeTone`                            | `number` / `string` / tone                    | `99` / — / `'accent'` | name becomes e.g. `"Pit stop cart (3 items)"`                             |
| `to` / `href` / `target` / `rel` / `type` / `disabled` / `onClick` |                                               |                       | as `Button`                                                               |

```tsx
<IconButton label="Pit stop cart" icon={<ShoppingCart />} to={ROUTES.cart} badge={count} badgeLabel="items" />
<IconButton label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'} pressed={wishlisted}
  icon={<Heart className={wishlisted ? 'fill-current' : undefined} />} onClick={toggle} loading={isPending} />
```

---

## Tags, counts & status

### `Chip`

| Prop                       | Type                                                                       | Default              | Notes                                                      |
| -------------------------- | -------------------------------------------------------------------------- | -------------------- | ---------------------------------------------------------- |
| `children`                 | `ReactNode`                                                                |                      | mono uppercase label                                       |
| `tone`                     | `'neutral' \| 'accent' \| 'danger' \| 'highlight' \| 'success' \| 'metal'` | `'neutral'`          | danger = "hot", highlight = rare only                      |
| `variant`                  | `'solid' \| 'soft' \| 'outline'`                                           | `'soft'`             | all combinations AA in both themes                         |
| `size`                     | `'sm' \| 'md' \| 'lg'`                                                     | `'md'`               | 24 / 28 / 36 px (use `lg` for filter chips = touch target) |
| `icon`                     | `ReactNode`                                                                |                      |                                                            |
| `onClick`                  | `() => void`                                                               |                      | makes it a toggle `<button aria-pressed>`                  |
| `selected`                 | `boolean`                                                                  |                      | orange selected state + check icon (toggle chips)          |
| `onRemove` / `removeLabel` | `() => void` / `string`                                                    | / `"Remove <label>"` | adds an accessible × button                                |
| `disabled`, `title`        |                                                                            |                      |                                                            |

```tsx
<Chip tone="danger" variant="solid" size="sm" icon={<Flame />}>Hot</Chip>
<Chip size="lg" selected={colors.includes('red')} onClick={() => toggleColor('red')}>Red</Chip>
<Chip onRemove={() => clearFilter('make')}>Porsche</Chip>
```

### `RarityChip`

`rarity: Rarity`, `size?: ChipSize` (`'sm'`), `showIcon?` (true). common → neutral soft · rare → yellow outline + star · super-rare → yellow soft + sparkles · limited → solid yellow + gem. Label from `rarityLabel()`, sr-only "Rarity:" prefix.

```tsx
<RarityChip rarity={product.rarity} />
```

### `CountBadge`

| Prop         | Type                                               | Default    | Notes                                                        |
| ------------ | -------------------------------------------------- | ---------- | ------------------------------------------------------------ |
| `count`      | `number`                                           |            | hidden at 0 unless `showZero`                                |
| `max`        | `number`                                           | `99`       | `99+`                                                        |
| `label`      | `string`                                           |            | sr-only context ("items in your pit stop")                   |
| `showZero`   | `boolean`                                          | `false`    |                                                              |
| `tone`       | `'accent' \| 'danger' \| 'highlight' \| 'neutral'` | `'accent'` |                                                              |
| `size`       | `'sm' \| 'md'`                                     | `'md'`     |                                                              |
| `decorative` | `boolean`                                          | `false`    | `aria-hidden` (when the parent's name already has the count) |

Pops (scale) when the number changes.

### `Spinner`

`size?: 'xs' | 'sm' | 'md' | 'lg'` (`'md'`), `label?: string` (sr-only, default `"Loading"`; `''` = decorative, `aria-hidden`), `tone?: 'accent' | 'current'`. Racing-wheel arc; `role="status"` when labelled.

### `Skeleton`

`variant?: 'block' | 'text' | 'circle'` (`'block'`), `lines?: number` (text; last line shorter), `className` (size/shape), `style`. Core `.shimmer` base + two thin orange **diagonal speed stripes** sweeping across; static under reduced motion. Always `aria-hidden` — wrap groups in `DataState` (or a `role="status"` element).

```tsx
<Skeleton className="aspect-[4/3] rounded-xl" />
<Skeleton variant="text" lines={3} />
<Skeleton variant="circle" className="h-12 w-12" />
```

### `ProgressBar`

| Prop                       | Type                                                          | Default                | Notes                                                                                       |
| -------------------------- | ------------------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------- |
| `value`                    | `number`                                                      |                        | clamped to `0..max`                                                                         |
| `max`                      | `number`                                                      | `100`                  | additive: lets you pass raw values (`37` of `500`)                                          |
| `label`                    | `string`                                                      | **required**           | `aria-label` (and visible caption with `showLabel`)                                         |
| `tone`                     | `'accent' \| 'highlight' \| 'success' \| 'danger' \| 'metal'` | `'accent'`             | highlight = vault / achievements                                                            |
| `size`                     | `'xs' \| 'sm' \| 'md' \| 'lg'`                                | `'sm'`                 | 4 / 6 / 10 / 14 px                                                                          |
| `showValue` / `valueLabel` | `boolean` / `ReactNode`                                       | / `"72%"`              | mono value above the bar, e.g. `"37 LEFT"`                                                  |
| `valueText`                | `string`                                                      | `valueLabel` if string | `aria-valuetext`                                                                            |
| `showLabel`                | `boolean`                                                     | `false`                | HUD caption                                                                                 |
| `animated`                 | `boolean`                                                     | `true`                 | fills from 0 when scrolled into view (framer `useInView`, once); instant for reduced motion |
| `segments`                 | `number`                                                      |                        | tachometer segments (mask)                                                                  |
| `striped`                  | `boolean`                                                     |                        | racing-livery stripes on the fill                                                           |

`role="progressbar"` with `aria-valuemin/max/now/valuetext`.

```tsx
<ProgressBar
  value={info.claimedPct}
  label="Edition claimed"
  tone="highlight"
  showValue
  valueLabel={`ONLY ${info.remaining} REMAINING`}
/>
```

### `StatBar`

"Meet the Machine" row. `label: string`, `value: number`, `max: number`, `display?: string` (default `value/max`), `tone?`, `animateOnView?` (true), `icon?`, `segments?` (10; `0` = smooth), `size?: 'sm' | 'md'`.

```tsx
<StatBar label="TOP SPEED" value={product.themedStats.topSpeedKmh} max={400} display={`${product.themedStats.topSpeedKmh} KM/H`} icon={<Gauge />} />
<StatBar label="RARITY" value={product.rarityScore} max={10} tone="highlight" />
```

### `StarRating`

`value: number` (0–5; drawn to the nearest half, announced to 1 decimal), `count?: number`, `size?: 'sm' | 'md' | 'lg'`, `showValue?`. `role="img"` with `aria-label="Rated 4.5 out of 5, 23 ratings"`. Stars are orange (accent icon use).

```tsx
<StarRating value={product.ratingAvg} count={product.ratingCount} size="sm" />
```

### `PriceTag`

`price: number`, `compareAtPrice?: number | null`, `size?: 'sm' | 'md' | 'lg' | 'xl'` (`'md'`), `showDiscount?` (true). Mono `formatINR`; when discounted: struck-through compare price with sr-only ", was ₹…" and a red `−20%` tag (sr ", 20% off").

```tsx
<PriceTag price={product.price} compareAtPrice={product.compareAtPrice} size="lg" />
```

### `HudReadout`

`label: string`, `value: ReactNode`, `unit?: string`, `tone?: 'default' | 'accent' | 'highlight'`, `size?: 'sm' | 'md' | 'lg'`, `align?: 'left' | 'center' | 'right'`.

```tsx
<HudReadout label="CARS OWNED" value={formatNumber(stats.carsOwned)} />
<HudReadout label="RPM" value="8,200" tone="accent" size="lg" />
```

### `Kbd`

`children`. `<Kbd>Ctrl</Kbd> <Kbd>K</Kbd>`.

---

## Overlays & feedback

### `Modal`

| Prop                                             | Type                                  | Default            | Notes                                                   |
| ------------------------------------------------ | ------------------------------------- | ------------------ | ------------------------------------------------------- |
| `open` / `onClose`                               | `boolean` / `() => void`              | **required**       |                                                         |
| `title`                                          | `ReactNode`                           | **required**       | `h2`, labels the dialog                                 |
| `description`                                    | `ReactNode`                           |                    | `aria-describedby`                                      |
| `eyebrow`                                        | `ReactNode`                           |                    | mono HUD line above the title                           |
| `children` / `footer`                            | `ReactNode`                           |                    | footer = action row (stacked on mobile)                 |
| `size`                                           | `'sm' \| 'md' \| 'lg' \| 'xl'`        | `'md'`             | bottom sheet on phones                                  |
| `initialFocusRef`                                | `RefObject<HTMLElement \| null>`      |                    | else `[data-autofocus]`, else first control (not the ×) |
| `closeOnOverlayClick` / `closeOnEsc`             | `boolean`                             | `true` / `true`    |                                                         |
| `hideCloseButton` / `closeLabel`                 | `boolean` / `string`                  | / `"Close dialog"` |                                                         |
| `tone`                                           | `'accent' \| 'highlight' \| 'danger'` | `'accent'`         | top stripe (racing stripe / gold / red)                 |
| `className` / `bodyClassName` / `onExitComplete` |                                       |                    |                                                         |

Portal → focus trap (Tab/Shift+Tab cycle, stray focus pulled back, nested layers: top-most wins) → Escape → body scroll lock (ref-counted) → focus returns to the trigger as soon as it starts closing. Enter: slide-up + fade; reduced motion: fade only.

```tsx
<Modal
  open={open}
  onClose={close}
  title="Remove from garage?"
  description="Your XP stays."
  footer={
    <>
      <Button variant="ghost" onClick={close}>
        Cancel
      </Button>
      <Button variant="danger" data-autofocus="" onClick={remove}>
        Remove
      </Button>
    </>
  }
/>
```

### `Drawer`

Same a11y as `Modal`. Props: `open`, `onClose`, `side?: 'left' | 'right' | 'bottom'` (`'right'`), `title`, `description?`, `eyebrow?`, `children`, `footer?` (sticky), `size?: 'sm' | 'md' | 'lg' | 'full'` (`'md'`), `initialFocusRef?`, `closeOnOverlayClick?`, `closeOnEsc?`, `hideCloseButton?`, `closeLabel?` (`"Close panel"`), `className?`, `bodyClassName?`, `onExitComplete?`. Slides from `side` (fade for reduced motion); racing stripe on the inner edge. `z-drawer` (below `Modal`).

```tsx
<Drawer open={mobileNavOpen} onClose={closeMobileNav} side="left" title={BRAND_LOGO_TEXT}>
  …
</Drawer>
```

### `Toaster`

Mount **once** (AppLayout). `position?: 'bottom-right' | 'top-center'` (bottom-right on desktop, full-width bottom on phones), `className?`. Renders `useToasts()`; each toast auto-dismisses after `toast.duration` (Infinity = sticky) with a draining progress line; timers **pause** while the stack is hovered, focused, or the tab is hidden; × dismiss button per toast. Announcements go through persistent live regions (polite; **assertive for `error`**). Variants: default (metal), success (green), error (red), **achievement** (yellow border/glow, gold trophy tile, shine sweep).

```ts
toast.success('Added to your pit stop', product.name);
toast.error("Couldn't park that car", getFriendlyErrorMessage(err));
toast.achievement('BADGE UNLOCKED', 'Treasure Hunter · +150 XP', '💎');
```

### `EmptyState`

`title: string`, `description?`, `action?`, `icon?` (default car; `null` hides), `variant?: 'default' | 'plain'` (dashed "empty parking bay" panel vs frameless), `size?: 'sm' | 'md' | 'lg'`, `titleAs?: 'h2' | 'h3' | 'h4' | 'p'` (`'h3'`).

```tsx
<EmptyState
  icon={<ShoppingCart />}
  title="Your pit stop is empty"
  description="Grab a ride from the garage."
  action={<Button to={shopPath()}>Explore the garage</Button>}
  titleAs="h2"
/>
```

### `ErrorState`

`title?` (`"ENGINE TROUBLE"`), `error?: unknown` (→ `getFriendlyErrorMessage`), `message?` (wins), `onRetry?`, `retryLabel?` (`"Try again"`), `retrying?` (loading on the button), `compact?` (inline row), `titleAs?`. `role="alert"`.

```tsx
<ErrorState error={query.error} onRetry={() => void query.refetch()} retrying={query.isFetching} />
```

### `Portal`

`children`, `container?: Element | null` (default `document.body`). Synchronous `createPortal`.

---

## Navigation

### `Tabs` + `TabPanel`

`Tabs<T extends string>`:

| Prop                 | Type                                                                                               | Default       | Notes                                                                                                |
| -------------------- | -------------------------------------------------------------------------------------------------- | ------------- | ---------------------------------------------------------------------------------------------------- |
| `items`              | `ReadonlyArray<{ id: T; label: ReactNode; badge?: number; icon?: ReactNode; disabled?: boolean }>` |               |                                                                                                      |
| `value` / `onChange` | `T` / `(id: T) => void`                                                                            |               | controlled                                                                                           |
| `label`              | `string`                                                                                           | **required**  | tablist `aria-label`                                                                                 |
| `idPrefix`           | `string`                                                                                           | **required**  | ids `${idPrefix}-tab-${id}` / `${idPrefix}-panel-${id}` (`tabId()`, `tabPanelId()` helpers exported) |
| `variant`            | `'underline' \| 'pill'`                                                                            | `'underline'` | orange underline / pill slides between tabs (framer `layoutId`)                                      |
| `size`               | `'sm' \| 'md'`                                                                                     | `'md'`        |                                                                                                      |
| `activation`         | `'automatic' \| 'manual'`                                                                          | `'automatic'` | manual: arrows move focus, Enter/Space select                                                        |
| `fullWidth`          | `boolean`                                                                                          |               |                                                                                                      |

Keyboard: ←/→ (wrap, disabled tabs skipped), Home/End; roving tabindex. The row scrolls horizontally on small screens.

`TabPanel`: `idPrefix`, `tabId`, `active`, `children`, `keepMounted?` (keep hidden children mounted), `className?`. Always rendered (so `aria-controls` resolves), `hidden` when inactive, `tabIndex=0`, fades in.

```tsx
<Tabs
  items={GARAGE_TAB_ITEMS}
  value={tab}
  onChange={setTab}
  label="Garage sections"
  idPrefix="garage"
/>;
{
  GARAGE_TAB_ITEMS.map((t) => (
    <TabPanel key={t.id} idPrefix="garage" tabId={t.id} active={tab === t.id}>
      {renderTab(t.id)}
    </TabPanel>
  ));
}
```

---

## Forms (all react-hook-form friendly)

### `FormField`

| Prop                        | Type                                                                        | Notes                                                              |
| --------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `label`                     | `string`                                                                    | `<label htmlFor>`                                                  |
| `htmlFor`                   | `string`                                                                    | control id; hint id `${htmlFor}-hint`, error id `${htmlFor}-error` |
| `error` / `hint`            | `string`                                                                    | error shown in `text-danger-ink` with an icon                      |
| `required` / `optional`     | `boolean`                                                                   | orange `*` + sr "(required)" / muted "(optional)"                  |
| `hideLabel` / `labelAction` | `boolean` / `ReactNode`                                                     |                                                                    |
| `children`                  | `ReactNode \| (field: { id, describedBy, invalid, required }) => ReactNode` | render-function form wires ARIA for you                            |

```tsx
<FormField
  label="Pincode"
  htmlFor="pincode"
  required
  error={errors.pincode?.message}
  hint="6 digits"
>
  {(f) => (
    <Input
      id={f.id}
      inputMode="numeric"
      aria-describedby={f.describedBy}
      invalid={f.invalid}
      {...register('pincode')}
    />
  )}
</FormField>
```

Helpers: `fieldDescribedBy(id, { hint, error })`, `fieldHintId(id)`, `fieldErrorId(id)`, `joinIds(...ids)`, `fieldClasses({ size, multiline, className })`.

### `Input`

Native input props + `invalid?` (→ `aria-invalid`, red border/ring), `leftIcon?` (decorative; turns orange on focus), `rightSlot?` (interactive, e.g. clear button), `size?: 'sm' | 'md' | 'lg'` (`'md'` = 44px), `containerClassName?` (wrapper only exists with icon/slot). 16px text on mobile (no iOS zoom).

### `Textarea`

Native props + `invalid?`, `showCount?` (counter `120 / 1,000`, turns orange at 90% and red at the limit; stays correct after RHF `reset()`), `containerClassName?`.

### `Select`

Native select + `options?: { value; label; disabled? }[]`, `placeholder?` (disabled `""` option), `invalid?`, `size?`, `leftIcon?`, `containerClassName?` (put layout classes like `flex-1` here). `children` options are appended.

```tsx
<Select
  id="state"
  placeholder="Select state"
  options={INDIAN_STATES.map((s) => ({ value: s, label: s }))}
  {...register('state')}
/>
```

### `Checkbox`

Native checkbox props + `label: ReactNode`, `description?`, `invalid?`, `indeterminate?`, `hideLabel?`, `containerClassName?`.

### `RadioGroup<T extends string>`

`name`, `value: T | null | undefined`, `onChange(value: T)`, `options: { value: T; label; description?; icon?; disabled? }[]`, `legend: string`, `orientation?: 'vertical' | 'horizontal'`, `variant?: 'default' | 'card'` (card = selectable tiles with orange selected state; focus ring around the whole tile), `columns?: 1 | 2 | 3` (card grid), `hideLegend?`, `disabled?`, `invalid?`, `required?`, `hint?`, `error?`. Native radios in a `<fieldset>` (browser arrow-key navigation).

```tsx
<RadioGroup
  name="payment"
  legend="Payment method"
  variant="card"
  columns={3}
  value={method}
  onChange={setMethod}
  options={PAYMENT_METHOD_OPTIONS.map((o) => ({
    value: o.id,
    label: o.label,
    description: o.description,
    icon: <o.icon />,
  }))}
/>
```

### `StarRatingInput`

`value` (0 = none), `onChange(n)`, `label: string`, `name?`, `disabled?`, `invalid?`, `required?`, `size?: 'md' | 'lg'`, `hideLabel?`, `showValueLabel?` (true → "Great"), `aria-describedby?`. `role="radiogroup"` of native radios; ←/→/↑/↓ change, Home/End = 1/5. Ref points at the focusable radio (use with RHF `Controller`).

```tsx
<Controller
  control={control}
  name="rating"
  render={({ field, fieldState }) => (
    <StarRatingInput
      ref={field.ref}
      label="Your rating"
      value={field.value}
      onChange={field.onChange}
      invalid={!!fieldState.error}
    />
  )}
/>
```

### `RangeSlider`

| Prop                                                      | Type                            | Default                   | Notes                                             |
| --------------------------------------------------------- | ------------------------------- | ------------------------- | ------------------------------------------------- |
| `min` / `max` / `step`                                    | `number`                        | / / `1`                   |                                                   |
| `value`                                                   | `readonly [number, number]`     |                           | controlled                                        |
| `onChange`                                                | `(v: [number, number]) => void` |                           | continuous                                        |
| `onCommit`                                                | `(v) => void`                   |                           | pointer up / key up — use for URL / query updates |
| `label`                                                   | `string`                        | **required**              | group label                                       |
| `formatValue`                                             | `(n) => string`                 | `formatINR`               | readout + `aria-valuetext`                        |
| `minDistance`                                             | `number`                        | `0`                       | thumbs never cross                                |
| `thumbLabels`                                             | `[string, string]`              | `Minimum/Maximum {label}` |                                                   |
| `disabled`, `showValues` (true), `showScale`, `hideLabel` |                                 |                           |                                                   |

Two `role="slider"` thumbs: arrows ±step, PageUp/PageDown ±10%, Home/End to the allowed bounds; pointer drag anywhere on the track moves the nearest thumb.

```tsx
<RangeSlider
  label="Price"
  min={0}
  max={2500}
  step={50}
  value={draft}
  onChange={setDraft}
  onCommit={applyPriceFilter}
/>
```

### `QuantityStepper`

`value`, `onChange(n)`, `min?` (1), `max` (e.g. `Math.min(stock, MAX_QTY_PER_ITEM)`), `label: string` (group + spinbutton name), `size?: 'sm' | 'md'`, `disabled?`, `loading?` (spinner, blocks input), `decrementLabel?` / `incrementLabel?` (`"Decrease quantity"` / `"Increase quantity"`), `id?`. Always clamped; typing commits on blur/Enter; ↑/↓ step, Home/End jump, Esc reverts; boundary buttons use `aria-disabled` so focus is kept.

```tsx
<QuantityStepper
  value={item.qty}
  max={Math.min(item.stock, MAX_QTY_PER_ITEM)}
  label={`Quantity of ${item.name}`}
  onChange={(qty) => setQty(item.productId, qty)}
  size="sm"
/>
```

---

## Layout & typography

### `SectionHeading`

`eyebrow?: string` (HUD), `index?: number` (→ decorative `// 02 —` prefix), `title: ReactNode`, `description?`, `action?`, `as?: 'h1' | 'h2' | 'h3'` (`'h2'`), `align?: 'left' | 'center'`, `id?` (for `aria-labelledby`), `size?: 'sm' | 'md' | 'lg' | 'xl'` (defaults by level), `className?`, `titleClassName?`.

```tsx
<section aria-labelledby="ride-title">
  <SectionHeading
    id="ride-title"
    index={2}
    eyebrow="CHOOSE YOUR RIDE"
    title="Pick your class"
    action={
      <Button variant="outline" to={shopPath()}>
        View all
      </Button>
    }
  />
</section>
```

### `Container`

`as?: ElementType` (`'div'`), `size?: 'content' | 'narrow' | 'wide'` (1280 / 768 / 1440), `className`, native attrs. `mx-auto w-full px-4 sm:px-6 lg:px-8`.

### `VisuallyHidden`

`children`, `as?` (`'span'`), `id?`.

---

## Hooks & utilities (from `@/components/ui`)

- `useFocusTrap(ref, { active, onEscape?, initialFocusRef?, returnFocus? })` — dialog focus management (layer stack; only the top-most layer handles Esc/Tab). `getTabbableElements(container)`.
- `useOverlayBehavior(panelRef, { onClose, closeOnEsc?, initialFocusRef?, returnFocus? })` — scroll lock + focus trap + Esc for a panel rendered inside `<AnimatePresence>` (releases when exit starts). Use it to build custom overlays (e.g. the command palette).
- `mergeRefs(...refs)` — combine callback/object refs.

---

## Gamification (`@/components/gamification`)

| Component          | Props                                                                                                                                                     | Notes                                                                                                                                                                                                                                             |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `LevelBadge`       | `level: number`, `size?: 'sm' \| 'md' \| 'lg'`, `showTitle?` (rank via `levelTitle`), `showLabel?` (true, `LEVEL 07`)                                     | orange hex medallion; yellow at level ≥ 20; sr "Level 7, Street Racer"                                                                                                                                                                            |
| `XpBar`            | `xp: number`, `showLabels?` (true: `LEVEL 07` · `1,240 XP` · `160 XP TO LEVEL 08`), `size?: 'sm' \| 'md'`, `animated?`                                    | uses shared `xpProgress` + `ProgressBar`                                                                                                                                                                                                          |
| `BadgeCard`        | `badgeId`, `unlocked`, `progress?: BadgeProgress`, `size?: 'sm' \| 'md'`, `showProgress?` (true), `headingAs?`                                            | locked: grayscale emoji + lock + progress `3/10`; unlocked: `BADGE_UI` tone border + glow + "UNLOCKED"                                                                                                                                            |
| `BadgeGrid`        | `unlocked?: readonly BadgeId[]` (server truth; falls back to stats), `stats?: Partial<UserStats>`, `size?`, `columns?: 1 \| 2 \| 3 \| 5`, `showProgress?` | all `BADGES` in order, `<ul>`                                                                                                                                                                                                                     |
| `BadgeUnlockModal` | `badgeId: BadgeId \| null`, `open`, `onClose`, `queueCount?`, `onViewAll?`                                                                                | celebration burst (rays + sparks; static glow for reduced motion), XP chip, "Keep racing" / "Next badge (n more)" + "View achievements" (→ `/garage?tab=achievements`)                                                                            |
| `BadgeWatcher`     | none                                                                                                                                                      | mount once in AppLayout (inside the router). Diffs `useAuth().profile` badges/level: `toast.achievement` per unlock + queued `BadgeUnlockModal`; level-up toast. **Never fires** on the first profile load, a user switch, or sign-out → sign-in. |

Pure helpers: `diffBadgeSnapshots(prev, next)`, `snapshotFromProfile(profile)`.

```tsx
<LevelBadge level={profile.level} size="lg" showTitle />
<XpBar xp={profile.xp} />
<BadgeGrid unlocked={profile.badges} stats={profile.stats} />
```

---

## Common (`@/components/common/*`)

### `DataState` (new)

| Prop                                                      | Type                           | Notes                                                                           |
| --------------------------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------- |
| `isLoading` / `isError`                                   | `boolean`                      |                                                                                 |
| `error` / `onRetry`                                       | `unknown` / `() => void`       | → `ErrorState` with retry                                                       |
| `isEmpty` / `empty`                                       | `boolean` / `ReactNode`        | default generic `EmptyState`                                                    |
| `skeleton`                                                | `ReactNode`                    | default: 3 card skeletons; wrapped in `role="status" aria-busy` + sr "Loading…" |
| `errorTitle`, `errorCompact`, `loadingLabel`, `className` |                                |                                                                                 |
| `children`                                                | `ReactNode \| () => ReactNode` | function form runs only when data is ready                                      |

```tsx
<DataState
  isLoading={q.isLoading}
  isError={q.isError}
  error={q.error}
  onRetry={() => void q.refetch()}
  isEmpty={(q.data?.length ?? 0) === 0}
  skeleton={<ProductGridSkeleton />}
  empty={<EmptyState title="No cars match" />}
>
  {() => <ProductGrid products={q.data ?? []} />}
</DataState>
```

### Reworked (same exports & props as core's originals)

- `RequireAuth({ reason?, children })` — skeleton while auth resolves; inline **PIT PASS REQUIRED** panel with a `Button` (Google mark, loading "Opening Google…") + "Keep browsing".
- `RouteErrorBoundary` — 404 / stale-deploy / crash copy with `Button`s (reload, back to the garage).
- `ErrorBoundary({ fallback?, label?, onError?, onReset?, resetKeys? })` — default fallback is a compact `ErrorState` ("<label> stalled" + Try again).
- `RouteFallback({ label?, fullScreen?, className? })` — racing loader (`aria-busy`).
- `PageStub({ title, eyebrow?, description?, children? })` — now built on `Container` + `SectionHeading`.
- `RootLayout` — core glue, unchanged.

---

## Tests

`npx vitest run src/components` — Tabs (keyboard / roving tabindex / manual mode), Modal (labelling, focus in, Esc, trap, focus return, backdrop, data-autofocus), QuantityStepper (clamping, typing, keys, disabled), RangeSlider (ARIA, arrows, PageUp/Down, Home/End, min distance, commit, disabled), Button/IconButton, StarRatingInput/StarRating, Toaster (live regions, dismiss, auto-dismiss + hover pause, sticky), DataState, badge snapshot diffing and BadgeWatcher (no toasts on first load / user switch).
