# La Bulle De Vie — Design System Technical Assessment

> Last updated: 2026-05-25.

---

## What's actually running

Before any opinion, here's what the codebase is actually doing:

| Layer | Reality |
|---|---|
| **Tailwind v4** | Loaded as a CSS reset + `@theme` color aliases. Zero utility classes used in any JSX. |
| **shadcn/ui CSS vars** | Loaded via `@import "shadcn/tailwind.css"` in `globals.css`. The `--background`, `--foreground`, etc. vars exist in the browser but are referenced nowhere. |
| **shadcn components** (`accordion`, `button`, `card`, `badge`, `tabs`) | Installed in `src/components/ui/`. **Never imported by any page or component in the app.** Dead code. |
| **Custom components** (`Sheet`, `Skeleton`, `LoadingScreen`) | Actually used. Hand-rolled, styled with bulle.css. |
| **bulle.css** | 2550 lines. The real design system. Every public page lives here. |
| **dashboard.css** | 922 lines. Dashboard-specific styles. Separate file for the admin area. |
| **globals.css** | 130 lines. Imports Tailwind, shadcn CSS, and bulle.css. Contains the Tailwind `@theme` block. |

**Total hand-written CSS: 3472 lines across two global files.**

The five shadcn primitives are ghost files. Tailwind is providing a CSS reset and nothing else. The design system is, in practice, entirely hand-written CSS.

---

## What's working well

### 1. The CSS variable token system is correct
`bulle.css` defines `--ink`, `--paper`, `--cream`, `--terra`, `--terra-soft`, `--line`, `--mute`, `--serif`, `--sans` as the single source of truth for the brand. This is the right architecture. Every color in the UI derives from these tokens, which means:
- Dark mode could be added with a single `[data-theme="dark"]` override block
- Multi-tenant theming (for the SaaS pivot) is already set up — each tenant just overrides `--terra` and `--ink`

### 2. Page-scoped namespaces are doing the job they need to
`.ct-*` for contact, `.panier-*` for cart, `.bulle-sheet-*` for the sheet — the convention is consistent and has prevented any class name collisions so far. It's a manually-enforced CSS module without the tooling.

### 3. No Tailwind utility class soup in JSX
The HTML stays readable. A `<div className="hero-grid">` tells you what something is. A `<div className="relative flex flex-col gap-4 px-6 py-4 bg-[#FBF6EF] rounded-2xl shadow-sm">` doesn't. The choice to write semantic class names was correct for this design.

### 4. The separation between public CSS and dashboard CSS is good
`bulle.css` and `dashboard.css` load in separate route groups, so the dashboard CSS doesn't bloat the public page bundle and vice versa. This is working correctly.

### 5. Framer Motion is well-used and justified
`Reveal`, `AnimatedCounter`, the bubble system — the animations add real perceived quality and the bundle cost (~40kb gzipped) is earned. The `whileInView` pattern is clean and doesn't require manual IntersectionObserver management.

---

## What's not working

### 1. Five dead shadcn components (immediate cleanup needed)
`accordion.tsx`, `button.tsx`, `card.tsx`, `badge.tsx`, `tabs.tsx` have never been imported by any page or component. They're taking up space, creating ambiguity ("should I use `<Button>` or `<button className="ct-submit">`?"), and loading shadcn's Tailwind CSS vars for nothing.

**Impact:** Any developer opening the `src/components/ui/` folder sees 8 files and can't tell which ones are actually used. That's a decision-making tax on every future contribution.

**Action:** Delete the 5 unused files. Keep `Sheet.tsx`, `Skeleton.tsx`, `LoadingScreen.tsx` — those are custom-built and actually used.

### 2. Tailwind is providing a CSS reset and nothing else
The `@import "tailwindcss"` in globals.css runs the full Tailwind v4 base layer (normalize, preflight). That's fine — you need a reset. But the `@theme` block in globals.css maps 30+ shadcn color aliases to Tailwind `--color-*` names that are never referenced. It's configuration for a system nobody's using.

**Impact:** Slightly bloated globals.css that confuses the intent. A new developer reads `@theme { --color-primary: var(--primary); ... }` and thinks Tailwind utilities are supposed to be used.

**Action:** Keep `@import "tailwindcss"` for the reset. Strip the `@theme` block down to what's actually needed (probably nothing, or just `--font-sans` and `--font-mono` if those are referenced).

### 3. 3472 lines of global CSS with no visual reference
The biggest operational problem. `bulle.css` is 2550 lines of global styles. There's no Storybook, no component gallery, no screenshot tests. The only way to know what `.eyebrow` looks like is to run the app and find a page that uses it.

**Impact as the codebase grows:**
- Duplicate class definitions will be added accidentally (it happens at ~3000 lines)
- Modifying a shared utility class like `.wrap` or `.eyebrow` has unpredictable blast radius
- Unused styles accumulate with no way to detect them

**This is the single most important structural problem to address.**

### 4. No co-location — styles are detached from components
The styles for `BookingWizard` live in `bulle.css`. The styles for `Sidebar` live in `dashboard.css`. There's nothing connecting the two. If you delete `BookingWizard.tsx`, its CSS stays in `bulle.css` silently. If you rename a class inside `BookingWizard.tsx`, the CSS stays with the old name silently.

### 5. Inconsistent responsive strategy
Some components have their breakpoints inside bulle.css (`.panier-grid` at 980px, `.ct-grid` at 1020px, `.booking-layout` at 900px). Others handle responsiveness inline with `style={{ }}` props. There's no shared grid system or consistent breakpoint scale.

---

## The root cause

The project started as a one-designer-one-developer collaboration building pixel-perfect pages from Figma. The right call at that stage was to write the CSS by hand — the designs were too specific for utility classes and too custom for any component library.

The mistake was adding Tailwind + shadcn as the "scaffolding" and then building entirely outside of it. Now there are two style systems coexisting: the official one (Tailwind/shadcn) that nobody uses, and the real one (bulle.css) that everything actually runs on. **The official system is a fiction.**

---

## Recommendations

### Immediate (< 1 day, no risk)

1. **Delete the 5 dead shadcn components** — `accordion.tsx`, `button.tsx`, `card.tsx`, `badge.tsx`, `tabs.tsx`
2. **Strip the `@theme` block in globals.css** — remove the 30 color aliases that map to nowhere
3. **Add a component index comment at the top of bulle.css** — a table of contents listing every namespace prefix, the component it belongs to, and the page it's used on. Costs 30 minutes, saves hours later.

### Short-term (before SaaS launch)

4. **Split bulle.css into page files** — `home.css`, `booking.css`, `contact.css`, `panier.css`, `soins.css`, etc. Keep a `base.css` for shared tokens and utilities (`.wrap`, `.eyebrow`, `.italic`, `.reveal`). Import each in its route's layout. This solves the blast-radius problem without any rewrite.

5. **Extract complex components to CSS Modules** — `BookingWizard`, `Sheet`, `CartDrawer` are self-contained enough to benefit from co-located styles. New complex components should be built as CSS Modules from the start.

6. **Document the token system** — add a `tokens.css` comment block that lists every `--var` with its hex value and semantic meaning. This becomes the source of truth that email templates and any future Tailwind config reference.

### Long-term (SaaS multi-tenancy)

7. **The CSS variable architecture is already correct for theming** — each tenant could load a `theme-override.css` that redefines `--terra`, `--ink`, `--paper`. This works today without any refactoring. The token system just needs to be made explicit and documented.

8. **Consider dropping Tailwind entirely** — you're using it for a CSS reset. `modern-normalize` is 1kb and does the same thing. Dropping Tailwind removes a build dependency, simplifies globals.css, and clarifies that this is a hand-written CSS system. Only do this if you're committed to never adopting Tailwind utilities — if there's a chance the dashboard or future admin pages will use Tailwind, keep it.

---

## Summary

| | |
|---|---|
| **Core approach** | Correct for the use case — custom Figma designs need custom CSS |
| **Token system** | Good foundation, needs to be made explicit |
| **Dead code** | 5 shadcn components, the `@theme` block — delete them |
| **Biggest risk** | 3472 lines of global CSS with no visual catalog, no unused-style detection |
| **SaaS readiness** | The CSS variable architecture is already themeable — this is a hidden strength |
| **Immediate action** | Delete dead files, add a bulle.css table of contents, split into page files |
