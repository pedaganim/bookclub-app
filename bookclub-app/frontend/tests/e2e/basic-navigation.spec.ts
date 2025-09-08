import { test, expect } from '@playwright/test';

test.describe('BookClub App - Basic Navigation', () => {
  test('should load the homepage and redirect to login', async ({ page }) => {
    await page.goto('/');
    
    // Wait for navigation to complete
    await page.waitForLoadState('networkidle');
    
    // Since the app uses protected routes, we should be redirected to login
    await expect(page).toHaveURL(/\/(login|auth)/);
    
    // Check that basic login form elements are present without relying on specific text
    await expect(page.locator('input[type="email"][name="email"]')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('input[type="password"][name="password"]')).toBeVisible({ timeout: 15000 });
  });
});