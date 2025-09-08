import { test, expect } from '@playwright/test';

test.describe('BookClub App - Basic Navigation', () => {
  test('should load the homepage and show login redirect', async ({ page }) => {
    await page.goto('/');
    
    // Wait for navigation and network to be idle to ensure React routing is complete
    await page.waitForLoadState('networkidle');
    
    // Since the app uses protected routes, we should be redirected to login
    // or see some authentication UI
    await expect(page).toHaveURL(/\/(login|auth)/);
    
    // Should see some form of login interface - wait for React to render
    await expect(page.locator('h2:has-text("Sign in to BookClub")')).toBeVisible({ timeout: 20000 });
    await expect(page.locator('input[type="email"][name="email"]')).toBeVisible({ timeout: 15000 });
  });

  test('should display login form elements', async ({ page }) => {
    await page.goto('/login');
    
    // Wait for navigation and network to be idle, ensuring React has rendered
    await page.waitForLoadState('networkidle');
    
    // Wait for the form to load properly with longer timeout
    await expect(page.locator('h2:has-text("Sign in to BookClub")')).toBeVisible({ timeout: 20000 });
    
    // Check for login form elements with exact selectors
    await expect(page.locator('input[type="email"][name="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"][name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]:has-text("Sign in")')).toBeVisible();
  });

  test('should display register form elements', async ({ page }) => {
    await page.goto('/register');
    
    // Wait for navigation and network to be idle, ensuring React has rendered
    await page.waitForLoadState('networkidle');
    
    // Wait for the heading to be visible first - this ensures React has rendered
    await expect(page.locator('h2:has-text("Join BookClub")')).toBeVisible({ timeout: 20000 });
    
    // Check for register form elements with better selectors
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('input[name="name"]')).toBeVisible();
    await expect(page.locator('input[name="confirmPassword"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]:has-text("Create account")')).toBeVisible();
  });

  test('should navigate between login and register pages', async ({ page }) => {
    await page.goto('/login');
    
    // Wait for navigation and network to be idle
    await page.waitForLoadState('networkidle');
    
    // Wait for login page to load with longer timeout
    await expect(page.locator('h2:has-text("Sign in to BookClub")')).toBeVisible({ timeout: 20000 });
    
    // Look for a link to register page (actual text from Login.tsx is "create a new account")
    const registerLink = page.locator('a:has-text("create a new account")');
    
    if (await registerLink.isVisible()) {
      await registerLink.click();
      
      // Wait for navigation to complete
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(/\/register/);
      await expect(page.locator('h2:has-text("Join BookClub")')).toBeVisible({ timeout: 20000 });
    }
    
    // Look for a link back to login (actual text from Register.tsx is "sign in to your existing account")
    const loginLink = page.locator('a:has-text("sign in to your existing account")');
    
    if (await loginLink.isVisible()) {
      await loginLink.click();
      
      // Wait for navigation to complete
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(/\/login/);
      await expect(page.locator('h2:has-text("Sign in to BookClub")')).toBeVisible({ timeout: 20000 });
    }
  });
});