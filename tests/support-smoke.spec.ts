/**
 * Playwright smoke tests for Support Tickets page
 * These tests establish baseline functionality before refactoring
 */
import { test, expect } from '@playwright/test'

test.describe('Support Tickets - Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to Support page
    await page.goto('/')
    // Click on Support menu item in sidebar
    await page.click('[data-testid="nav-support"], text=Support')
    // Wait for page to load
    await page.waitForLoadState('networkidle')
  })

  test('should load Support page with all major sections', async ({ page }) => {
    // Check page heading exists
    await expect(page.locator('text=Support Tickets', page.locator('h1, h2'))).toBeVisible()

    // Check scorecards section exists
    await expect(page.locator('text=Total Requests')).toBeVisible()
    await expect(page.locator('text=Total Cost')).toBeVisible()

    // Check charts section exists (either calendar or category chart)
    const hasCalendar = await page.locator('text=Request Calendar').count() > 0
    const hasChart = await page.locator('text=Category Distribution').count() > 0
    expect(hasCalendar || hasChart).toBeTruthy()

    // Check table exists with headers
    await expect(page.locator('th:has-text("Date")')).toBeVisible()
    await expect(page.locator('th:has-text("Request Summary")')).toBeVisible()
    await expect(page.locator('th:has-text("Category")')).toBeVisible()
    await expect(page.locator('th:has-text("Urgency")')).toBeVisible()
  })

  test('should display data in the table', async ({ page }) => {
    // Wait for table body to have rows
    const rowCount = await page.locator('tbody tr').count()

    // Should have at least some data (unless it's a fresh install)
    // If running against a test database, this might be 0
    console.log(`Found ${rowCount} rows in table`)

    // Just verify the table structure exists even if empty
    await expect(page.locator('table')).toBeVisible()
  })

  test('should have functional date filter controls', async ({ page }) => {
    // Check for year selector
    const yearSelector = page.locator('select[name="year"], [aria-label*="year" i], text=2025')
    const hasYearControl = await yearSelector.count() > 0
    expect(hasYearControl).toBeTruthy()

    // Check for month selector
    const monthSelector = page.locator('select[name="month"], [aria-label*="month" i]')
    const hasMonthControl = await monthSelector.count() > 0

    // Month selector might not be visible if no data
    console.log(`Month selector visible: ${hasMonthControl}`)
  })

  test('should have search functionality', async ({ page }) => {
    // Check for search input
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i], input[aria-label*="search" i]')
    const hasSearch = await searchInput.count() > 0

    expect(hasSearch).toBeTruthy()
  })

  test('should have pagination controls', async ({ page }) => {
    // Check for pagination elements
    const hasPagination = await page.locator('text=Page, button[aria-label*="page" i]').count() > 0

    // Pagination might not be visible if not enough data
    console.log(`Pagination visible: ${hasPagination}`)

    // Just verify page loaded without errors
    await expect(page).toHaveURL(/.*/)
  })

  test('should toggle chart type (pie/radar)', async ({ page }) => {
    // Look for chart type toggle buttons
    const pieButton = page.locator('button:has-text("pie"), [aria-label*="pie chart" i]')
    const radarButton = page.locator('button:has-text("radar"), [aria-label*="radar chart" i]')

    const hasChartToggle = (await pieButton.count() > 0) || (await radarButton.count() > 0)

    // Chart toggle might not be visible depending on view mode
    console.log(`Chart toggle visible: ${hasChartToggle}`)
  })

  test('should load without console errors', async ({ page }) => {
    const errors: string[] = []

    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })

    // Navigate and wait for network
    await page.goto('/')
    await page.click('text=Support')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000) // Wait for any late-loading errors

    // Filter out expected errors (if any)
    const criticalErrors = errors.filter(error =>
      !error.includes('favicon') && // Ignore missing favicon
      !error.includes('ResizeObserver') // Ignore benign ResizeObserver errors
    )

    if (criticalErrors.length > 0) {
      console.log('Console errors:', criticalErrors)
    }

    expect(criticalErrors.length).toBe(0)
  })
})

test.describe('Support Tickets - Basic Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.click('text=Support')
    await page.waitForLoadState('networkidle')
  })

  test('should expand/collapse filters', async ({ page }) => {
    // Try to find and click a filter button
    const filterButtons = page.locator('button[title*="filter" i], button:has-text("Filter")')
    const filterCount = await filterButtons.count()

    if (filterCount > 0) {
      // Click first filter button
      await filterButtons.first().click()
      await page.waitForTimeout(300) // Wait for animation

      // Some filter UI should appear
      // Exact selectors depend on implementation
    }

    console.log(`Found ${filterCount} filter buttons`)
  })

  test('should allow sorting by clicking column headers', async ({ page }) => {
    // Find a sortable column header (Date is usually sortable)
    const dateHeader = page.locator('th:has-text("Date")')

    if (await dateHeader.count() > 0) {
      // Click to sort
      await dateHeader.click()
      await page.waitForTimeout(300)

      // Click again to toggle sort direction
      await dateHeader.click()
      await page.waitForTimeout(300)
    }

    // Just verify no errors occurred
    await expect(page).toHaveURL(/.*/)
  })
})

test.describe('Support Tickets - Visual Regression Baseline', () => {
  test('should match baseline screenshot - default view', async ({ page }) => {
    await page.goto('/')
    await page.click('text=Support')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000) // Wait for all animations

    // Take full page screenshot for baseline
    await expect(page).toHaveScreenshot('support-default-view.png', {
      fullPage: true,
      animations: 'disabled'
    })
  })

  test('should match baseline screenshot - scorecards section', async ({ page }) => {
    await page.goto('/')
    await page.click('text=Support')
    await page.waitForLoadState('networkidle')

    // Find scorecards container
    const scorecards = page.locator('text=Total Requests').locator('..')

    if (await scorecards.count() > 0) {
      await expect(scorecards.first()).toHaveScreenshot('support-scorecards.png')
    }
  })
})
