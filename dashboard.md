# Dashboard.tsx Refactoring Plan — Updated (with Comprehensive Testing & Safeguards)

## Goal

Refactor a 1,289‑line `Dashboard.tsx` into a small orchestrator (\~150–250 LOC) backed by reusable, semantically clear subcomponents **without any functional or UX regressions**.

---

## Guiding Principles

1. **Behavior parity first, improvements second.** No user‑visible changes until tests prove parity.
2. **Small, reversible steps.** Extract one unit at a time behind the same props, keep diffs narrow, commit often.
3. **Localize state, lift only when necessary.** Prefer local component state and derived values; avoid prop drilling via narrow contexts where needed.
4. **Pure UI components.** Views receive data + callbacks, no data fetching inside view components.
5. **Deterministic rendering.** Stabilize keys, memoize expensive computations, avoid ad‑hoc closures.

---

## Phase 0: Pre‑Flight (Safety Nets & Baselines)

- Create `Dashboard.legacy.tsx` copy (nuclear rollback) and a `git tag` (e.g., `dashboard-pre-refactor`).
- Capture **performance baseline** (TTI, render count) with React Profiler and Playwright timings.
- Freeze a **visual baseline** (desktop / mobile / expanded month) screenshots to be used by Playwright VRT.

---

## Phase 1: Testing Infrastructure (Upgraded)

**Current:** Playwright present; no unit/integration tests.

### 1.1 Install Dev Dependencies

```bash
npm i -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom msw @vitest/coverage-v8 eslint-plugin-testing-library eslint-plugin-jest-dom
```

### 1.2 Vitest Scripts in `package.json`

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:cov": "vitest --coverage",
    "test:watch": "vitest --watch",
    "e2e": "playwright test"
  }
}
```

### 1.3 `vitest.config.ts`

```ts
import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setupTests.ts'],
    globals: true,
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: './coverage'
    }
  }
})
```

### 1.4 Test Setup `src/test/setupTests.ts`

```ts
import '@testing-library/jest-dom/vitest'
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// Ensure DOM is reset between tests
afterEach(() => cleanup())

// Silence expected console noise in tests while surfacing real errors
const originalError = console.error
console.error = (...args: unknown[]) => {
  const msg = String(args[0] ?? '')
  if (msg.includes('Warning: React')) return
  originalError(...args as Parameters<typeof originalError>)
}
```

### 1.5 MSW (Mock Service Worker) for Stable Data

- Add `src/test/server.ts` with MSW handlers for all dashboard endpoints.
- Start MSW in tests to avoid flakiness and speed up integration tests.

### 1.6 Playwright Hardening

- Add `prefers-reduced-motion` to disable animations in tests.
- Stub network where necessary; keep one happy‑path full E2E.

---

## Phase 2: Baseline Tests (Before Any Refactor)

### 2.1 Visual & Manual Checklist

- Dashboard loads with no console errors
- 8 scorecards correct
- Month + section expand/collapse
- Desktop table, mobile cards, grand totals
- CSV export
- Period filtering (All/Month)
- Free credits display
- Dark mode and responsive breakpoints

### 2.2 Playwright E2E (Baseline)

- One spec asserting smoke, interactions, and exports.
- Freeze screenshots: desktop, mobile, expanded month.

### 2.3 Calculation Baselines

- Unit test the current calculation path with **realistic fixtures**.
- Prefer example‑based assertions; limit snapshots to final aggregated structures only.

---

## Phase 3: Incremental Extraction Strategy

Proceed in **risk‑ordered** steps. After each extraction, run unit + integration + E2E smoke before proceeding.

### 3.1 Extract Calculation Hook (Lowest Risk)

- **File:** `hooks/useBillingCalculations.ts`
- Move only pure derivations (no side‑effects). Accept `billingSummary`, filters, and options.
- Expose stable outputs (`displayTotals`, `averages`, `credits`, etc.).
- **Tests:** `renderHook` with mock data; verify totals/averages/credits.
- **Perf:** Memoize heavy maps/reductions with `useMemo` and stable deps.

### 3.2 Extract Section Components (Medium Risk)

Order: `TicketsSection` → `ProjectsSection` → `HostingSection`

- Each lives in `sections/` with a strict props interface.
- Props: `{ monthData, isExpanded, onToggle }` only; compute inside with hook outputs as inputs.
- **Tests:** RTL unit tests for render/expand/credit math; Playwright checks for expand/collapse.

### 3.3 Extract Row Components (Medium Risk)

- `MonthRow.tsx`, `GrandTotalRow.tsx`
- Stabilize `key`s using month/year IDs (never array index).
- **Tests:** events, expansion, totals.

### 3.4 Wrapper Components (Low Risk)

- `MonthlyBreakdownTable.tsx`, `MobileMonthBreakdown.tsx`, `DashboardScorecards.tsx`
- Pure layout containers; no logic.

### 3.5 Mobile Components (Low Risk)

- `mobile/MobileMonthCard.tsx`
- Ensure parity with desktop details; share formatters/types.

---

## Phase 4: Cross‑Cutting Enhancements (Non‑Breaking)

1. **Types & Contracts**
   - Add `dashboard/types.ts` for DTOs and view models.
   - Add `dashboard/lib/formatters.ts` for currency/percentage/date.
   - Add `dashboard/fixtures/` for test fixtures.
2. **Accessibility**
   - Ensure semantic roles and names (reduce reliance on `data-testid`).
   - Optional: add `vitest-axe` for basic a11y checks.
3. **Performance**
   - Add memo boundaries (`React.memo`) around stable, large rows and sections.
   - Avoid `useCallback` where unnecessary; prefer moving inline handlers closer to usage to avoid wide dependencies.
   - Defer non‑critical work until after first paint (e.g., `requestIdleCallback` guarded usage).

---

## Phase 5: Testing by Layer

### 5.1 Unit (Vitest + RTL)

- Hook: `useBillingCalculations.test.ts`
- Sections: render, expand, totals, credits.
- Rows: handlers, totals, expansion propagation.

### 5.2 Integration

- `Dashboard.integration.test.tsx`: data load, scorecards visible, expand/collapse, filter logic, CSV export contract.

### 5.3 Visual Regression (Playwright)

- `dashboard-desktop.png`, `dashboard-mobile.png`, `dashboard-expanded.png` baselines.
- Use `toHaveScreenshot` with a small threshold.

### 5.4 CSV Contract Test

- Assert headers and sample rows match expected shape and formatting (not byte‑for‑byte unless required).

---

## Phase 6: Post‑Refactor Validation

- **Automated:** All unit/integration/E2E/VRT green; >80% coverage on new/changed code.
- **Manual:** Full checklist parity; dark mode; responsive.
- **Performance:** Render count and timings within ±5% of baseline or improved.

---

## File/Folder Structure (Feature‑Oriented)

```
src/components/Dashboard/
├── Dashboard.tsx                    # Orchestrator only (routing, state wiring)
├── DashboardScorecards.tsx         # 8-scorecard grid (pure layout)
├── MonthlyBreakdownTable.tsx       # Desktop table wrapper
├── MobileMonthBreakdown.tsx        # Mobile wrapper
├── GrandTotalRow.tsx               # Shared totals row
├── sections/
│   ├── MonthRow.tsx                # Desktop month row
│   ├── TicketsSection.tsx
│   ├── ProjectsSection.tsx
│   └── HostingSection.tsx
├── mobile/
│   └── MobileMonthCard.tsx
├── hooks/
│   └── useBillingCalculations.ts   # Pure derivations + memoization
├── lib/
│   └── formatters.ts               # currency/percent/date helpers
├── types.ts                        # shared DTO & VM types
├── fixtures/                       # test data
└── __tests__/
    ├── Dashboard.integration.test.tsx
    ├── useBillingCalculations.test.ts
    ├── TicketsSection.test.tsx
    ├── ProjectsSection.test.tsx
    ├── HostingSection.test.tsx
    ├── MonthRow.test.tsx
    ├── MobileMonthCard.test.tsx
    └── calculations.snapshot.test.ts
```

---

## Implementation Timeline (7 Days)

**Day 1 — Infra & Baselines**

- Install deps; configure Vitest/MSW; write Playwright smoke + VRT baselines; capture perf baseline; add fixtures.

**Days 2–3 — Hook Extraction**

- Extract `useBillingCalculations`; write unit tests; confirm parity and coverage.

**Days 4–5 — Sections**

- Tickets, Projects, Hosting components with tests; E2E expand/collapse parity.

**Day 6 — Rows & Wrappers**

- MonthRow, GrandTotalRow, wrappers; visual checks; finalize formatters/types.

**Day 7 — Mobile & Final Pass**

- MobileMonthCard; full suite + VRT; manual checklist; profile + compare.

---

## Rollback Strategy (Per Step)

1. Commit before each extraction.
2. If tests fail or diffs change behavior, revert immediately, investigate, and re‑attempt in a smaller step.
3. Keep `Dashboard.legacy.tsx` until the end.

---

## Success Criteria

- **Functionality:** Identical results and interactions across desktop/mobile and dark mode.
- **Tests:** >80% coverage on new code; green CI.
- **Performance:** Equal or better than baseline (render counts, timings).
- **Visual:** VRT matches within threshold.
- **Maintainability:** `Dashboard.tsx` \~150–250 LOC; components pure and typed; shared helpers isolated.

---

## Appendices

### A. Example: `useBillingCalculations` Contract

```ts
export interface BillingInputs {
  billingSummary: BillingSummary
  period: 'all' | { month: number; year: number }
  credits?: { freeHoursPerMonth?: number; projectCredits?: number }
}

export interface BillingOutputs {
  displayTotals: {
    totalRevenue: number
    tickets: number
    projects: number
    hosting: number
    grandTotal: number
  }
  averages: {
    monthlyRevenue: number
    ticketAvg?: number
  }
  creditsApplied: {
    freeHoursSavings: number
    projectCreditsApplied: number
  }
}
```

### B. Example: Hook Test (RTL `renderHook`)

```ts
import { renderHook } from '@testing-library/react'
import { useBillingCalculations } from '../hooks/useBillingCalculations'
import { mockBillingSummary } from '../fixtures/billing'

it('computes totals for all period', () => {
  const { result } = renderHook(() =>
    useBillingCalculations({ billingSummary: mockBillingSummary, period: 'all' })
  )
  expect(result.current.displayTotals.totalRevenue).toBeCloseTo(12345.67, 2)
})
```

### C. Playwright Screenshot Hardening

```ts
// tests/dashboard-visual.spec.ts
import { test, expect } from '@playwright/test'

test.use({ colorScheme: 'dark' }) // also run a light pass if supported

test('desktop matches baseline', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('
```
