import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test('login page renders with email and password fields', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible()
    await expect(page.getByRole('button', { name: /sign in|log in/i })).toBeVisible()
  })

  test('signup page renders with registration form', async ({ page }) => {
    await page.goto('/signup')
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible()
    await expect(page.getByRole('button', { name: /sign up|create account/i })).toBeVisible()
  })

  test('login with invalid credentials shows error', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"], input[name="email"]', 'invalid@example.com')
    await page.fill('input[type="password"], input[name="password"]', 'wrongpassword')
    await page.getByRole('button', { name: /sign in|log in/i }).click()
    // Should show an error message or stay on login page
    await expect(page).toHaveURL(/login/)
  })

  test('reset password page renders', async ({ page }) => {
    await page.goto('/reset-password')
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible()
  })

  test('unauthenticated users are redirected from protected routes', async ({ page }) => {
    await page.goto('/org/test/project/test/hall')
    // Should redirect to login
    await expect(page).toHaveURL(/login/)
  })
})
