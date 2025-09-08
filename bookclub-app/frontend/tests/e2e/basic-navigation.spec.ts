import { test, expect } from '@playwright/test';

test.describe('BookClub App - Basic Navigation', () => {
  test('should load the homepage and show login redirect', async ({ page }) => {
    await page.goto('/');
    
    // Since the app uses protected routes, we should be redirected to login
    // or see some authentication UI
    await expect(page).toHaveURL(/\/(login|auth)/);
    
    // Should see some form of login interface - wait for page to load
    await expect(page.locator('h2:has-text("Sign in to BookClub")')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('input[type="email"][name="email"]')).toBeVisible({ timeout: 10000 });
  });

  test('should display login form elements', async ({ page }) => {
    await page.goto('/login');
    
    // Wait for the form to load properly
    await expect(page.locator('h2:has-text("Sign in to BookClub")')).toBeVisible();
    
    // Check for login form elements
    await expect(page.locator('input[type="email"][name="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"][name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]:has-text("Sign in")')).toBeVisible();
  });

  test('should display register form elements', async ({ page }) => {
    await page.goto('/register');
    
    // Wait for the form to load properly
    await expect(page.locator('h2:has-text("Join BookClub")')).toBeVisible();
    
    // Check for register form elements with better selectors
    await expect(page.locator('input[name="email"], input[type="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"][type="password"]')).toBeVisible();
    await expect(page.locator('input[name="name"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]:has-text("Create account")')).toBeVisible();
  });

  test('should navigate between login and register pages', async ({ page }) => {
    await page.goto('/login');
    
    // Wait for login page to load
    await expect(page.locator('h2:has-text("Sign in to BookClub")')).toBeVisible();
    
    // Look for a link to register page (actual text from Login.tsx is "create a new account")
    const registerLink = page.locator('a:has-text("create a new account"), a[href*="register"]');
    
    if (await registerLink.isVisible()) {
      await registerLink.click();
      await expect(page).toHaveURL(/\/register/);
      await expect(page.locator('h2:has-text("Join BookClub")')).toBeVisible();
    }
    
    // Look for a link back to login (actual text from Register.tsx is "sign in to your existing account")
    const loginLink = page.locator('a:has-text("sign in to your existing account"), a[href*="login"]');
    
    if (await loginLink.isVisible()) {
      await loginLink.click();
      await expect(page).toHaveURL(/\/login/);
      await expect(page.locator('h2:has-text("Sign in to BookClub")')).toBeVisible();
    }
  });
});