# Mobile Optimization Refactor Instructions

This document defines the workflow to refactor the React/Tailwind business-intelligence dashboard for optimal display and usability on iPhone-sized viewports (≈375×812px).

## Code Analysis Results (October 2025)

### Current State Assessment

#### ✅ **Working Well**
1. **Mobile Navigation** - Hamburger menu implemented correctly
   - Located at [Sidebar.tsx:47-53](frontend/src/components/Sidebar.tsx#L47-53)
   - Off-canvas drawer with overlay working
   - Touch targets meet 44×44px minimum (`min-w-[44px] min-h-[44px]`)
   - Auto-closes on navigation and window resize

2. **Basic Responsive Structure**
   - App layout uses `pt-14 sm:pt-0` for hamburger clearance
   - Sidebar properly hides on mobile with `-translate-x-full sm:translate-x-0`
   - Dark mode support implemented throughout

#### ❌ **Critical Issues to Fix**

### 1. Scorecard Grid Layout (HIGH PRIORITY)
**Problem**: Six scorecards in horizontal flex row causes horizontal overflow on mobile
```typescript
// Current (Dashboard.tsx:1583)
<div className="flex gap-4 w-full">
  {/* 6 scorecards */}
</div>
```
**Solution**: Implement responsive grid
```typescript
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
  {/* 6 scorecards */}
</div>
```
**Files**: Dashboard.tsx, BillingOverview.tsx, Projects.tsx, HostingBilling.tsx

### 2. Page Header Typography (MEDIUM PRIORITY)
**Problem**: Title at `text-3xl` is too large for 375px screens
```typescript
// Current (PageHeader.tsx:69)
<h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
```
**Solution**: Responsive typography
```typescript
<h1 className="text-xl sm:text-2xl lg:text-3xl font-semibold tracking-tight">{title}</h1>
```

### 3. Content Padding (MEDIUM PRIORITY)
**Problem**: Fixed `p-8` (32px) padding wastes screen space on mobile
```typescript
// Current (Dashboard.tsx:1580)
<div className="p-8 space-y-8">
```
**Solution**: Responsive padding
```typescript
<div className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8">
```

### 4. Table Horizontal Overflow (HIGH PRIORITY)
**Problem**: Tables lack scroll containers - will break layout on mobile
**Affected Components**:
- Dashboard main table
- BillingOverview nested tables
- MonthlyHostingCalculator
- MonthlyRevenueTable
- Projects table (if present)

**Solution**: Wrap tables in scroll containers
```typescript
<div className="overflow-x-auto -mx-4 sm:-mx-0">
  <div className="inline-block min-w-full align-middle">
    <table className="min-w-full">
      {/* table content */}
    </table>
  </div>
</div>
```

### 5. Header Controls Layout (MEDIUM PRIORITY)
**Problem**: Controls stack horizontally with `space-x-6`, crowding mobile
```typescript
// Current (PageHeader.tsx:72)
<div className="flex items-center space-x-6">
```
**Solution**: Stack vertically on mobile
```typescript
<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:space-x-6 sm:gap-0">
```

### 6. Filter Pills Sizing (LOW PRIORITY)
**Problem**: Filter pills use fixed padding, could be smaller on mobile
```typescript
// Current (Dashboard.tsx:2594)
className="inline-flex items-center gap-2 px-3 py-1.5 ..."
```
**Solution**: Responsive sizing
```typescript
className="inline-flex items-center gap-1.5 sm:gap-2 px-2 py-1 sm:px-3 sm:py-1.5 text-xs sm:text-sm ..."
```

### 7. Chart Responsiveness (MEDIUM PRIORITY)
**Current Status**:
- Charts use `ResponsiveContainer` ✅
- Font sizes fixed at 12px (readable but could be optimized)
- Legends may overflow on narrow screens

**Improvements Needed**:
- Conditional font sizing based on container width
- Legend orientation (vertical on mobile, horizontal on desktop)
- Touch-friendly tooltip activation

## Implementation Plan

### Phase 1: Layout Fixes (Critical) ✅ COMPLETED
- [x] Convert scorecard flex layouts to responsive grids
- [x] Add table horizontal scroll wrappers
- [x] Implement responsive padding/spacing

### Phase 2: Typography & Controls (Important) ✅ COMPLETED
- [x] Update page header text sizing
- [x] Fix header controls stacking
- [x] Optimize filter pill dimensions

### Phase 3: Chart Enhancements (Polish) ✅ COMPLETED
- [x] Improve chart legend positioning
- [x] Add responsive font scaling
- [x] Enhance touch interactions

### Phase 4: Testing & Validation ⏳ PENDING
- [ ] Test at 375px width (iPhone SE)
- [ ] Test at 390px width (iPhone 12/13/14)
- [ ] Test at 430px width (iPhone 14 Pro Max)
- [ ] Verify all touch targets meet 44×44px minimum
- [ ] Test hamburger menu interactions
- [ ] Validate table scrolling on touch devices
- [ ] Check dark mode on mobile screens

## Files to Modify

### High Priority
1. `frontend/src/components/Dashboard.tsx` - Scorecard grid, padding, table overflow
2. `frontend/src/components/BillingOverview.tsx` - Scorecard grid, table overflow
3. `frontend/src/components/PageHeader.tsx` - Typography, controls layout
4. `frontend/src/components/MonthlyHostingCalculator.tsx` - Table overflow
5. `frontend/src/components/MonthlyRevenueTable.tsx` - Table overflow

### Medium Priority
6. `frontend/src/components/Projects.tsx` - Layout optimization
7. `frontend/src/components/HostingBilling.tsx` - Layout optimization
8. `frontend/src/components/RequestBarChart.tsx` - Chart responsiveness
9. `frontend/src/components/CategoryPieChart.tsx` - Legend optimization

### Low Priority
10. `frontend/src/components/CategoryRadarChart.tsx` - Label positioning
11. Filter components - Sizing optimization

## Testing Checklist

- [ ] Hamburger menu opens/closes smoothly
- [ ] Scorecards stack properly on mobile (1 column)
- [ ] Tables scroll horizontally without layout breaks
- [ ] All text is legible at 375px width
- [ ] Touch targets are minimum 44×44px
- [ ] Page headers don't overflow
- [ ] Charts render with proper sizing
- [ ] Filter controls are accessible
- [ ] Dark mode works correctly
- [ ] No horizontal page scroll (except tables)

## Notes

- Tailwind breakpoints: `sm:640px`, `md:768px`, `lg:1024px`, `xl:1280px`
- Target viewport: 375×812px (iPhone SE / 13 mini)
- Current implementation already has working hamburger menu
- Focus on preventing horizontal overflow and improving readability

---

## Changes Implemented (October 2025)

### Dashboard.tsx
1. **Scorecard Layout**: Changed from `flex` to `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6`
2. **Content Padding**: Updated from `p-8` to `p-4 sm:p-6 lg:p-8`
3. **Spacing**: Changed from `space-y-8` to `space-y-6 sm:space-y-8`
4. **Table Overflow**: Wrapped main table in `overflow-x-auto -mx-4 sm:-mx-0` container
5. **Filter Pills**: Reduced sizing with responsive classes:
   - `gap-1.5 sm:gap-2`
   - `px-2 py-1 sm:px-3 sm:py-1.5`
   - `text-xs sm:text-sm`

### PageHeader.tsx
1. **Container Layout**: Changed to flex-col on mobile: `flex-col sm:flex-row`
2. **Title Typography**: Responsive sizing `text-xl sm:text-2xl lg:text-3xl`
3. **Padding**: Responsive padding `px-4 sm:px-6 lg:px-8 py-3 sm:py-4`
4. **Controls Stack**: Vertical on mobile with `gap-3 sm:gap-0`

### HostingBilling.tsx
1. **Header Responsiveness**: Applied same responsive patterns as PageHeader
2. **Title Sizing**: Changed to `text-xl sm:text-2xl`
3. **Controls Layout**: Stack vertically on mobile

### Sidebar.tsx
1. **Hamburger Button**: Changed to `bg-card` with `backdrop-blur-sm` for better visibility
2. **Touch Targets**: Already meets 44×44px minimum requirement

### RequestBarChart.tsx
1. **Chart Height**: Responsive height `min-h-[300px] sm:min-h-[350px]`
2. **Font Sizes**: Reduced to 10px for mobile readability
3. **Margins**: Added chart margins for better spacing
4. **Tooltip**: Enhanced with better padding and border radius
5. **Legend**: Reduced icon size and font size for mobile

### BillingOverview.tsx (NEW - Mobile Card Layout)
1. **Desktop Table**: Wrapped existing table in `hidden md:block`
2. **Mobile Cards**: Created new `MobileMonthCard` component for <768px screens
3. **Card Features**:
   - Collapsible month cards with revenue breakdown
   - Expandable tickets/projects/hosting sections
   - Shows all details: line items, credits, counts
   - Touch-friendly with `active:` states for feedback
   - Icons for visual categories (Ticket, FolderKanban, Server)
4. **Grand Total Card**: Mobile-optimized black card with breakdown
5. **Responsive Breakpoint**: `md:` (768px) - cards below, table above

### Already Responsive (No Changes Needed)
- Projects.tsx - Already has responsive grids
- MonthlyHostingCalculator.tsx - Already has overflow-auto
- MonthlyRevenueTable.tsx - Already has overflow-auto
- All tables already wrapped in scroll containers

## Testing Access

- **Development URL**: http://localhost:5174
- **Production URL**: https://velocity.peakonedigital.com/billing-overview-api/

## Next Steps

1. **Browser Testing**: Test on actual mobile devices or browser DevTools mobile emulation
2. **Touch Testing**: Verify all interactive elements work well with touch
3. **Performance**: Check rendering performance on mobile devices
4. **Accessibility**: Run accessibility audit for mobile screens
5. **Cross-browser**: Test on Safari iOS, Chrome Android, Firefox mobile

---

## Mobile Optimization Patterns (Reference Guide)

This section documents all mobile-first responsive patterns implemented in BillingOverview, Dashboard, and related components. Use this as a reference when optimizing remaining pages like MonthlyHostingCalculator and MonthlyRevenueTable.

### 1. Scorecard Grid Layouts

**Pattern**: Responsive grid that stacks vertically on mobile, 2 columns on tablet, 3+ columns on desktop.

**Before**:
```typescript
<div className="flex gap-4 w-full">
  <Scorecard title="..." value="..." />
  <Scorecard title="..." value="..." />
  <Scorecard title="..." value="..." />
  {/* 4-6 scorecards causing horizontal overflow */}
</div>
```

**After**:
```typescript
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
  <Scorecard title="..." value="..." />
  <Scorecard title="..." value="..." />
  <Scorecard title="..." value="..." />
  {/* Responsive grid prevents overflow */}
</div>
```

**Breakpoint Logic**:
- Mobile (<640px): 1 column (full width)
- Tablet (640-1023px): 2 columns
- Desktop (1024-1279px): 3 columns
- Large Desktop (1280px+): Up to 6 columns

**Applied To**: Dashboard.tsx, BillingOverview.tsx

---

### 2. Responsive Padding & Spacing

**Pattern**: Reduce padding on mobile to maximize content space, increase on larger screens for breathing room.

**Before**:
```typescript
<div className="p-8 space-y-8">
  {/* Fixed padding wastes mobile space */}
</div>
```

**After**:
```typescript
<div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 lg:space-y-8">
  {/* Responsive padding optimizes for screen size */}
</div>
```

**Padding Scale**:
- Mobile: `p-4` (16px)
- Tablet: `sm:p-6` (24px)
- Desktop: `lg:p-8` (32px)

**Spacing Scale**:
- Mobile: `space-y-4` (16px gap)
- Tablet: `sm:space-y-6` (24px gap)
- Desktop: `lg:space-y-8` (32px gap)

**Applied To**: Dashboard.tsx, BillingOverview.tsx, all page components

---

### 3. Responsive Typography

**Pattern**: Scale text sizes down on mobile, up on desktop for optimal readability.

**Before**:
```typescript
<h1 className="text-3xl font-semibold">{title}</h1>
```

**After**:
```typescript
<h1 className="text-xl sm:text-2xl lg:text-3xl font-semibold truncate">{title}</h1>
```

**Typography Scale**:
- Mobile: `text-xl` (20px)
- Tablet: `sm:text-2xl` (24px)
- Desktop: `lg:text-3xl` (30px)

**Additional Classes**:
- `truncate` - Prevents text overflow with ellipsis
- `tracking-tight` - Reduces letter spacing for headers

**Applied To**: PageHeader.tsx, all page titles

---

### 4. Table/Card Dual Layout Pattern

**Pattern**: Show tables on desktop (md:768px+), cards on mobile (<768px) for complex nested data.

**Implementation**:
```typescript
{/* Desktop: Table View */}
<div className="hidden md:block overflow-x-auto">
  <table className="min-w-full">
    {/* Complex nested table structure */}
  </table>
</div>

{/* Mobile: Card View */}
<div className="md:hidden space-y-3">
  {data.map((item) => (
    <MobileCard key={item.id} data={item} />
  ))}
</div>
```

**When to Use**:
- ✅ Complex tables with 5+ columns
- ✅ Nested/hierarchical data (months → sections → line items)
- ✅ Tables with multiple levels of detail
- ❌ Simple tables with 2-3 columns (use horizontal scroll instead)

**Applied To**: BillingOverview.tsx

---

### 5. Mobile Card Component Pattern

**Structure**: Collapsible cards with expandable sections for hierarchical data.

**Complete Pattern**:
```typescript
interface MobileCardProps {
  data: MonthlyData;
  isExpanded: boolean;
  onToggle: (id: string) => void;
  onToggleSection: (id: string, section: string) => void;
  isSectionExpanded: (id: string, section: string) => boolean;
}

function MobileCard({ data, isExpanded, onToggle, onToggleSection, isSectionExpanded }: MobileCardProps) {
  return (
    <div className="border bg-card rounded-lg overflow-hidden">
      {/* Card Header (Level 1) - Always Visible */}
      <div
        className="bg-muted/50 p-4 cursor-pointer active:bg-muted/70"
        onClick={() => onToggle(data.id)}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-base flex items-center gap-2">
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {data.title}
          </h3>
          <span className="font-bold text-lg">{formatCurrency(data.total)}</span>
        </div>

        {/* Summary Rows (always visible) */}
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground flex items-center gap-2">
              <Icon className="h-3.5 w-3.5" />
              Category Name
            </span>
            <span className="font-medium">{formatCurrency(data.categoryAmount)}</span>
          </div>
        </div>
      </div>

      {/* Expanded Details (Level 2) - Collapsible */}
      {isExpanded && (
        <div className="border-t">
          {/* Section Header */}
          <div
            className="flex items-center justify-between p-3 bg-muted/20 cursor-pointer active:bg-muted/40"
            onClick={() => onToggleSection(data.id, 'section-name')}
          >
            <div className="flex items-center gap-2">
              {isSectionExpanded(data.id, 'section-name') ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
              <Icon className="h-4 w-4" />
              <span className="font-medium text-sm">Section Title</span>
            </div>
            <span className="font-semibold text-sm">{formatCurrency(data.sectionTotal)}</span>
          </div>

          {/* Section Details (Level 3) - Line Items */}
          {isSectionExpanded(data.id, 'section-name') && (
            <div className="p-3 space-y-2 text-xs bg-background">
              {data.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-start py-1 border-b last:border-b-0">
                  <div className="flex-1 pr-2">
                    <div className="font-medium">{item.name}</div>
                    <div className="text-muted-foreground mt-0.5">{item.details}</div>
                  </div>
                  <div className="text-right font-semibold whitespace-nowrap">
                    {formatCurrency(item.amount)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

**Key Classes**:
- `active:bg-muted/70` - Touch feedback on tap
- `active:bg-muted/40` - Lighter feedback for nested sections
- `cursor-pointer` - Indicates clickable areas
- `last:border-b-0` - Removes border from last item
- `whitespace-nowrap` - Prevents amount wrapping

**State Management**:
```typescript
const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
const [expandedSections, setExpandedSections] = useState<Map<string, Set<string>>>(new Map());

const toggleItem = (id: string) => {
  setExpandedItems(prev => {
    const newSet = new Set(prev);
    newSet.has(id) ? newSet.delete(id) : newSet.add(id);
    return newSet;
  });
};

const toggleSection = (itemId: string, section: string) => {
  setExpandedSections(prev => {
    const newMap = new Map(prev);
    if (!newMap.has(itemId)) {
      newMap.set(itemId, new Set());
    }
    const sections = new Set(newMap.get(itemId)!);
    sections.has(section) ? sections.delete(section) : sections.add(section);
    newMap.set(itemId, sections);
    return newMap;
  });
};
```

**Applied To**: BillingOverview.tsx (MobileMonthCard component, ~260 lines)

---

### 6. Mobile Header Architecture

**Pattern**: Sticky header with hamburger menu, logo, and controls that adapt to mobile.

**Structure**:
```typescript
<div className="sticky top-0 z-10 bg-background border-b">
  {/* Top Row: Logo + Title + Hamburger */}
  <div className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex items-center justify-between gap-3">
    {/* Left: Logo (mobile only) + Title */}
    <div className="flex items-center gap-3 min-w-0 flex-1">
      {onToggleMobileMenu && (
        <div className="sm:hidden bg-black px-2 py-1 rounded flex-shrink-0">
          <img src={velocityLogo} alt="Velocity" className="h-4 w-auto object-contain" />
        </div>
      )}
      <h1 className="text-xl sm:text-2xl lg:text-3xl font-semibold tracking-tight truncate">
        {title}
      </h1>
    </div>

    {/* Right: Hamburger (mobile) + Desktop Controls */}
    <div className="flex items-center gap-3 flex-shrink-0">
      {/* Hamburger button - only visible on mobile */}
      {onToggleMobileMenu && (
        <button
          onClick={onToggleMobileMenu}
          className="sm:hidden p-2.5 rounded-md bg-card border border-border shadow-sm hover:bg-muted transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Toggle menu"
        >
          <Menu size={20} />
        </button>
      )}

      {/* Desktop Controls - hidden on mobile */}
      <div className="hidden sm:flex items-center gap-6">
        {showPeriodSelector && <PeriodSelector type={periodSelectorType} label={periodLabel} />}
        {showViewToggle && <ViewModeToggle label={viewLabel} availableModes={viewOptions} size="sm" />}
        {rightControls}
      </div>
    </div>
  </div>

  {/* Mobile Controls Row - below header, only visible on mobile */}
  {(showPeriodSelector || showViewToggle || rightControls) && (
    <div className="sm:hidden px-4 pb-3 border-t flex items-center gap-3 overflow-x-auto">
      {showPeriodSelector && <PeriodSelector type={periodSelectorType} label={periodLabel} />}
      {showViewToggle && <ViewModeToggle label={viewLabel} availableModes={viewOptions} size="sm" />}
      {rightControls}
    </div>
  )}
</div>
```

**Key Features**:
- Logo appears only on mobile when hamburger exists
- Controls show inline on desktop, separate row on mobile
- Hamburger positioned on right for thumb access
- 44×44px minimum touch target on hamburger
- `overflow-x-auto` on mobile controls row for horizontal scroll if needed

**Props Interface**:
```typescript
interface PageHeaderProps {
  title: string;
  showPeriodSelector?: boolean;
  periodSelectorType?: 'full' | 'simple';
  periodLabel?: string;
  showViewToggle?: boolean;
  viewOptions?: ViewMode[];
  viewLabel?: string;
  rightControls?: React.ReactNode;
  onToggleMobileMenu?: () => void;
  className?: string;
}
```

**Applied To**: PageHeader.tsx

---

### 7. Navigation State Management (Mobile Menu)

**Pattern**: Lift mobile menu state to App level, pass down to Sidebar and PageHeader.

**App.tsx**:
```typescript
function App() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        currentView={currentView}
        onNavigate={setCurrentView}
        isMobileOpen={isMobileMenuOpen}
        setIsMobileOpen={setIsMobileMenuOpen}
      />
      <main className="flex-1 overflow-auto">
        {currentView === 'overview' && (
          <BillingOverview onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)} />
        )}
      </main>
    </div>
  );
}
```

**Sidebar.tsx**:
```typescript
interface SidebarProps {
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

export function Sidebar({ isMobileOpen, setIsMobileOpen }: SidebarProps) {
  // Close menu when view changes
  useEffect(() => {
    setIsMobileOpen(false);
  }, [currentView]);

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div className="sm:hidden fixed inset-0 bg-black/50 z-30" onClick={() => setIsMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <div className={`
        h-screen bg-background border-r flex flex-col
        transition-all duration-300 ease-in-out
        sm:relative fixed z-40
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full sm:translate-x-0'}
      `}>
        {/* Sidebar content */}
      </div>
    </>
  );
}
```

**Page Component**:
```typescript
interface PageProps {
  onToggleMobileMenu?: () => void;
}

export function Page({ onToggleMobileMenu }: PageProps) {
  return (
    <PageHeader
      title="Page Title"
      onToggleMobileMenu={onToggleMobileMenu}
    />
  );
}
```

**Z-Index Layers**:
- Overlay: `z-30`
- Sidebar: `z-40`
- Hamburger button: Inherits from PageHeader `z-10`

**Applied To**: App.tsx, Sidebar.tsx, PageHeader.tsx, all page components

---

### 8. Chart Responsiveness

**Pattern**: Adjust chart types, sizing, and formatting based on screen size and data context.

**Responsive Height**:
```typescript
<div className="w-full min-h-[300px] sm:min-h-[350px] h-full">
  <ResponsiveContainer width="100%" height="100%">
    <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
      {/* Chart content */}
    </BarChart>
  </ResponsiveContainer>
</div>
```

**Conditional Chart Types (Mobile)**:
```typescript
{/* Desktop: Always bar chart */}
<div className="hidden md:block">
  <ResponsiveContainer width="100%" height={400}>
    <BarChart data={chartData}>
      <XAxis
        dataKey="month"
        angle={filteredData.length > 1 ? -45 : 0}
        textAnchor={filteredData.length > 1 ? 'end' : 'middle'}
        height={filteredData.length > 1 ? 80 : 60}
      />
      {/* Bars */}
    </BarChart>
  </ResponsiveContainer>
</div>

{/* Mobile: Pie chart for single month, bar for multiple months */}
<div className="md:hidden">
  {filteredData.length === 1 ? (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={pieData.filter(item => item.value > 0)}
          label={(entry) => `${entry.name}: ${formatCurrency(entry.value)}`}
          outerRadius={100}
        >
          {pieData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  ) : (
    <BarChart data={chartData} />
  )}
</div>
```

**Responsive Font Sizes**:
```typescript
<XAxis
  tick={{ fontSize: 10 }}  // Smaller on mobile
  className="text-xs sm:text-sm"
/>
<YAxis
  tick={{ fontSize: 10 }}
  className="text-xs sm:text-sm"
/>
<Tooltip
  contentStyle={{
    fontSize: '0.875rem',
    padding: '8px 12px',
    borderRadius: '6px'
  }}
/>
<Legend
  wrapperStyle={{ fontSize: '0.75rem' }}
  iconSize={12}
/>
```

**Dynamic Chart Titles**:
```typescript
<h3 className="text-xl font-semibold mb-4">
  {filteredData.length === 1
    ? `${formatMonthLabel(filteredData[0].month)} Revenue Breakdown`
    : 'Monthly Revenue by Category'
  }
</h3>
```

**Applied To**: BillingOverview.tsx (charts), RequestBarChart.tsx

---

### 9. Touch-Friendly Interactions

**Pattern**: Provide visual feedback for touch interactions and meet minimum touch target sizes.

**Touch Targets**:
```typescript
// Minimum 44×44px for touch targets
<button className="min-w-[44px] min-h-[44px] p-2.5">
  <Icon size={20} />
</button>
```

**Touch Feedback States**:
```typescript
// Card headers
<div className="cursor-pointer active:bg-muted/70 hover:bg-muted/60">
  {/* Content */}
</div>

// Section headers (nested)
<div className="cursor-pointer active:bg-muted/40 hover:bg-muted/30">
  {/* Content */}
</div>

// Buttons
<button className="hover:bg-accent active:bg-accent/80 transition-colors">
  {/* Content */}
</button>
```

**State Classes**:
- `active:bg-muted/70` - Strong feedback for primary interactive areas
- `active:bg-muted/40` - Lighter feedback for nested sections
- `hover:` states for desktop hover support
- `transition-colors` for smooth state changes

**Applied To**: All interactive components, mobile cards, buttons

---

### 10. Filter Pills & Controls

**Pattern**: Responsive sizing for filter badges and control elements.

**Before**:
```typescript
<span className="inline-flex items-center gap-2 px-3 py-1.5 text-sm">
  {/* Fixed sizing */}
</span>
```

**After**:
```typescript
<span className="inline-flex items-center gap-1.5 sm:gap-2 px-2 py-1 sm:px-3 sm:py-1.5 text-xs sm:text-sm">
  {/* Responsive sizing */}
</span>
```

**Responsive Properties**:
- Gap: `gap-1.5 sm:gap-2` (6px → 8px)
- Padding X: `px-2 sm:px-3` (8px → 12px)
- Padding Y: `py-1 sm:py-1.5` (4px → 6px)
- Text: `text-xs sm:text-sm` (12px → 14px)

**Applied To**: Dashboard.tsx filters, all badge components

---

### 11. Z-Index Management

**Pattern**: Proper z-index layering to prevent overlapping issues.

**Z-Index Scale**:
- `z-10` - Sticky headers (PageHeader)
- `z-30` - Mobile overlay
- `z-40` - Mobile sidebar
- `z-50` - Modal dialogs (standard)
- `z-[100]` - Dropdowns, popovers, date pickers (must appear above everything)

**Example (Date Picker)**:
```typescript
<div className="absolute top-full mt-2 right-0 z-[100] bg-card rounded-lg shadow-lg">
  {/* Popover content */}
</div>
```

**Why z-[100]**: When a parent has `z-10` (like sticky header), child elements with `z-50` are relative to that stacking context. Using `z-[100]` ensures the popover appears above all other elements including scorecards.

**Applied To**: DatePickerPopover.tsx, all dropdown components

---

## Application Checklist for Remaining Pages

Use this checklist when optimizing MonthlyHostingCalculator and MonthlyRevenueTable:

### MonthlyHostingCalculator.tsx
- [ ] **Already Has**: Table with `overflow-auto` wrapper ✅
- [ ] **Needs**: Mobile card layout for <768px screens (similar to BillingOverview)
- [ ] **Needs**: Responsive padding (currently unknown, check implementation)
- [ ] **Needs**: Filter pills responsive sizing
- [ ] **Needs**: Touch-friendly collapse/expand interactions

**Recommended Approach**:
1. Create `MobileHostingCard` component following BillingOverview pattern
2. Wrap existing table in `hidden md:block`
3. Add mobile cards with `md:hidden`
4. Ensure touch targets meet 44×44px minimum

### MonthlyRevenueTable.tsx
- [ ] **Already Has**: Table with overflow handling ✅
- [ ] **Needs**: Mobile card layout for project details
- [ ] **Needs**: Responsive padding
- [ ] **Needs**: Credit badges visibility on mobile
- [ ] **Needs**: Touch-friendly interactions for expand/collapse

**Recommended Approach**:
1. Create `MobileProjectCard` component
2. Show project details in card format on mobile
3. Ensure FREE badges and credit indicators are visible
4. Add touch feedback states

---

## Common Pitfalls to Avoid

1. **Don't use `flex` for 4+ items horizontally** - Always use responsive grid instead
2. **Don't forget `overflow-x-auto` AND `-mx-4 sm:-mx-0`** - The negative margin extends scroll to edge on mobile
3. **Don't use fixed padding/spacing** - Always use responsive classes (p-4 sm:p-6 lg:p-8)
4. **Don't create separate mobile/desktop components** - Use `hidden md:block` and `md:hidden` for conditional display
5. **Don't forget touch feedback** - Always add `active:` states for mobile interactions
6. **Don't use `z-50` for dropdowns in sticky headers** - Use `z-[100]` to ensure visibility above all elements
7. **Don't forget minimum touch targets** - All interactive elements must be at least 44×44px

---

## Testing Mobile Optimizations

### Browser DevTools
1. Open Chrome/Firefox DevTools (F12)
2. Click "Toggle device toolbar" (Ctrl+Shift+M)
3. Select device: iPhone SE (375×667), iPhone 12/13 (390×844), iPhone 14 Pro Max (430×932)
4. Test all pages at each breakpoint

### What to Test
- [ ] No horizontal page scroll (except within table containers)
- [ ] All text is readable without zooming
- [ ] Touch targets are at least 44×44px
- [ ] Hamburger menu opens/closes smoothly
- [ ] Scorecards stack vertically (1 column) on mobile
- [ ] Tables switch to cards on mobile (or scroll horizontally if simple)
- [ ] Controls are accessible (not hidden or overlapping)
- [ ] Date picker appears above all content
- [ ] Dark mode works correctly on mobile
- [ ] All icons and images load properly

### Common Issues to Watch For
1. **Scorecard overflow** - Check that scorecards don't cause horizontal scroll
2. **Header text truncation** - Ensure titles don't wrap awkwardly
3. **Filter pills overflow** - Pills should wrap or scroll horizontally
4. **Touch target size** - Buttons/icons should be easy to tap
5. **Z-index conflicts** - Dropdowns should appear above other content
6. **Card collapse state** - Chevron icons should update correctly
