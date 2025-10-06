# TypeScript Build Errors Fix Plan

## Overview

This document outlines a comprehensive, step-by-step plan to fix all remaining TypeScript build errors in the frontend application. These errors were identified after successfully completing the SupportTickets.tsx refactoring.

**Current Status**: 84 TypeScript errors across 6 categories
**Goal**: Achieve zero TypeScript errors and successful production build

---

## Error Categories

### 1. Type Interface Mismatches (Critical) 🔴
**Priority**: HIGH
**Impact**: Breaks compilation
**Files Affected**: 8 files

### 2. Missing Node Types (Critical) 🔴
**Priority**: HIGH
**Impact**: Breaks vite.config.ts compilation
**Files Affected**: 1 file

### 3. Unused Variables (Low Priority) 🟡
**Priority**: LOW
**Impact**: Code quality warnings only
**Files Affected**: 15+ files

### 4. UI Component Type Issues (Medium) 🟠
**Priority**: MEDIUM
**Impact**: Type safety in UI components
**Files Affected**: 4 files

### 5. Service Function Signature Mismatches (Medium) 🟠
**Priority**: MEDIUM
**Impact**: Runtime errors possible
**Files Affected**: 2 files

### 6. Test Fixture Type Issues (Low) 🟡
**Priority**: LOW
**Impact**: Test compilation only
**Files Affected**: 2 files

---

## Detailed Fix Plan

## Phase 1: Critical Fixes (Must Fix for Build to Succeed)

### Task 1.1: Fix MonthlyBillingSummary Interface Mismatches

**Problem**: Code references old property names (`tickets`, `projects`, `hosting`) that were renamed to (`ticketDetails`, `projectDetails`, `hostingDetails`)

**Files to Fix**:
1. `src/components/Dashboard/Dashboard.legacy.tsx` (4 locations)
2. `src/components/Dashboard/sections/MobileMonthCard.tsx` (3 locations)
3. `src/test/fixtures/billing.ts` (1 location)

**Changes Required**:

#### File: `MobileMonthCard.tsx` (Line 110)
```typescript
// BEFORE:
{monthData.tickets?.map((ticket, idx) => (

// AFTER:
{monthData.ticketDetails?.map((ticket, idx) => (
```

#### File: `MobileMonthCard.tsx` (Line 170)
```typescript
// BEFORE:
{monthData.projects?.map((project, idx) => (

// AFTER:
{monthData.projectDetails?.map((project, idx) => (
```

#### File: `MobileMonthCard.tsx` (Line 240)
```typescript
// BEFORE:
{monthData.hosting?.map((hosting, idx) => (

// AFTER:
{monthData.hostingDetails?.map((hosting, idx) => (
```

#### File: `Dashboard.legacy.tsx`
- Apply same 3 changes at lines 1122, 1182, 1252

#### File: `test/fixtures/billing.ts` (Line 107)
```typescript
// BEFORE:
{
  month: '2025-06',
  tickets: [...],
  // ...
}

// AFTER:
{
  month: '2025-06',
  ticketDetails: [...],
  projectDetails: [...],
  hostingDetails: [...],
  // ...
}
```

**Estimated Time**: 15 minutes
**Risk**: Low (simple find-replace)

---

### Task 1.2: Fix HostingCharge Interface - Missing creditAmount Property

**Problem**: Code references `creditAmount` property that doesn't exist in `HostingCharge` interface

**Root Cause**: The interface uses `creditApplied: boolean` but code expects `creditAmount: number`

**Files to Fix**:
1. `src/components/Dashboard/Dashboard.legacy.tsx` (Line 238)
2. `src/components/Dashboard/Dashboard.tsx` (Line 175)

**Solution Strategy**: Two options

**Option A - Add Property to Interface** (Recommended):
```typescript
// File: src/types/websiteProperty.ts
export interface HostingCharge {
  websitePropertyId: string;
  siteName: string;
  websiteUrl: string | null;
  hostingStart: string | null;
  hostingEnd: string | null;
  billingType: BillingType;
  daysActive: number;
  daysInMonth: number;
  grossAmount: number;
  creditApplied: boolean;
  creditAmount?: number; // ADD THIS LINE - Dollar amount of credit applied
  netAmount: number;
}
```

**Option B - Fix Code to Use Existing Property**:
```typescript
// BEFORE:
const creditAmount = charge.creditAmount || 0;

// AFTER:
const creditAmount = charge.creditApplied ? (charge.grossAmount - charge.netAmount) : 0;
```

**Recommendation**: Use Option A - it's clearer and more explicit

**Estimated Time**: 10 minutes
**Risk**: Low

---

### Task 1.3: Fix Missing Node Types in vite.config.ts

**Problem**: TypeScript cannot find `process` global (Node.js specific)

**Solution**: Install @types/node package

**Steps**:
1. Run: `npm install --save-dev @types/node`
2. Verify vite.config.ts compiles without errors

**Files Fixed**: `vite.config.ts` (9 errors)

**Estimated Time**: 5 minutes
**Risk**: None (standard package)

---

### Task 1.4: Fix hostingApi calculateCreditProgress Function Signature

**Problem**: Function `calculateFreeCredits` expects 2 arguments but only receives 1

**File**: `src/services/hostingApi.ts` (Line 281)

**Root Cause**: Function signature mismatch
```typescript
// Function definition (Line 201):
function calculateFreeCredits(activeSites: number, targetMonth: string): number

// Call site (Line 281):
const freeCredits = calculateFreeCredits(activeSites); // Missing targetMonth!
```

**Solution**:
```typescript
// Option A - Pass current month:
export function calculateCreditProgress(activeSites: number, currentMonth?: string): CreditProgress {
  const targetMonth = currentMonth || new Date().toISOString().slice(0, 7); // YYYY-MM format
  const freeCredits = calculateFreeCredits(activeSites, targetMonth);
  // ...
}

// Option B - Make targetMonth optional in calculateFreeCredits:
function calculateFreeCredits(activeSites: number, targetMonth?: string): number {
  const month = targetMonth || new Date().toISOString().slice(0, 7);
  // Check if month is before free hosting credits started (June 2025)
  if (month < FREE_HOSTING_START_DATE) {
    return 0;
  }
  return Math.floor(activeSites / 21);
}
```

**Recommendation**: Use Option B (simpler)

**Estimated Time**: 10 minutes
**Risk**: Low

---

### Task 1.5: Fix TurboHosting.tsx Typo - currentfSummary

**Problem**: Variable name typo `currentfSummary` should be `currentSummary`

**File**: `src/components/Hosting/TurboHosting.tsx` (Line 180)

**Solution**:
```typescript
// BEFORE:
<p className="text-lg font-bold">{currentfSummary.freeCredits}</p>

// AFTER:
<p className="text-lg font-bold">{currentSummary.freeCredits}</p>
```

**Estimated Time**: 2 minutes
**Risk**: None

---

### Task 1.6: Fix Test Fixtures - Remove Non-Existent Type Imports

**Problem**: Importing types that don't exist in billing.ts module

**File**: `src/test/fixtures/billing.ts` (Line 1)

**Current Code**:
```typescript
import type { BillingSummary, MonthlyBillingSummary, TicketDetail, ProjectDetail, HostingDetail } from '../../types/billing';
```

**Solution**:
```typescript
// AFTER - Remove non-existent types:
import type {
  BillingSummary,
  MonthlyBillingSummary,
  BillableTicket,    // Use this instead of TicketDetail
  BillableProject,   // Use this instead of ProjectDetail
} from '../../types/billing';
import type { HostingCharge } from '../../types/websiteProperty'; // Move HostingDetail import here
```

**Estimated Time**: 5 minutes
**Risk**: Low

---

## Phase 2: Medium Priority Fixes (Type Safety)

### Task 2.1: Fix Scorecard Interface Extension Conflict

**Problem**: Interface cannot extend both `ScorecardVariants` and `ScorecardValueVariants` due to overlapping properties

**File**: `src/components/ui/Scorecard.tsx` (Line 13)

**Root Cause**: Both variants likely define a `size` property

**Solution**:
```typescript
// BEFORE:
interface ScorecardProps extends ScorecardVariants, ScorecardValueVariants {
  // ...
}

// AFTER - Use intersection type instead:
interface ScorecardProps extends Omit<ScorecardVariants, 'size'>, Omit<ScorecardValueVariants, 'size'> {
  size?: 'sm' | 'md' | 'lg'; // Explicitly define size once
  title: string;
  value: string | number | React.ReactNode;
  description?: string | React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
  valueClassName?: string;
  titleClassName?: string;
  descriptionClassName?: string;
}
```

**Alternative**: Check variant definitions and merge conflicting properties

**Estimated Time**: 15 minutes
**Risk**: Medium (need to verify variant usage)

---

### Task 2.2: Fix Typography Component Interface Issues

**Problem**: Similar extension conflict + missing JSX namespace

**File**: `src/components/ui/Typography.tsx` (Lines 5, 7, 31)

**Solution Strategy**:
1. Add React import for JSX types: `import type { JSX } from 'react'`
2. Fix interface extension conflict (same as Scorecard)

**Code Changes**:
```typescript
// Add at top:
import type { JSX } from 'react';

// Fix interface:
interface TypographyProps extends Omit<TypographyVariants, keyof React.HTMLAttributes<HTMLElement>> {
  as?: keyof JSX.IntrinsicElements;
  children: React.ReactNode;
  className?: string;
}
```

**Estimated Time**: 15 minutes
**Risk**: Medium

---

### Task 2.3: Fix Calendar Component - aria-selected Type Issue

**Problem**: `aria-selected` expects `boolean | undefined` but receives `boolean | null | undefined`

**File**: `src/components/ui/calendar.tsx` (Line 145)

**Solution**:
```typescript
// BEFORE:
aria-selected={isSelected ? true : null}

// AFTER:
aria-selected={isSelected ? true : undefined}
```

**Estimated Time**: 2 minutes
**Risk**: Low

---

### Task 2.4: Fix Typography Tokens - Missing tracking Property

**Problem**: Accessing `tracking` property that doesn't exist on all variant types

**File**: `src/styles/tokens/typography.ts` (Line 95)

**Solution Strategy**:
1. Read the file to understand structure
2. Either add `tracking` to all variants or use optional chaining

**Code Fix**:
```typescript
// BEFORE:
const tracking = variant.tracking;

// AFTER - Use optional chaining:
const tracking = variant.tracking ?? 'normal';
```

**Estimated Time**: 10 minutes
**Risk**: Low

---

### Task 2.5: Fix MobileMonthCard Type Casting Issue

**Problem**: Passing string to number prop

**File**: `src/components/Dashboard/sections/MobileMonthCard.tsx` (Line 245)

**Solution**: Need to see context, but likely:
```typescript
// BEFORE:
<SomeComponent value={stringValue} />

// AFTER:
<SomeComponent value={Number(stringValue)} />
// OR
<SomeComponent value={parseInt(stringValue, 10)} />
```

**Estimated Time**: 5 minutes
**Risk**: Low

---

## Phase 3: Low Priority Fixes (Code Quality)

### Task 3.1: Remove Unused Imports and Variables

**Strategy**: Clean up all TS6133 warnings

**Files with Unused Variables** (17 total):
1. Dashboard.legacy.tsx - `formatDate`, `Calculator`, `Gift`
2. Dashboard.tsx - `MonthlyBillingSummary`
3. TurboHosting.tsx - `onToggleMobileMenu`, `properties`
4. Projects.tsx - `onToggleMobileMenu`, `Loader2`
5. CategoryPieChart.tsx - `getCSSVariableValue`
6. ProjectCategoryPieChart.tsx - `innerRadius`
7. RequestCalendarHeatmap.tsx - `MONTHS_PER_PAGE_TABLET`, `MONTHS_PER_PAGE_MOBILE`
8. DatePickerPopover.tsx - `startOfMonth`, `endOfMonth`, `availableMonths`
9. EditableNumberCell.tsx - `urgency`, `placeholder`
10. PeriodSelector.tsx - `getFormattedPeriod`
11. Sidebar.tsx - `DollarSign`, `Menu`, `X`
12. Test files - various unused variables

**Solution**: Simply remove or comment out unused imports/variables

**Estimated Time**: 30 minutes
**Risk**: None (warnings only)

**Note**: Legacy files (`.legacy.tsx`) can be ignored if they're just backups

---

### Task 3.2: Clean Up Test Files

**Files**:
- `GrandTotalRow.test.tsx` - Remove unused `container`
- `MobileMonthBreakdown.test.tsx` - Remove unused `container`

**Estimated Time**: 5 minutes
**Risk**: None

---

## Phase 4: Verification & Testing

### Task 4.1: Run Full Build
```bash
npm run build
```
Expected: 0 errors

### Task 4.2: Run Type Check Only
```bash
npx tsc --noEmit
```
Expected: 0 errors

### Task 4.3: Run Tests
```bash
npm run test
```
Expected: All tests pass

### Task 4.4: Run Dev Server
```bash
npm run dev
```
Expected: No console errors

---

## Execution Order (Recommended)

### Step 1: Install Dependencies (5 min)
- [ ] Task 1.3: Install @types/node

### Step 2: Fix Critical Type Mismatches (45 min)
- [ ] Task 1.1: Fix MonthlyBillingSummary property names (8 files)
- [ ] Task 1.2: Fix HostingCharge creditAmount (2 files + interface)
- [ ] Task 1.4: Fix calculateCreditProgress signature
- [ ] Task 1.5: Fix currentfSummary typo
- [ ] Task 1.6: Fix test fixture imports

### Step 3: Fix Medium Priority Type Issues (45 min)
- [ ] Task 2.1: Fix Scorecard interface
- [ ] Task 2.2: Fix Typography component
- [ ] Task 2.3: Fix Calendar aria-selected
- [ ] Task 2.4: Fix Typography tokens tracking
- [ ] Task 2.5: Fix MobileMonthCard type casting

### Step 4: Clean Up Warnings (35 min)
- [ ] Task 3.1: Remove unused variables (all files)
- [ ] Task 3.2: Clean up test files

### Step 5: Verification (15 min)
- [ ] Task 4.1: Build verification
- [ ] Task 4.2: Type check verification
- [ ] Task 4.3: Test verification
- [ ] Task 4.4: Dev server verification

---

## Total Estimated Time

| Phase | Time |
|-------|------|
| Phase 1: Critical Fixes | 50 minutes |
| Phase 2: Medium Priority | 45 minutes |
| Phase 3: Low Priority | 35 minutes |
| Phase 4: Verification | 15 minutes |
| **Total** | **2 hours 25 minutes** |

---

## Risk Assessment

### High Risk Changes: None
All changes are straightforward type fixes with clear solutions.

### Medium Risk Changes:
- Scorecard interface refactor (may affect multiple components)
- Typography component refactor (may affect multiple components)

### Low Risk Changes:
- All other fixes are simple property renames, typo fixes, or removing unused code

---

## Success Criteria

✅ Zero TypeScript compilation errors
✅ All existing tests pass
✅ Dev server runs without console errors
✅ Production build completes successfully
✅ No new runtime errors introduced

---

## Notes

1. **Legacy Files**: `Dashboard.legacy.tsx` and `SupportTickets.legacy.backup.tsx` can optionally be excluded from strict type checking or deleted if no longer needed.

2. **Test Fixtures**: May need updating after interface changes in Phase 1.

3. **Incremental Approach**: Can fix and verify each phase separately rather than all at once.

4. **Git Commits**: Recommend committing after each completed phase for easy rollback if needed.

---

## Dependency Tree

```
Phase 1 (Critical)
  ├─ Task 1.3 (install @types/node) - No dependencies
  ├─ Task 1.1 (MonthlyBillingSummary) - No dependencies
  ├─ Task 1.2 (HostingCharge) - No dependencies
  ├─ Task 1.4 (calculateCreditProgress) - No dependencies
  ├─ Task 1.5 (typo fix) - No dependencies
  └─ Task 1.6 (test fixtures) - Depends on 1.1, 1.2

Phase 2 (Medium)
  ├─ Task 2.1 (Scorecard) - No dependencies
  ├─ Task 2.2 (Typography) - No dependencies
  ├─ Task 2.3 (Calendar) - No dependencies
  ├─ Task 2.4 (Typography tokens) - No dependencies
  └─ Task 2.5 (MobileMonthCard) - No dependencies

Phase 3 (Low)
  └─ All tasks independent

Phase 4 (Verification)
  └─ Depends on Phases 1-3 completion
```

---

## Files Modified Summary

### TypeScript Interfaces (3 files):
- `src/types/websiteProperty.ts` - Add `creditAmount` property
- `src/types/billing.ts` - No changes needed (already correct)

### Components (7 files):
- `src/components/Dashboard/Dashboard.legacy.tsx`
- `src/components/Dashboard/Dashboard.tsx`
- `src/components/Dashboard/sections/MobileMonthCard.tsx`
- `src/components/Hosting/TurboHosting.tsx`
- `src/components/ui/Scorecard.tsx`
- `src/components/ui/Typography.tsx`
- `src/components/ui/calendar.tsx`

### Services (1 file):
- `src/services/hostingApi.ts`

### Tests (3 files):
- `src/test/fixtures/billing.ts`
- `src/components/Dashboard/sections/__tests__/GrandTotalRow.test.tsx`
- `src/components/Dashboard/sections/__tests__/MobileMonthBreakdown.test.tsx`

### Config (1 file):
- `package.json` - Add @types/node

### Cleanup (15+ files):
- Multiple files with unused variable warnings

**Total Files to Modify**: ~30 files

---

## Post-Fix Validation Checklist

- [ ] `npm run build` completes with 0 errors
- [ ] `npx tsc --noEmit` shows 0 errors
- [ ] `npm run test` all tests pass
- [ ] `npm run dev` starts without errors
- [ ] Dashboard page loads correctly
- [ ] Support page loads correctly
- [ ] Projects page loads correctly
- [ ] Turbo Hosting page loads correctly
- [ ] All interactive features work (filters, sorting, pagination)
- [ ] No console errors in browser
- [ ] No TypeScript errors in IDE

---

## Maintenance Recommendations

After completing all fixes:

1. **Add Pre-commit Hook**: Run `tsc --noEmit` before commits
2. **Update tsconfig.json**: Ensure strict mode is enabled
3. **Document Interfaces**: Add JSDoc comments to complex interfaces
4. **Remove Legacy Files**: Delete `.legacy.tsx` files if no longer needed
5. **Update CLAUDE.md**: Document the build error fixes completed

---

*Plan created: 2025-10-04*
*Based on: SupportTickets.tsx refactoring completion*
*Estimated completion: 2-3 hours*
