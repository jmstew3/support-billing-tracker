# Fix Bar Chart Rendering Issue

## 🔍 Problem Diagnosis

The Support Ticket Cost Tracker Chart displays tooltips when hovering but **no bars are visible** in the UI.

### Root Causes Identified:

1. **Custom `shape` prop overriding default rendering** - The custom shape function ignores urgency filtering
2. **Data structure mismatch** - Individual `fill` colors per urgency aren't being applied
3. **Missing interactive legend** - Single period chart lacks clickable legend functionality
4. **Bar color mapping not connected to visibility state**

---

## ✅ Solution

Replace the `renderSinglePeriodChart()` function in `/share/Coding/Docker/thad-chat/frontend/src/components/Support/CostTrackerCard.tsx`

### Step 1: Locate the Function

Find the `renderSinglePeriodChart` function (approximately line 500-650 in the file).

### Step 2: Replace with Fixed Version

Replace the entire `renderSinglePeriodChart` function with this corrected version:

```typescript
  // Render single period chart - FIXED VERSION
  const renderSinglePeriodChart = () => {
    if (!costData) return null;

    const chartData = [
      { 
        name: 'Promotion', 
        hours: costData.promotionalHours, 
        cost: costData.promotionalNetCost !== undefined ? costData.promotionalNetCost : costData.promotionalCost,
        visible: visibleUrgencies.Promotion
      },
      { 
        name: 'Low', 
        hours: costData.regularHours, 
        cost: costData.regularNetCost !== undefined ? costData.regularNetCost : costData.regularCost,
        visible: visibleUrgencies.Low
      },
      { 
        name: 'Medium', 
        hours: costData.sameDayHours, 
        cost: costData.sameDayNetCost !== undefined ? costData.sameDayNetCost : costData.sameDayCost,
        visible: visibleUrgencies.Medium
      },
      { 
        name: 'High', 
        hours: costData.emergencyHours, 
        cost: costData.emergencyNetCost !== undefined ? costData.emergencyNetCost : costData.emergencyCost,
        visible: visibleUrgencies.High
      },
    ];

    // Calculate max value for Y-axis domain (add $250 padding for labels)
    const maxValue = Math.max(...chartData.map(d => d.cost));
    const yAxisMax = maxValue + 250;

    // Define color mapping function
    const getBarColor = (name: string, visible: boolean) => {
      if (!visible) return CHART_STYLES.barColors.disabled;
      switch(name) {
        case 'Promotion': return CHART_STYLES.barColors.promotion;
        case 'Low': return CHART_STYLES.barColors.low;
        case 'Medium': return CHART_STYLES.barColors.medium;
        case 'High': return CHART_STYLES.barColors.high;
        default: return CHART_STYLES.barColors.disabled;
      }
    };

    return (
      <div style={{ width: '100%', minHeight: 400 }}>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData}>
            <CartesianGrid {...CHART_STYLES.cartesianGrid} />
            <XAxis dataKey="name" {...CHART_STYLES.xAxis} />
            <YAxis
              domain={[0, yAxisMax]}
              tickFormatter={(value) => `$${(value).toLocaleString()}`}
              {...CHART_STYLES.yAxis}
            />
            <Tooltip
              cursor={false}
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  const allData = chartData;
                  const totalCost = allData.reduce((sum, item) => sum + item.cost, 0);
                  const totalHours = allData.reduce((sum, item) => sum + item.hours, 0);

                  return (
                    <div style={CHART_STYLES.tooltipContainer}>
                      <p style={CHART_STYLES.tooltipTitle}>{label}</p>
                      <p style={{ ...CHART_STYLES.tooltipItem, color: '#374151' }}>
                        Cost: {formatCurrency(data.cost)}
                      </p>
                      <p style={{ ...CHART_STYLES.tooltipItem, color: '#374151' }}>
                        Hours: {data.hours.toFixed(2)}
                      </p>
                      <div style={CHART_STYLES.tooltipDivider}>
                        <p style={{ color: '#111827', fontSize: '12px' }}>
                          Total: {formatCurrency(totalCost)} ({totalHours.toFixed(2)}h)
                        </p>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend
              wrapperStyle={CHART_STYLES.legendWrapper}
              iconType="rect"
              content={(props) => {
                const { payload } = props;
                const customOrder = ['Promotion', 'Low', 'Medium', 'High'];
                const orderedPayload = customOrder.map(key =>
                  payload?.find(item => item.value === key)
                ).filter((item): item is NonNullable<typeof item> => item !== null && item !== undefined);

                return (
                  <div>
                    <ul style={CHART_STYLES.legendList}>
                      {orderedPayload.map((entry, index) => entry ? (
                        <li
                          key={`item-${index}`}
                          onClick={() => toggleUrgency(entry.value || '')}
                          style={{
                            ...CHART_STYLES.legendItem,
                            opacity: visibleUrgencies[entry.value || ''] ? 1 : 0.35,
                          }}
                        >
                          <span style={{
                            ...CHART_STYLES.legendIcon(visibleUrgencies[entry.value || '']),
                            backgroundColor: entry.color,
                          }} />
                          <span style={CHART_STYLES.legendText(visibleUrgencies[entry.value || ''])}>
                            {entry.value}
                          </span>
                        </li>
                      ) : null)}

                      {isModified && (
                        <>
                          <li style={{
                            width: '1px',
                            height: '20px',
                            backgroundColor: '#E5E7EB',
                            margin: '0 10px'
                          }} />
                          <li
                            onClick={resetFilters}
                            style={CHART_STYLES.resetButton}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.color = '#3B82F6';
                              e.currentTarget.style.backgroundColor = '#EFF6FF';
                              e.currentTarget.style.borderColor = '#BFDBFE';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.color = '#6B7280';
                              e.currentTarget.style.backgroundColor = 'transparent';
                              e.currentTarget.style.borderColor = 'transparent';
                            }}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                              <path d="M21 3v5h-5" />
                              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                              <path d="M8 21H3v-5" />
                            </svg>
                            Reset
                          </li>
                        </>
                      )}
                    </ul>
                  </div>
                );
              }}
            />
            <Bar 
              dataKey="cost" 
              name="Cost"
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`bar-${index}`}
                  fill={getBarColor(entry.name, entry.visible)}
                />
              ))}
              <LabelList
                dataKey="cost"
                position="top"
                formatter={(value: any) => value > 0 ? formatCurrency(value) : ''}
                style={{ fontSize: '12px', fontWeight: 'bold', fill: '#374151' }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  };
```

---

## 🔧 Key Changes Explained

### 1. **Removed Problematic Custom `shape` Prop**

**Before (BROKEN):**
```typescript
<Bar dataKey="cost" name="Cost" shape={(props: any) => {
  const { fill, x, y, width, height } = props;
  return <rect x={x} y={y} width={width} height={height} fill={props.payload.fill || fill} />;
}}>
```

**After (FIXED):**
```typescript
<Bar dataKey="cost" name="Cost">
```

The custom shape function was overriding Recharts' default rendering and not respecting the urgency filter state.

---

### 2. **Added Color Mapping Function**

```typescript
const getBarColor = (name: string, visible: boolean) => {
  if (!visible) return CHART_STYLES.barColors.disabled;
  switch(name) {
    case 'Promotion': return CHART_STYLES.barColors.promotion;
    case 'Low': return CHART_STYLES.barColors.low;
    case 'Medium': return CHART_STYLES.barColors.medium;
    case 'High': return CHART_STYLES.barColors.high;
    default: return CHART_STYLES.barColors.disabled;
  }
};
```

This function dynamically assigns colors based on:
- Urgency level (Promotion, Low, Medium, High)
- Visibility state (from legend clicks)

---

### 3. **Used Recharts `Cell` Component for Individual Bar Colors**

```typescript
<Bar dataKey="cost" name="Cost">
  {chartData.map((entry, index) => (
    <Cell 
      key={`bar-${index}`}
      fill={getBarColor(entry.name, entry.visible)}
    />
  ))}
  <LabelList ... />
</Bar>
```

The `Cell` component is Recharts' proper way to apply individual colors to each bar.

---

### 4. **Added Interactive Legend (Matching Monthly Chart)**

The single period chart now has the same clickable legend as the monthly chart:
- Click legend items to show/hide bars
- Visual opacity changes (100% → 35%)
- "Reset" button appears after filtering
- Hover states on legend items

---

### 5. **Fixed Label Rendering**

```typescript
formatter={(value: any) => value > 0 ? formatCurrency(value) : ''}
```

This prevents "$0.00" labels appearing on empty/hidden bars.

---

## 📋 Testing Checklist

After applying the fix, verify these behaviors:

- [ ] ✅ **Bars are visible** in both single period and monthly views
- [ ] ✅ **Bar colors match urgency levels**:
  - Promotion: Blue (#3B82F6)
  - Low: Green (#10B981)
  - Medium: Yellow/Orange (#F59E0B)
  - High: Red (#EF4444)
- [ ] ✅ **Tooltips appear** on hover showing cost and hours
- [ ] ✅ **Labels display** above bars with correct dollar formatting
- [ ] ✅ **Legend items are clickable** to toggle bar visibility
- [ ] ✅ **"Reset" button appears** after filtering
- [ ] ✅ **Disabled urgencies** show gray bars (#D1D5DB)
- [ ] ✅ **Y-axis scales properly** with padding for labels
- [ ] ✅ **Chart is responsive** at different viewport sizes

---

## 🐛 If Still Not Working

### Debug Steps:

1. **Check Console for Errors:**
```javascript
// Open browser console and run:
console.log('Chart data:', chartData);
console.log('Visible urgencies:', visibleUrgencies);
console.log('Bar elements:', document.querySelectorAll('.recharts-bar-rectangle'));
```

2. **Verify CHART_STYLES:**
Make sure `CHART_STYLES.barColors` exists in your `DataTrackerCard.tsx`:
```typescript
barColors: {
  promotion: '#3B82F6',
  low: '#10B981',
  medium: '#F59E0B',
  high: '#EF4444',
  disabled: '#D1D5DB',
}
```

3. **Check Import Statement:**
Ensure `Cell` is imported from Recharts:
```typescript
import { 
  BarChart, 
  Bar, 
  Cell,  // ← Make sure this is imported
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  LabelList 
} from 'recharts';
```

4. **Inspect Bar Heights:**
```javascript
// In browser console:
document.querySelectorAll('.recharts-bar-rectangle path, .recharts-bar-rectangle rect').forEach(bar => {
  console.log('Bar:', {
    height: bar.getAttribute('height'),
    fill: bar.getAttribute('fill'),
    y: bar.getAttribute('y')
  });
});
```

---

## 📊 Expected Result

After applying this fix, your Cost Tracker Chart should display:

1. **Four colored bars** representing:
   - Promotion (Blue)
   - Low (Green)
   - Medium (Orange)
   - High (Red)

2. **Dollar amounts** displayed above each bar

3. **Interactive legend** allowing you to:
   - Click to show/hide individual urgencies
   - See visual feedback (opacity change)
   - Reset all filters with one click

4. **Tooltips** showing:
   - Urgency level name
   - Cost amount
   - Hours worked
   - Total cost and hours

---

## 🎯 Next Steps

1. Save this document for reference
2. Apply the fix to `CostTrackerCard.tsx`
3. Test in browser (localhost:5173 or your dev server)
4. Verify all checklist items
5. If issues persist, share console output and screenshots

---

## 📝 Notes

- This fix maintains compatibility with the monthly breakdown chart
- All existing functionality is preserved (filtering, tooltips, etc.)
- The fix uses proper Recharts patterns (Cell component vs custom shape)
- Interactive legend now works consistently across both chart views

---

**File Location:** `/share/Coding/Docker/thad-chat/frontend/src/components/Support/CostTrackerCard.tsx`

**Function to Replace:** `renderSinglePeriodChart()` (approximately lines 500-650)

**Date:** October 7, 2025
