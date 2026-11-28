---
inclusion: always
---

# Coding Standards

Rules for all code written on this project. The full details, examples and folder tables are in `docs/implementation/01. general_implementation.md` sections 17 to 19; read them before building UI. If a rule here blocks a task, stop and ask rather than work around it.

**Design skills** (frontend-design, impeccable, hallmark, refactoring-ui and the others in `~/.kiro/skills/`) are used for review and polish only. Where a skill disagrees with this file or the WordPress design (for example its own spacing scale, its ban on uppercase labels, or a new visual direction), this file and the WordPress design win. Do not use hallmark's or impeccable's "new design" flows on this project; they would replace the WordPress look.

## Design source

- The design is copied from the live WordPress site. The current prototype code in `src/` and the files in `public/` are not a design reference.
- Design values come from the tokens in `src/app/globals.css`, which copy the WordPress Elementor global settings. Screen layouts come from the Elementor export in `wp-db-export/elementor-export/`.
- UI images are the original files from `wp-db-export/uploads/`, copied into `public/images/`. Never use files from `jet-form-builder/` folders (users' uploads) in the UI.

## Styling

1. **No raw design values.** Colours, font families, sizes, weights, line heights, letter spacing, padding, margin, gap, sizes, borders, radius, shadows, z-index, breakpoints and durations come only from the tokens in `globals.css`. No hex or rgb colours, no px or rem numbers, no Tailwind arbitrary values (`p-[13px]`). Allowed: `0`, `100%`, `auto`, `inherit`, `currentColor`, `transparent`, `none`, grid fractions.
2. **Missing value?** Add a token to `globals.css` first, then use it. Never inline it "just once".
3. **Text uses the text style classes** (`text-h1` … `text-hint`). Never set font family, size, weight, line height or letter spacing in a component.
4. **No inline styles.** No `style` prop. The only exception is a dynamic CSS custom property, with an `eslint-disable-next-line` comment giving the reason.
5. **Where styles go:** Tailwind utilities for simple layout; anything more (states, media queries, pseudo-elements, repeated combinations) in a `name.module.scss` next to the component, using `var(--token)`, combined with Tailwind through `cn()`. The only global stylesheet is `globals.css`.

## Reuse

1. **Search first.** Before writing a component, hook or helper, check `src/components/` (and its `README.md` catalogue), `src/hooks/` and `src/lib/`. Extend an existing one with a prop or variant rather than writing a near copy.
2. **Extract on the second use.** Repeated markup, logic or styles become a shared component, hook or helper, used in every place that needs it.
3. **One function per business rule** (for example "contract ending soon", age, price formatting), used by every page, email and job.
4. **Folders:** `ui/` primitives, `forms/` form blocks, `layout/`, `gates/`, `shared/` (several modules), `<module>/` (one module), `src/hooks/`, `src/lib/` (pure helpers), `src/server/` (server-only helpers). A module component needed elsewhere moves to `shared/`.
5. **Catalogue:** adding or changing a shared component updates `src/components/README.md` in the same commit.
6. **Shared text** (requirement error messages, gate texts, empty states) lives in `src/lib/messages.ts`.

## Data and UI separation

- **Route files** (`page.tsx`, `layout.tsx`) load data: `getViewer()`, the policy, DAL functions; then pass plain display data to components.
- **Server Actions** (`src/actions/`) parse input, check the viewer and policy, call a service.
- **DAL and services** (`src/server/`) are the only code that touches the database.
- **Components** only render the props they get and trigger Server Actions. They never import from `src/server/`, call `getViewer()` or fetch data.
- **Hooks** hold client state and effects; they never `fetch()` our own API.
- Components receive display shapes (view models), not Prisma model types.

## Components

- Kebab-case files, one named export per file, typed `Props`, `className` accepted and merged last with `cn()`.
- Fixed `variant` and `size` props instead of one-off style props; composition (children, slots) over many boolean props.
- Server Components by default; `'use client'` only on the smallest interactive piece.
- Interactive primitives use `react-aria-components`; every input has a label; icon-only buttons have `aria-label`; icons through the `Icon` wrapper (`lucide-react`).
- Images through `next/image`, `UserAvatar` or `OrganisationLogo`.

## General code

- TypeScript strict; no `any`, no `@ts-ignore`; explicit return types on exported functions.
- Constants in `src/lib/constants.ts`, routes through `src/lib/routes.ts`, dates and money through the format helpers.
- No `console.log`; use the logger. No empty `catch`. No commented-out code.
- New dependency: check maintenance and licence (MIT, Apache-2.0, BSD, ISC), prefer what is already installed, and list it in the implementation doc in the same commit.
- Every shared helper and hook has unit tests.
