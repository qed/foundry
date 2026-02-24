import { test, expect, devices } from '@playwright/test'

test.describe('Responsive Design', () => {
  test('login page renders on mobile viewport', async ({ browser }) => {
    const context = await browser.newContext({
      ...devices['iPhone 13'],
    })
    const page = await context.newPage()
    await page.goto('/login')
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible()
    await context.close()
  })

  test('login page renders on tablet viewport', async ({ browser }) => {
    const context = await browser.newContext({
      ...devices['iPad (gen 7)'],
    })
    const page = await context.newPage()
    await page.goto('/login')
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible()
    await context.close()
  })

  test('signup page renders on mobile viewport', async ({ browser }) => {
    const context = await browser.newContext({
      ...devices['Pixel 5'],
    })
    const page = await context.newPage()
    await page.goto('/signup')
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible()
    await context.close()
  })
})
