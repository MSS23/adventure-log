# Adventure Log — Design Overhaul Spec (single source of truth)

Read this BEFORE restyling any page. Consistency beats personal taste.
Constraints: no functional changes, both themes must work, no new packages,
never touch globe/embed code, never break test-asserted strings.

## Diagnosis (why the app feels dated — fix these everywhere you find them)

- Three competing card systems: `al-card` (CSS), `instagramStyles.card` (stone/olive + hardcoded `#111111`), and ad-hoc `bg-white dark:bg-[#1B170E]` divs. → Use ONE recipe (below).
- Hardcoded dark hexes (`#111111`, `#1A1A1A`, `#252525`) and `stone-*`/`gray-*` classes fight the warm umber palette. → Replace with semantic tokens.
- Gradient stat cards with `border-2`, glow shadows, glass cards, gradient icon circles in page headers = visual noise. → Flat, bordered, calm surfaces.
- Mixed radii (`rounded-lg`, `xl`, `2xl`, `[20px]`, `[22px]`) and mixed shadow philosophies (shadow-sm→md hover, shadow-2xl, glow). → One radius + one shadow rule.
- Skeletons hand-rolled with `bg-stone-200 dark:bg-stone-700`. → Use `<Skeleton />` (`bg-muted`).
- Headers inconsistent: some pages have eyebrow+serif, others icon-circle+bold sans. → One PAGE HEADER pattern.

## 1. Design principles

- **Calm**: one accent moment per view; everything else neutral cream/umber surfaces.
- **Editorial**: mono eyebrow → Playfair serif heading → muted subtitle, generous whitespace.
- **Airy**: fewer boxes; let `bg-background` breathe — don't wrap everything in a card.
- **Warm**: semantic tokens only (they're already warm); never cool grays.
- **Legible**: body text ≥ `text-sm`, `text-muted-foreground` is the FLOOR for contrast; strong scrims on photos.

## 2. Page scaffold

```tsx
// Page container (inside the app layout's padding)
<div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 py-6 md:py-8 space-y-8">
```
- Narrow content pages (settings, forms, single column): `max-w-2xl` or `max-w-3xl`.
- Vertical rhythm between page sections: `space-y-8` (page level), `space-y-4` inside a section. Avoid `space-y-5/7/9`, avoid mixing `mt-*` soup — prefer parent `space-y-*`/`gap-*`.
- Gap scale: use only `gap-2, gap-3, gap-4, gap-6, gap-8`. Avoid `gap-5, gap-7`.

**PAGE HEADER (every top-level page):**
```tsx
<header className="space-y-1">
  <p className="al-eyebrow">Library</p>                {/* mono uppercase eyebrow */}
  <h1 className="al-display text-3xl md:text-4xl">Albums</h1>
  <p className="text-sm text-muted-foreground">12 albums across 6 countries</p>
</header>
```
Actions (e.g. "New" button) sit right of the header: wrap header+actions in
`<div className="flex flex-wrap items-end justify-between gap-4">`. NO gradient
icon circles next to page titles — delete them where found.

**SECTION HEADER (within a page):**
```tsx
<div className="flex items-end justify-between gap-4">
  <div>
    <p className="al-eyebrow mb-0.5">Work in progress</p>
    <h2 className="al-display text-xl md:text-2xl">Drafts</h2>
  </div>
  {/* optional "View all" → <Button variant="ghost" size="sm"> or text link */}
</div>
```

## 3. Cards — ONE shadow philosophy

**Rule: resting cards = border + flat (shadow-none). Shadow appears ONLY on hover of interactive cards.** Forbidden: `shadow-2xl/3xl`, glow shadows, `glassCard`, `backdrop-blur` on content cards, `border-2`, gradient card backgrounds, double borders (card-in-card both with borders).

```tsx
// Default (static) card
<div className="rounded-2xl border border-border bg-card p-5">

// Interactive / hover card (clickable tile)
<Link className="group block rounded-2xl border border-border bg-card p-5
  transition-all duration-200 hover:border-primary/30 hover:shadow-md hover:-translate-y-0.5
  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">

// Stat tile (dashboard/profile numbers)
<div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
  <p className="al-eyebrow">Countries</p>
  <p className="al-stat-value text-3xl md:text-4xl mt-1">12</p>
  <p className="text-xs text-muted-foreground mt-1">+2 this year</p>
</div>

// List row (settings, activity, search results)
<div className="flex items-center gap-3 rounded-xl px-3 py-2.5
  transition-colors hover:bg-muted/60">
```
- Inner panel inside a card (the ONLY nesting allowed): `rounded-xl bg-muted/50 p-4` — no border.
- The shadcn `<Card>` component is acceptable as-is; do not add extra shadow classes to it.
- Radius ladder: cards `rounded-2xl`, inner panels/inputs/buttons `rounded-xl`, chips/avatars `rounded-full`. Never `rounded-lg` on cards, never arbitrary `rounded-[Npx]`.

## 4. Typography ladder

| Role | Classes |
|---|---|
| Display (hero) | `al-display text-4xl md:text-5xl` |
| H1 (page title) | `al-display text-3xl md:text-4xl` |
| H2 (section) | `al-display text-xl md:text-2xl` |
| H3 (card title) | `font-heading text-base md:text-lg font-semibold text-foreground` |
| Body | `text-sm md:text-[15px] leading-relaxed text-foreground` |
| Secondary body | `text-sm text-muted-foreground` |
| Caption / meta | `text-xs text-muted-foreground` (add `font-mono tracking-wide` for data-ish meta: dates, counts) |
| Eyebrow / label | `al-eyebrow` (already mono uppercase) |

Never: `font-bold` on serif headings (use the classes above), `text-stone-*`, `text-gray-*`, opacity-faded foreground like `text-foreground/50` for body copy.

## 5. Color usage rules

- **primary (forest/olive)**: the action color — primary buttons, active nav, selected states, links, focus rings, progress. One primary CTA per view.
- **accent (terracotta/coral)**: rare highlight — "hero" CTA moments, like/love states, small celebratory marks (streaks, new badges). Never large coral surfaces; never coral + forest competing in one component.
- **muted-foreground**: ALL secondary text. **muted**: subtle fills (hover rows, inner panels, skeletons).
- Replace on sight: `stone-*` / `gray-*` / `zinc-*` text & borders → `text-muted-foreground` / `border-border`; `bg-white dark:bg-[#...]` → `bg-card`; `dark:bg-[#1A1A1A]` etc → `bg-muted` or `bg-card`.

**Semantic status chips (work in both themes):**
```tsx
// success
"bg-primary/10 text-primary border border-primary/20"
// warning
"bg-[color:var(--color-gold)]/15 text-[color:var(--color-gold)] border border-[color:var(--color-gold)]/25"
// error
"bg-destructive/10 text-destructive border border-destructive/20"
// info / neutral
"bg-muted text-muted-foreground border border-border"
```
All chips: `inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium`.

## 6. Buttons & inputs

Use existing `ui/button` variants — do not invent new button class strings:
- Page hero CTA (max one per page): `variant="coral"` (pill).
- Standard primary action: `variant="default"`.
- Secondary: `variant="outline"`; tertiary/inline: `variant="ghost"`; destructive: `variant="destructive"`.
- Pills (`size="pill"` or coral) are for hero/filter-chip contexts; everything else stays `rounded-xl` (built into sizes).
- Stop passing `instagramStyles.button.*` or `bg-olive-600 hover:bg-olive-700` overrides into `<Button>` — remove the className override, keep the variant.

Inputs: use `ui/input` as-is. Search fields: icon at `left-3`, input `pl-10 h-10 rounded-xl`. Do NOT add per-page `bg-stone-50/50 dark:bg-[#1A1A1A]/50` overrides — plain `<Input>` already themes correctly.

## 7. Empty states, skeletons, badges

**Empty state (one recipe — keep test-asserted title/description strings EXACTLY):**
```tsx
<div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-14 text-center">
  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary mb-4">
    <Icon className="h-6 w-6" />
  </div>
  <h3 className="font-heading text-lg font-semibold text-foreground">No Adventures Yet</h3>
  <p className="mt-1 max-w-sm text-sm text-muted-foreground">Start documenting…</p>
  <div className="mt-5 flex gap-3">{/* Button default + outline */}</div>
</div>
```
When restyling `enhanced-empty-state.tsx`: keep props/exports/variants and all strings; drop FloatingParticles rendering, ping rings, and gradient circles in favor of the recipe above (motion fade-in OK).

**Skeletons:** always `<Skeleton />` from `ui/skeleton` (`bg-muted`), shaped to match real content (`rounded-2xl` for cards, `aspect-[4/3]` for covers, `rounded-full` for avatars). Never hand-rolled `bg-stone-200 dark:bg-stone-700 animate-pulse`.

**Badges:** `ui/badge` with `variant="secondary"` as the default look; status colors via section 5 chip recipes. Count badges on nav icons: `bg-accent text-accent-foreground` dot/pill.

## 8. Imagery

- Album covers in grids: `aspect-[4/3]` (use `aspect-square` only in dense 3-col photo grids). Hero/banner images: `aspect-[21/9]` or fixed `min-h`.
- Wrapper: `relative overflow-hidden rounded-2xl bg-muted` (muted shows while loading).
- Image: `object-cover transition-transform duration-300 group-hover:scale-[1.03]` — max zoom 1.03, nothing larger.
- **Scrim for text on photos (mandatory whenever text overlays an image):**
```tsx
<div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
<div className="absolute inset-x-0 bottom-0 p-4 text-white">
  <h3 className="font-heading font-semibold drop-shadow-sm">Title</h3>
  <p className="text-xs text-white/90">Meta line</p>   {/* white/90 minimum, never white/30-50 */}
</div>
```
- Avatars: `rounded-full ring-2 ring-background` when overlapping content. Keep ALL existing `getPhotoUrl()`, `sizes`, `priority`, `alt` props untouched.

## 9. Motion

- Hover: `transition-all duration-200` (colors/shadow/translate). Lift = `-translate-y-0.5` max.
- Press: `active:scale-[0.97]` on buttons/tiles. Hover scale only on images inside fixed frames (1.03).
- Entrances: existing `MotionReveal`/`animate-fade-in`/`animate-slide-up`, duration ≤ 0.5s; stagger ≤ 60ms/item; wrap new framer-motion in `MotionConfig reducedMotion="user"` (or reuse existing wrappers).
- Do NOT animate: layout-shifting properties on scroll, infinite loops (ping rings, floating particles, rotating icons), blur transitions, width/height. Don't add new `layoutId`s.

## 10. Do / Don't

**Do**
- Use `bg-background / bg-card / bg-muted / text-foreground / text-muted-foreground / border-border / bg-primary / text-primary / bg-accent / ring-ring` everywhere.
- Keep `al-eyebrow`, `al-display`, `al-stat-value`, `al-caption` utilities — they're the brand voice.
- Delete decoration when in doubt: fewer borders, fewer fills, more whitespace.
- Pair any unavoidable raw color with a `dark:` variant.

**Don't**
- Don't mix `gray-*`/`stone-*`/`zinc-*` with the palette — replace them.
- Don't use `instagramStyles`/`appStyles` card/button/statCard/gradient/glassCard recipes in restyled code (leave `design-tokens.ts` itself alone; just stop referencing the noisy entries).
- Don't stack double borders or put `border-2` anywhere.
- Don't use `glass-card`/`backdrop-blur` on content surfaces (sticky navs already use blur — that's fine, leave them).
- Don't introduce gradient backgrounds on cards/sections (the dashboard hero is the one sanctioned gradient moment — leave it).
- Don't change user-facing strings, aria labels, roles, hrefs, handlers, or data flow.
- Don't use arbitrary radii/colors when a token class exists.
- Don't ship `text-white/30…/60` over imagery; floor is `text-white/90` over a scrim.
