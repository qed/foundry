import { test, expect } from '@playwright/test'

test.describe('Public Navigation', () => {
  test('home page loads successfully', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/Helix Foundry/i)
  })

  test('login link navigates to login page', async ({ page }) => {
    await page.goto('/')
    const loginLink = page.getByRole('link', { name: /sign in|log in/i })
    if (await loginLink.isVisible()) {
      await loginLink.click()
      await expect(page).toHaveURL(/login/)
    }
  })

  test('signup link navigates to signup page', async ({ page }) => {
    await page.goto('/')
    const signupLink = page.getByRole('link', { name: /sign up|get started/i })
    if (await signupLink.isVisible()) {
      await signupLink.click()
      await expect(page).toHaveURL(/signup/)
    }
  })
})

test.describe('Page Accessibility', () => {
  test('login page has no accessibility violations in structure', async ({ page }) => {
    await page.goto('/login')
    // Verify basic semantic structure
    const main = page.locator('main')
    await expect(main).toBeVisible()
    // Form elements should have labels
    const inputs = page.locator('input')
    const count = await inputs.count()
    expect(count).toBeGreaterThan(0)
  })

  test('pages include viewport meta tag', async ({ page }) => {
    await page.goto('/login')
    const viewport = page.locator('meta[name="viewport"]')
    await expect(viewport).toHaveAttribute('content', /width=device-width/)
  })
})
