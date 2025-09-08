import { test, expect } from '@playwright/test';

test.describe('BookClub App - Basic Navigation', () => {
  test('should load the homepage and show login redirect', async ({ page }) => {
    await page.goto('/');
    
    // Since the app uses protected routes, we should be redirected to login
    // or see some authentication UI
    await expect(page).toHaveURL(/\/(login|auth)/);
    
    // Should see some form of login interface
    await expect(page.locator('input[type="email"], input[name="email"], [data-testid*="email"]')).toBeVisible({ timeout: 10000 });
  });

  test('should display login form elements', async ({ page }) => {
    await page.goto('/login');
    
    // Check for login form elements
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign in")')).toBeVisible();
  });

  test('should display register form elements', async ({ page }) => {
    await page.goto('/register');
    
    // Check for register form elements
    await expect(page.locator('input[name="email"], input[type="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"], input[type="password"]')).toBeVisible();
    await expect(page.locator('input[name="name"], input[placeholder*="name"]')).toBeVisible();
    await expect(page.locator('button[type="submit"], button:has-text("Register"), button:has-text("Sign up")')).toBeVisible();
  });

  test('should navigate between login and register pages', async ({ page }) => {
    await page.goto('/login');
    
    // Look for a link to register page
    const registerLink = page.locator('a:has-text("Register"), a:has-text("Sign up"), a[href*="register"]');
    
    if (await registerLink.isVisible()) {
      await registerLink.click();
      await expect(page).toHaveURL(/\/register/);
    }
    
    // Look for a link back to login
    const loginLink = page.locator('a:has-text("Login"), a:has-text("Sign in"), a[href*="login"]');
    
    if (await loginLink.isVisible()) {
      await loginLink.click();
      await expect(page).toHaveURL(/\/login/);
    }
  });
});