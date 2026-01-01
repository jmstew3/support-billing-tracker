# Performance Optimization: Quick Reference

**Goal:** 40-60% faster application
**Time to Implement:** 4-6 weeks
**Priority Actions:** See Week 1 below

---

## 🔴 CRITICAL (Implement First)

### 1. N+1 Billing Query - 70-80% improvement
**File:** `/frontend/src/services/billingApi.ts`
**Issue:** Loads all data without pagination
**Fix:** Create server-side aggregation endpoint
**Impact:** 5-10 seconds → 300-500ms

### 2. Monolithic Components - 35-40% improvement
**File:** `/frontend/src/features/support/components/SupportTickets.tsx`
**Issue:** 898 lines, 13 useState hooks, cascading re-renders
**Fix:** Break into sub-components (Filters, Metrics, Charts, Table)
**Impact:** 500-1000ms filter operations → 100-300ms

### 3. Missing useCallback - 20-30% improvement
**Files:** SupportTickets.tsx, Dashboard.tsx
**Issue:** Event handlers recreated on every render
**Fix:** Wrap in useCallback with proper dependencies
**Impact:** 150-300ms interactions → 50-100ms

---

## 🟠 HIGH (Implement Week 1-2)

### 4. Unoptimized API Payloads - 60-75% improvement
**Issue:** No default pagination, loads 10K+ records
**Fix:** Add limit default and server-side filtering
**Impact:** 3-5 second loads → 500-1000ms

### 5. React Query Cache Not Tuned - 40-50% improvement
**File:** `/frontend/src/config/queryClient.ts` (create new)
**Issue:** staleTime=0ms, data marked stale immediately
**Fix:** Set staleTime to 5 minutes, gcTime to 30 minutes
**Impact:** 40-50% fewer API calls

### 6. Connection Pool Undersized - 5-10 users more
**File:** `/backend/db/config.js`
**Issue:** connectionLimit=10 (too low for production)
**Fix:** Increase to 20-30, add queueLimit
**Impact:** Supports 40-50 concurrent users

---

## 🟡 MEDIUM (Implement Week 2-3)

### 7. Recharts Performance - 40% improvement
**Issue:** Renders all 365+ calendar cells without optimization
**Fix:** Lazy load, limit rendered points, add key props
**Impact:** 300-500ms charts → 200-300ms

### 8. Response Compression Missing - 96% improvement
**File:** `/backend/server.js`
**Issue:** No gzip compression on responses
**Fix:** Add `compression` middleware
**Impact:** 5MB response → 200KB

### 9. Database Indexes Missing - 15-25% improvement
**File:** `/backend/db/migrations/008_*.sql`
**Issue:** Full table scans on complex queries
**Fix:** Add indexes on date, category, urgency + hours
**Impact:** Complex queries 100x faster

### 10. Query Caching Missing - 80% improvement
**Issue:** Every request hits database
**Fix:** Implement Redis caching layer
**Impact:** Repeated queries instant

---

## 📊 Performance Targets

| Metric | Before | After | Improvement |
|--------|--------|-------|------------|
| Dashboard Load | 3-5s | 0.5-1s | 70-80% |
| Filter Operation | 500-1000ms | 100-300ms | 50-70% |
| API Response | 5MB | 200KB | 96% |
| API Calls | 100/min | 30-40/min | 60-70% |
| LCP | 3.5s | 1.8s | 50% |
| FID | 250ms | 45ms | 82% |
| CLS | 0.12 | 0.05 | 58% |

---

## ✅ Week-by-Week Implementation

### Week 1: Critical Path (40% gain)
- [ ] Deploy aggregated billing API
- [ ] Add useCallback to event handlers
- [ ] Add pagination defaults
- [ ] Tune React Query cache

**Effort:** 4-6 hours
**Expected Improvement:** 40% faster

### Week 2: Architecture (25% gain)
- [ ] Decompose SupportTickets component
- [ ] Optimize useSupportData hook
- [ ] Break Dashboard into sub-components

**Effort:** 6-8 hours
**Expected Improvement:** Additional 25%

### Week 3: Infrastructure (15% gain)
- [ ] Add gzip compression
- [ ] Deploy Redis caching
- [ ] Add database indexes
- [ ] Optimize JSON serialization

**Effort:** 4-6 hours
**Expected Improvement:** Additional 15%

### Week 4-6: Polish & Monitoring
- [ ] Implement lazy loading
- [ ] Set up performance monitoring
- [ ] Run Lighthouse audits
- [ ] Optimize bundle size

---

## 🔧 Key Code Patterns

### Pattern 1: useCallback for Events
```typescript
const handleClick = useCallback((value: string) => {
  setState(value)
}, []) // Empty deps if state doesn't change
```

### Pattern 2: useMemo for Expensive Calculations
```typescript
const result = useMemo(() => {
  return expensiveOperation(data)
}, [data]) // Recalculate only when data changes
```

### Pattern 3: React Query Caching
```typescript
useQuery({
  queryKey: ['data', filters],
  queryFn: () => fetchData(filters),
  staleTime: 5 * 60 * 1000, // 5 min
  gcTime: 30 * 60 * 1000,    // 30 min cache
})
```

### Pattern 4: Component Memoization
```typescript
export const MyComponent = memo(function MyComponent(props) {
  return <div>{props.children}</div>
})
```

### Pattern 5: Lazy Component Loading
```typescript
const Component = lazy(() => import('./Component'))

<Suspense fallback={<Skeleton />}>
  <Component />
</Suspense>
```

---

## 📈 Measurement Commands

### Frontend Performance
```bash
# Build and measure bundle
cd frontend && npm run build

# Run Lighthouse audit
npx lighthouse http://localhost:5173 --view

# Check DevTools Performance tab
# 1. Open DevTools → Performance
# 2. Click record
# 3. Perform action (filter, sort)
# 4. Stop recording
# 5. Check render time < 100ms
```

### Backend Performance
```bash
# Measure API response time
time curl http://localhost:3011/api/requests?limit=20

# Check query performance
mysql> SET GLOBAL slow_query_log = 'ON';
mysql> SET GLOBAL long_query_time = 0.1;
mysql> tail -f /var/log/mysql/slow-query.log
```

### Database Performance
```bash
# Check index usage
EXPLAIN SELECT * FROM requests WHERE status = 'active' ORDER BY date DESC;
# Look for: type=range, rows=small number, key=index name

# Check table size
SELECT
  TABLE_NAME,
  ROUND(((data_length + index_length) / 1024 / 1024), 2) AS size_mb
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'support_billing_tracker'
ORDER BY size_mb DESC;
```

---

## 🚀 Quick Wins (30 min each)

1. **Add pagination default** (5 min)
   - File: `/backend/routes/requests.js` line 131
   - Change: `if (parsedLimit)` → `const limit = parsedLimit || 20`

2. **Tune React Query** (15 min)
   - Create: `/frontend/src/config/queryClient.ts`
   - Set: staleTime=5min, gcTime=30min

3. **Add compression** (10 min)
   - File: `/backend/server.js`
   - Add: `app.use(compression())`

4. **Add gzip to responses** (5 min)
   - npm install compression
   - Import and use middleware

---

## 🧪 Testing Checklist

- [ ] Load Dashboard with 1000+ requests - should be < 1 second
- [ ] Filter requests by category - should be < 300ms
- [ ] Sort table by column - should be < 300ms
- [ ] Change month view - should be < 500ms
- [ ] Scroll calendar - should be smooth (60fps)
- [ ] Run Lighthouse - LCP < 2.5s, FID < 100ms, CLS < 0.1
- [ ] Check Network tab - no requests > 500KB (uncompressed)
- [ ] Monitor Memory - no memory leaks over 5 minutes

---

## 📞 Support

**Questions?** See full analysis in:
- `/PERFORMANCE_ANALYSIS.md` - Detailed findings
- `/OPTIMIZATION_IMPLEMENTATION_GUIDE.md` - Step-by-step implementation

**Monitor Progress:**
- Track metrics before/after each week
- Compare Lighthouse scores
- Measure API response times
- Monitor database query times

**Tools Recommended:**
- Chrome DevTools Performance tab
- Lighthouse (automated audits)
- MySQL Workbench (query analysis)
- New Relic or DataDog (production monitoring)

---

**Status:** Ready to implement
**Start Date:** [Your date]
**Expected Completion:** 4-6 weeks from start
**Target:** 40-60% overall performance improvement

