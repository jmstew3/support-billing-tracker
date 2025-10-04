import { test, expect } from '@playwright/test'

test.describe('Dashboard Visual Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Disable animations for consistent screenshots
    await page.emulateMedia({ reducedMotion: 'reduce' })
  })

  test('desktop all months view matches baseline', async ({ page }) => {
    await page.goto('/overview')
    await page.waitForLoadState('networkidle')

    // Wait for scorecards to load
    await page.waitForSelector('text=Total Revenue')

    // Take screenshot
    await expect(page).toHaveScreenshot('dashboard-desktop-all.png', {
      maxDiffPixels: 100,
      fullPage: true
    })
  })

  test('desktop expanded month matches baseline', async ({ page }) => {
    await page.goto('/overview')
    await page.waitForLoadState('networkidle')

    // Expand first month
    const firstMonthRow = page.locator('tbody tr').first()
    await firstMonthRow.click()

    // Expand Tickets section
    const ticketsSection = page.locator('text=Tickets').first()
    await ticketsSection.click()

    // Wait for expansion animation
    await page.waitForTimeout(300)

    // Take screenshot
    await expect(page).toHaveScreenshot('dashboard-desktop-expanded.png', {
      maxDiffPixels: 100,
      fullPage: true
    })
  })

  test('mobile view matches baseline', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/overview')
    await page.waitForLoadState('networkidle')

    // Wait for mobile cards to load
    await page.waitForSelector('[class*="border"]')

    // Take screenshot
    await expect(page).toHaveScreenshot('dashboard-mobile-all.png', {
      maxDiffPixels: 100,
      fullPage: true
    })
  })

  test('dark mode matches baseline', async ({ page, browserName }) => {
    // Only run on Chromium
    test.skip(browserName !== 'chromium', 'Dark mode test only runs on Chromium')

    await page.emulateMedia({ colorScheme: 'dark' })
    await page.goto('/overview')
    await page.waitForLoadState('networkidle')

    // Wait for theme to apply
    await page.waitForTimeout(300)

    // Take screenshot
    await expect(page).toHaveScreenshot('dashboard-dark-mode.png', {
      maxDiffPixels: 100,
      fullPage: true
    })
  })
})
