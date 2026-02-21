# Figma-to-Code Design System Rules

## Overview

This document defines how Figma designs should be translated into code for the Support Billing Tracker application. Use these rules when converting Figma designs via the Model Context Protocol (MCP).

**Stack:** React 18 + TypeScript, Tailwind CSS 3, Vite 5, Recharts 3

---

## 1. Token Definitions

### Colors

All colors use HSL CSS variables defined in `frontend/src/index.css`. Never use raw hex/RGB in components.

**Semantic Colors (light/dark aware):**
```css
--background: 0 0% 100%      /* Page background */
--foreground: 0 0% 9%         /* Primary text */
--card: 0 0% 100%             /* Card background */
--card-foreground: 0 0% 9%    /* Card text */
--primary: 0 0% 9%            /* Primary actions */
--primary-foreground: 0 0% 98%
--secondary: 0 0% 96%
--muted: 0 0% 96%             /* Subtle backgrounds */
--muted-foreground: 0 0% 45%  /* Secondary text */
--accent: 0 0% 96%
--destructive: 0 84% 60%      /* Error/danger */
--border: 0 0% 90%
--input: 0 0% 90%
--ring: 0 0% 9%               /* Focus ring */
```

**Usage in Tailwind:**
```tsx
className="bg-background text-foreground"
className="bg-card text-card-foreground"
className="bg-primary text-primary-foreground"
className="text-muted-foreground"
className="border-border"
```

**Chart Category Colors (hex values, themed):**
| Category | Light | Dark | Tailwind |
|----------|-------|------|----------|
| Support | `#6366f1` | `#818cf8` | `text-chart-support` |
| Hosting | `#10b981` | `#34d399` | `text-chart-hosting` |
| Forms | `#f59e0b` | `#fbbf24` | `text-chart-forms` |
| Billing | `#ef4444` | `#f87171` | `text-chart-billing` |
| Email | `#06b6d4` | `#67e8f9` | `text-chart-email` |
| Migration | `#8b5cf6` | `#a78bfa` | `text-chart-migration` |
| Non-billable | `#f97316` | `#fb923c` | `text-chart-non-billable` |
| Advisory | `#14b8a6` | `#2dd4bf` | `text-chart-advisory` |
| General | `#6b7280` | `#9ca3af` | `text-chart-general` |

**Status Colors (inline Tailwind):**
- Success: `bg-green-50 dark:bg-green-900/20 text-green-900 dark:text-green-100`
- Warning: `bg-amber-50 dark:bg-amber-900/20 text-amber-900 dark:text-amber-100`
- Error: `bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-100`

**Token files:** `frontend/src/styles/tokens/colors.ts`, `typography.ts`, `spacing.ts`, `shadows.ts`, `animations.ts`

### Typography

**Font family:** `system-ui, -apple-system, sans-serif` (no web fonts)

**Scale (use Tailwind classes, not raw values):**
| Token | Size | Tailwind |
|-------|------|----------|
| xs | 0.75rem / 12px | `text-xs` |
| sm | 0.875rem / 14px | `text-sm` |
| base | 1rem / 16px | `text-base` |
| lg | 1.125rem / 18px | `text-lg` |
| xl | 1.25rem / 20px | `text-xl` |
| 2xl | 1.5rem / 24px | `text-2xl` |
| 3xl | 1.875rem / 30px | `text-3xl` |
| 4xl | 2.25rem / 36px | `text-4xl` |

**Weight usage:**
- Normal body: `font-normal` (400)
- Labels/emphasis: `font-medium` (500)
- Headings/titles: `font-semibold` (600)
- Strong emphasis: `font-bold` (700)

**Common patterns:**
```tsx
// Page title (responsive)
<h1 className="text-xl sm:text-2xl lg:text-3xl font-semibold tracking-tight">

// Card title
<h3 className="text-lg font-semibold leading-none tracking-tight">

// Card description
<p className="text-sm text-muted-foreground">

// Scorecard value
<span className="text-2xl font-bold">

// Table header
<th className="text-left py-4 px-4 font-semibold text-sm">

// Table cell
<td className="py-5 px-4">
```

### Spacing

Standard Tailwind spacing scale. Key component-level spacing:

| Context | Padding | Gap |
|---------|---------|-----|
| Card | `p-6` | `space-y-1.5` (header) |
| Card content | `p-6 pt-0` | - |
| Page header | `px-4 sm:px-6 lg:px-8 py-3 sm:py-4` | `gap-3` |
| Table cell | `py-5 px-4` | - |
| Sidebar | `px-2` (nav), `px-3` (items) | `space-y-0.5` |
| Button (sm) | `px-2 py-1` | - |
| Button (md) | `px-3 py-1.5` | - |

### Shadows & Borders

**Design is flat/sharp:**
- All shadows disabled (`--shadow-*: none`)
- Border radius: `--radius: 0rem` (sharp corners)
- Borders: `border border-border/50` on cards, `border-border` elsewhere
- No rounded corners unless explicitly set per-component

### Animations

| Context | Duration | Easing |
|---------|----------|--------|
| Button hover | 150ms | ease-in-out |
| Card transitions | 200ms | ease-in-out |
| Sidebar slide | 300ms | ease-in-out |
| Chart animation | 800ms | ease-in-out |
| Tooltip | 100ms | ease-out |

---

## 2. Component Library

### Architecture

```
frontend/src/components/
  base/           -> DataTrackerCard (master card with chart/table toggle)
  ui/             -> Primitives: Card, Scorecard, Typography, ToggleGroup, Table, etc.
  shared/         -> PageHeader, Sidebar, PeriodSelector, Pagination, etc.
  charts/         -> BaseBarChart, pie/radar/line charts, tooltips/
```

Feature-specific components live in `frontend/src/features/{feature}/components/`.

### Key Components to Reuse

**Card** (`frontend/src/components/ui/card.tsx`):
```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

<Card className="flex flex-col h-full">
  <CardHeader className="pb-3">
    <CardTitle>Title</CardTitle>
    <CardDescription className="text-xs mt-1">Description</CardDescription>
  </CardHeader>
  <CardContent className="flex-1 flex flex-col">
    {children}
  </CardContent>
</Card>
```

**Scorecard** (`frontend/src/components/ui/Scorecard.tsx`):
```tsx
<Scorecard
  title="Total Revenue"
  value="$12,500"
  description="+12% from last month"
  icon={DollarSign}
  variant="default"  // default | highlight | success | warning | error
  size="md"          // sm | md | lg
/>
```

**DataTrackerCard** (`frontend/src/components/base/DataTrackerCard.tsx`):
```tsx
<DataTrackerCard
  title="Support Requests"
  description="Monthly breakdown"
  renderTable={() => <MyTable />}
  renderChart={() => <MyChart />}
  initialViewType="chart"
  gridSpan="lg:col-span-2 xl:col-span-3"
/>
```
Exports shared constants: `TABLE_STYLES`, `CHART_STYLES`.

**ToggleGroup** (`frontend/src/components/ui/toggle-group.tsx`):
```tsx
<ToggleGroup
  options={[{ value: 'chart', label: 'Chart' }, { value: 'table', label: 'Table' }]}
  value={viewType}
  onValueChange={setViewType}
  size="sm"  // sm | md | lg
/>
```

**Typography** (`frontend/src/components/ui/Typography.tsx`):
Uses CVA variants from `frontend/src/styles/variants/typography.ts`.

### Variant System (CVA)

Components use `class-variance-authority` for type-safe variants:

```tsx
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva('base-classes', {
  variants: {
    variant: { default: '...', destructive: '...', outline: '...' },
    size: { sm: '...', md: '...', lg: '...' },
  },
  defaultVariants: { variant: 'default', size: 'md' },
});
```

Variant files: `frontend/src/styles/variants/scorecard.ts`, `button.ts`, `typography.ts`

### Utility Function

```tsx
// frontend/src/lib/utils.ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

Always use `cn()` for combining classes. Never concatenate Tailwind strings manually.

---

## 3. Frameworks & Libraries

| Dependency | Version | Purpose |
|-----------|---------|---------|
| React | 18.3.1 | UI framework |
| TypeScript | 5.8.3 | Type safety (strict mode) |
| Vite | 5.4.19 | Build tool + dev server |
| Tailwind CSS | 3.4.17 | Utility-first styling |
| class-variance-authority | 0.7.1 | Component variants |
| clsx + tailwind-merge | 2.1.1 / 3.3.1 | Class name composition |
| Recharts | 3.1.0 | Charts |
| @tanstack/react-query | 5.90.11 | Server state |
| react-router-dom | 7.11.0 | Routing |
| lucide-react | 0.525.0 | Icons |
| @radix-ui/react-tooltip | 1.2.8 | Accessible tooltips |
| date-fns | 4.1.0 | Date utilities |

---

## 4. Asset Management

- Static assets in `frontend/public/` (minimal: just `vite.svg`)
- Brand logos in `frontend/src/assets/`: `velocity-logo.png`, `PeakOne Logo_onwhite_withtext.svg`
- Imported via ES modules: `import velocityLogo from '@/assets/velocity-logo.png'`
- No CDN, no image optimization pipeline
- Favicons fetched dynamically via `SiteFavicon.tsx` using Google's favicon API

---

## 5. Icon System

**Library:** `lucide-react`

**Import pattern:**
```tsx
import { Ticket, FolderKanban, BarChart3, ChevronLeft, Menu, LogOut } from 'lucide-react';
```

**Usage pattern:**
```tsx
// Inline icon
<Ticket size={20} className="text-muted-foreground" />

// Dynamic icon from config
const menuItems = [
  { id: 'home', label: 'Support', icon: Ticket },
];
// Render: <item.icon size={18} className="flex-shrink-0" />
```

**Sizing convention:** `size={16}` small, `size={18}` nav items, `size={20}` standard, `size={24}` large

**Do not** use SVG files for icons. Always use lucide-react components.

---

## 6. Styling Approach

### Method: Tailwind CSS utility classes

No CSS Modules, no styled-components. All styling via Tailwind utility classes composed with `cn()`.

### Dark Mode

Class-based (`darkMode: 'class'` in tailwind config). The `dark` class on `<html>` toggles CSS variables.

Always provide dark mode variants for colored backgrounds:
```tsx
className="bg-green-50 dark:bg-green-900/20 text-green-900 dark:text-green-100"
```

### Responsive Design

**Mobile-first.** Base styles are mobile, enhanced at breakpoints.

| Breakpoint | Width | Usage |
|-----------|-------|-------|
| (base) | 0px+ | Mobile phones |
| `sm:` | 640px+ | Tablets, sidebar visible |
| `lg:` | 1024px+ | Desktop |
| `xl:` | 1280px+ | Large desktop, wider grids |

**Common responsive patterns:**
```tsx
// Text scaling
className="text-xl sm:text-2xl lg:text-3xl"

// Layout switching
className="flex flex-col sm:flex-row"

// Visibility
className="sm:hidden"         // Mobile only
className="hidden sm:flex"    // Desktop only

// Spacing scaling
className="px-4 sm:px-6 lg:px-8"

// Grid spanning
className="lg:col-span-2 xl:col-span-3"
```

**Touch targets:** Minimum `min-w-[44px] min-h-[44px]` for interactive elements on mobile.

### Global Styles

Defined in `frontend/src/index.css`:
```css
@layer base {
  * { @apply border-border; }
  html, body { @apply bg-background text-foreground; }
}
```

---

## 7. Project Structure

```
frontend/src/
  components/
    base/              # DataTrackerCard (master component)
    ui/                # Primitives (Card, Scorecard, Typography, Table, etc.)
    shared/            # Layout components (PageHeader, Sidebar, Pagination)
    charts/            # All chart components + tooltips/
    Layout.tsx         # Main layout (sidebar + outlet)
    ErrorBoundary.tsx
  features/
    dashboard/         # Dashboard page (overview, revenue, scorecards)
    support/           # Support tickets page
    projects/          # Projects page
    hosting/           # Turbo hosting page
    invoices/          # Invoice management
    auth/              # Login page
    client-portal/     # Client-facing portal
  styles/
    tokens/            # Design tokens (colors, typography, spacing, shadows, animations)
    variants/          # CVA variant definitions (scorecard, button, typography)
  config/
    chartConfig.ts     # Chart theme + color mappings
    pricing.ts         # Business pricing rules
    uiConstants.ts     # Badge styles, labels
  hooks/               # Custom React hooks
  contexts/            # React contexts (Auth, Period, ClientAuth)
  services/            # API clients
  types/               # TypeScript interfaces
  utils/               # Utility functions (currency, formatting, dates)
  lib/
    utils.ts           # cn() utility
```

### Feature Organization Pattern

Each feature follows:
```
features/{name}/
  components/          # Feature-specific components
  sections/            # Page sections / sub-layouts
  hooks/               # Feature-specific hooks
  __tests__/           # Tests
```

---

## 8. Figma-to-Code Translation Rules

### When converting a Figma design:

1. **Map Figma colors to CSS variables** - never use raw hex values. Use `bg-primary`, `text-muted-foreground`, etc.
2. **Use existing components first** - check `ui/`, `shared/`, `base/` before creating new ones.
3. **Apply CVA variants** for any component that has visual states (hover, active, size, variant).
4. **Use `cn()`** for all class composition.
5. **Icons = lucide-react** - find the closest matching icon from the lucide set.
6. **Responsive = mobile-first** - start with mobile layout, add `sm:` / `lg:` / `xl:` for larger screens.
7. **No shadows, no rounded corners** - design is flat and sharp by default.
8. **Always support dark mode** - add `dark:` variants for any colored backgrounds or text.
9. **Charts use Recharts** with colors from `CHART_STYLES` or CSS variables.
10. **Minimum 44px touch targets** for all interactive elements.
