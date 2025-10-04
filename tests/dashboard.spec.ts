import { test, expect } from '@playwright/test'

test.describe('Dashboard Baseline E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/overview')
    await page.waitForLoadState('networkidle')
  })

  test('loads without errors and displays main elements', async ({ page }) => {
    // Check header
    await expect(page.locator('text=Dashboard')).toBeVisible()

    // Check scorecards are visible (should be 8 total)
    const scorecards = page.locator('[class*="p-4"]').filter({ hasText: /Total Revenue|Support Tickets|Project Revenue|Hosting MRR|Avg.*Cost|Total Discounts/ })
    await expect(scorecards.first()).toBeVisible()

    // Check for no console errors (basic check)
    const errors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })

    // Reload to capture any console errors
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Filter out expected errors (if any)
    const unexpectedErrors = errors.filter(err =>
      !err.includes('Failed to load resource') && // Ignore network errors in test env
      !err.includes('favicon.ico') // Ignore favicon errors
    )

    expect(unexpectedErrors).toHaveLength(0)
  })

  test('displays revenue scorecards with numeric values', async ({ page }) => {
    // Total Revenue scorecard
    const totalRevenue = page.locator('text=Total Revenue').locator('..').locator('..')
    await expect(totalRevenue).toBeVisible()
    const totalRevenueValue = await totalRevenue.locator('[class*="font-bold"]').first().textContent()
    expect(totalRevenueValue).toMatch(/\$[\d,]+\.?\d*/)

    // Support Tickets scorecard
    const supportTickets = page.locator('text=Support Tickets').locator('..').locator('..')
    await expect(supportTickets).toBeVisible()

    // Project Revenue scorecard
    const projectRevenue = page.locator('text=Project Revenue').locator('..').locator('..')
    await expect(projectRevenue).toBeVisible()

    // Hosting MRR scorecard
    const hostingMRR = page.locator('text=Hosting MRR').locator('..').locator('..')
    await expect(hostingMRR).toBeVisible()
  })

  test('expands and collapses months', async ({ page }) => {
    // Find first month row in table
    const firstMonthRow = page.locator('tbody tr').first()
    await expect(firstMonthRow).toBeVisible()

    // Click to expand
    await firstMonthRow.click()

    // Check if Tickets section appears
    const ticketsSection = page.locator('text=Tickets').first()
    await expect(ticketsSection).toBeVisible({ timeout: 2000 })

    // Click again to collapse
    await firstMonthRow.click()

    // Tickets section should be hidden
    await expect(ticketsSection).toBeHidden({ timeout: 2000 })
  })

  test('expands section to show details', async ({ page }) => {
    // Expand first month
    const firstMonthRow = page.locator('tbody tr').first()
    await firstMonthRow.click()

    // Find and click Tickets section
    const ticketsSection = page.locator('text=Tickets').first()
    await expect(ticketsSection).toBeVisible()
    await ticketsSection.click()

    // Check for detailed ticket rows (should show individual tickets)
    // Look for "Gross Total" which appears when tickets are expanded
    const grossTotal = page.locator('text=Gross Total').first()
    await expect(grossTotal).toBeVisible({ timeout: 2000 })
  })

  test('exports CSV when button clicked', async ({ page }) => {
    // Find Export CSV button
    const exportButton = page.locator('button:has-text("Export CSV")')
    await expect(exportButton).toBeVisible()

    // Set up download handler
    const downloadPromise = page.waitForEvent('download')

    // Click export
    await exportButton.click()

    // Wait for download
    const download = await downloadPromise

    // Check filename
    const filename = download.suggestedFilename()
    expect(filename).toMatch(/\.csv$/)
    expect(filename).toContain('monthly-breakdown')
  })

  test('desktop layout shows table', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 })

    // Table should be visible
    const table = page.locator('table').first()
    await expect(table).toBeVisible()

    // Check for table headers
    await expect(page.locator('th:has-text("Month")')).toBeVisible()
    await expect(page.locator('th:has-text("Tickets")')).toBeVisible()
    await expect(page.locator('th:has-text("Projects")')).toBeVisible()
    await expect(page.locator('th:has-text("Hosting")')).toBeVisible()
    await expect(page.locator('th:has-text("Total Revenue")')).toBeVisible()
  })

  test('mobile layout shows cards instead of table', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 })

    // Desktop table should be hidden
    const desktopTable = page.locator('table').first()
    await expect(desktopTable).toBeHidden()

    // Mobile cards should be visible
    // Look for month cards with specific structure
    const mobileCards = page.locator('[class*="border"]').filter({ hasText: /June|July|August|May/ })
    await expect(mobileCards.first()).toBeVisible()
  })

  test('period selector filters data', async ({ page }) => {
    // Find month selector (if available)
    const monthSelector = page.locator('select, [role="combobox"]').filter({ hasText: /All Months|June|July/ }).first()

    if (await monthSelector.isVisible()) {
      // Click selector
      await monthSelector.click()

      // Select specific month (e.g., June)
      const juneOption = page.locator('text=June 2025').first()
      if (await juneOption.isVisible()) {
        await juneOption.click()

        // Wait for data to filter
        await page.waitForTimeout(500)

        // Verify only June data is shown
        // (This is a simple check - could be more specific based on UI structure)
        const tableRows = page.locator('tbody tr').filter({ hasText: /June/ })
        await expect(tableRows.first()).toBeVisible()
      }
    }
  })

  test('grand total row appears when multiple months displayed', async ({ page }) => {
    // Ensure "All Months" is selected (should be default)
    // Look for "GRAND TOTALS" row
    const grandTotalRow = page.locator('text=GRAND TOTALS')

    // Grand totals should be visible if there are multiple months
    const monthRows = await page.locator('tbody tr').filter({ hasText: /202[45]-/ }).count()

    if (monthRows > 1) {
      await expect(grandTotalRow).toBeVisible()
    }
  })
})
