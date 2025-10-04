# Dashboard Refactor - Manual Testing Checklist

**Date**: _____________
**Tester**: _____________
**Version**: Dashboard Refactor Phase 6 Validation

---

## Dashboard Load

- [ ] No console errors on load
- [ ] No console warnings (excluding expected React development warnings)
- [ ] All 8 scorecards display with numeric values (not `$NaN` or `undefined`)
  - [ ] Total Revenue
  - [ ] Support Tickets
  - [ ] Project Revenue
  - [ ] Hosting MRR
  - [ ] Avg Ticket Cost
  - [ ] Avg Project Cost
  - [ ] Avg Hosting Cost
  - [ ] Total Discounts
- [ ] RevenueTrackerCard renders below scorecards
- [ ] Monthly Breakdown table visible on desktop (>= 768px width)
- [ ] Mobile cards visible on mobile (< 768px width)

---

## Interactions - Month Expansion

- [ ] Click on month header row → month expands to show sections
- [ ] Click expanded month header → month collapses
- [ ] Chevron icon changes direction (ChevronDown ↔ ChevronUp)
- [ ] Multiple months can be expanded simultaneously

---

## Interactions - Section Expansion

- [ ] Click "Tickets" section → ticket details appear
- [ ] Click expanded "Tickets" section → details collapse
- [ ] Click "Projects" section → project details appear
- [ ] Click expanded "Projects" section → details collapse
- [ ] Click "Hosting" section → hosting site details appear
- [ ] Click expanded "Hosting" section → details collapse
- [ ] Sections expand independently within same month

---

## Ticket Details Display

- [ ] Individual ticket rows show: Date, Description, Urgency, Rate, Hours, Amount
- [ ] Click ticket description → full description expands (line-clamp removed)
- [ ] Click expanded description → truncates back to 2 lines
- [ ] Gross Total row displays correct sum of all ticket amounts
- [ ] If free hours applied: Green "Free Support Hours Benefit" row appears
- [ ] If free hours applied: Blue "Net Billable" row shows final amount
- [ ] Free hours savings calculated correctly (Gross - Net = Savings)

---

## Project Details Display

- [ ] Individual project rows show: Date, Name, Category, Amount
- [ ] Site favicon displays next to project name
- [ ] Projects with `isFreeCredit: true` show green "FREE" badge
- [ ] Free credit projects show strikethrough original amount
- [ ] Free credit projects show $0.00 net amount in green
- [ ] Landing page credits display in section header (if applicable)
- [ ] Multi-form credits display in section header (if applicable)
- [ ] Basic form credits display in section header (if applicable)

---

## Hosting Details Display

- [ ] Individual hosting rows show: Date, Site Name, Billing Type, Days Active, Credit Applied, Amount
- [ ] Site favicon displays next to site name
- [ ] Billing type badges show correct colors:
  - [ ] Green = FULL
  - [ ] Blue = PRORATED_START
  - [ ] Orange = PRORATED_END
  - [ ] Slate = INACTIVE
- [ ] Sites with free credits show green Zap icon + "FREE" text
- [ ] Gross Total row displays correct sum
- [ ] If hosting credits applied: Green "Free Hosting Credit" row appears
- [ ] If hosting credits applied: Blue "Net Billable" row shows final amount

---

## Calculations - Scorecards

- [ ] **Total Revenue** = Tickets + Projects + Hosting
- [ ] **Support Tickets** shows net revenue after free hours
- [ ] **Project Revenue** shows net revenue after project credits
- [ ] **Hosting MRR** shows current month MRR when "All Months" selected
- [ ] **Hosting MRR** shows selected month MRR when single month selected
- [ ] **Avg Ticket Cost** = Total Tickets Revenue / Total Tickets Count
- [ ] **Avg Project Cost** = Total Projects Revenue / Total Projects Count
- [ ] **Avg Hosting Cost** = Total Hosting Revenue / Total Site-Months
- [ ] **Total Discounts** = Sum of all free hours + project credits + hosting credits

---

## Calculations - Grand Totals

**When multiple months displayed:**
- [ ] Grand Totals row appears at bottom of table
- [ ] Grand Total Tickets = Sum of all months' ticket revenue
- [ ] Grand Total Projects = Sum of all months' project revenue
- [ ] Grand Total Hosting = Sum of all months' hosting revenue
- [ ] Grand Total Revenue = Sum of all three categories
- [ ] Mobile: Grand Total card appears with same values

**When single month displayed:**
- [ ] No grand totals row (only one month's data)

---

## Filters & Period Selection

- [ ] Year selector dropdown works
- [ ] Month selector dropdown works
- [ ] Selecting "All Months" shows all available months
- [ ] Selecting specific month filters to only that month
- [ ] Scorecard values update when period changes
- [ ] Table/cards update when period changes
- [ ] Free credit descriptions update based on period eligibility

---

## CSV Export

- [ ] Click "Export CSV" button
- [ ] CSV file downloads automatically
- [ ] Filename includes period (e.g., `monthly-breakdown-all.csv` or `monthly-breakdown-2025-06.csv`)
- [ ] CSV contains expected columns:
  - Month, Tickets Revenue, Projects Revenue, Hosting Revenue, Total Revenue
  - Detailed line items for each section
- [ ] CSV values match what's displayed in UI
- [ ] Open CSV in Excel/Numbers → data is properly formatted

---

## Responsive Design

**Desktop (>= 768px):**
- [ ] Table layout displays
- [ ] All 8 columns visible
- [ ] Horizontal scroll if needed
- [ ] Export button visible in table header

**Mobile (< 768px):**
- [ ] Card layout displays (no table)
- [ ] Each month is a separate card
- [ ] Tap month card → expands/collapses
- [ ] Tap section header → expands/collapses
- [ ] Grand total card appears at bottom (if multiple months)
- [ ] Touch targets are adequate size (minimum 44x44px)

---

## Dark Mode

- [ ] Toggle dark mode in app
- [ ] All text remains readable
- [ ] Scorecard backgrounds adapt to dark theme
- [ ] Table/card backgrounds adapt to dark theme
- [ ] Badge colors remain vibrant but readable
- [ ] Green/blue/orange colors have appropriate dark mode variants
- [ ] No white backgrounds bleeding through

---

## Theme Consistency

- [ ] All components use monochrome base (grayscale)
- [ ] Border radius is 0rem (sharp edges) throughout
- [ ] Minimal shadows (only subtle header shadow)
- [ ] Category colors consistent:
  - [ ] Blue for Tickets
  - [ ] Yellow for Projects
  - [ ] Green for Hosting
- [ ] Badge styling consistent (text-xs, ring-1, appropriate padding)

---

## Performance

- [ ] Dashboard loads in < 3 seconds
- [ ] No layout shift during load (CLS score good)
- [ ] Smooth expand/collapse animations
- [ ] No lag when clicking month/section headers
- [ ] Export CSV generates quickly (< 1 second)
- [ ] No memory leaks (check DevTools Memory tab after 5+ expansions)

---

## Edge Cases

- [ ] Month with 0 tickets shows "-" in table
- [ ] Month with 0 projects shows "-" in table
- [ ] Month with 0 hosting shows "-" in table
- [ ] Month before June 2025 shows "Not eligible for free hours credit"
- [ ] Periods without free credits don't show credit badges
- [ ] Very long project names wrap or truncate appropriately
- [ ] Very long ticket descriptions truncate with line-clamp

---

## Accessibility

- [ ] All interactive elements keyboard accessible (tab navigation)
- [ ] Enter/Space keys expand/collapse sections
- [ ] Screen reader announces section state (expanded/collapsed)
- [ ] Color is not the only indicator (icons also present)
- [ ] Sufficient contrast ratios (4.5:1 minimum for text)

---

## Notes

**Issues Found**:
_____________________________________________________________________________
_____________________________________________________________________________
_____________________________________________________________________________

**Screenshots Attached**:
- [ ] Desktop All Months view
- [ ] Desktop Single Month view
- [ ] Desktop Expanded Month
- [ ] Mobile view
- [ ] Dark mode view

**Sign-off**: _____________________ Date: _____________
