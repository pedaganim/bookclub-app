import { test, expect } from '@playwright/test';

test.describe('BookClub App - Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock the backend API responses for testing
    await page.route('**/auth/register', async route => {
      if (route.request().method() === 'POST') {
        const requestData = route.request().postDataJSON();
        
        if (requestData.email === 'existing@example.com') {
          await route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({
              success: false,
              error: {
                errors: {
                  email: 'A user with this email already exists'
                }
              }
            })
          });
        } else {
          await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: {
                userId: 'user-123',
                email: requestData.email,
                name: requestData.name
              }
            })
          });
        }
      }
    });

    await page.route('**/auth/login', async route => {
      if (route.request().method() === 'POST') {
        const requestData = route.request().postDataJSON();
        
        if (requestData.email === 'test@example.com' && requestData.password === 'password123') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: {
                user: {
                  userId: 'user-123',
                  email: requestData.email,
                  name: 'Test User'
                },
                tokens: {
                  accessToken: 'mock-access-token',
                  refreshToken: 'mock-refresh-token',
                  idToken: 'mock-id-token'
                }
              }
            })
          });
        } else {
          await route.fulfill({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify({
              success: false,
              error: {
                message: 'Invalid credentials'
              }
            })
          });
        }
      }
    });
  });

  test('should handle user registration flow', async ({ page }) => {
    await page.goto('/register');
    
    // Fill out registration form
    await page.fill('input[name="email"], input[type="email"]', 'newuser@example.com');
    await page.fill('input[name="name"], input[placeholder*="name"]', 'New User');
    await page.fill('input[name="password"], input[type="password"]', 'password123');
    
    // Submit the form
    await page.click('button[type="submit"], button:has-text("Register"), button:has-text("Sign up")');
    
    // Wait for response and check for success (this might redirect or show success message)
    // The behavior after successful registration depends on the app implementation
    await page.waitForLoadState('networkidle');
    
    // Could be redirect to login, redirect to dashboard, or success message
    // Just ensure we're not on the same form anymore or there's no error
    const hasError = await page.locator(':has-text("error"), :has-text("failed"), .error').isVisible();
    expect(hasError).toBeFalsy();
  });

  test('should handle existing email registration error', async ({ page }) => {
    await page.goto('/register');
    
    // Fill out registration form with existing email
    await page.fill('input[name="email"], input[type="email"]', 'existing@example.com');
    await page.fill('input[name="name"], input[placeholder*="name"]', 'Test User');
    await page.fill('input[name="password"], input[type="password"]', 'password123');
    
    // Submit the form
    await page.click('button[type="submit"], button:has-text("Register"), button:has-text("Sign up")');
    
    // Wait for error message to appear
    await expect(page.locator(':has-text("email already exists"), :has-text("user already exists")')).toBeVisible({ timeout: 5000 });
  });

  test('should handle successful login flow', async ({ page }) => {
    await page.goto('/login');
    
    // Fill out login form
    await page.fill('input[name="email"], input[type="email"]', 'test@example.com');
    await page.fill('input[name="password"], input[type="password"]', 'password123');
    
    // Submit the form
    await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Sign in")');
    
    // Wait for response and potential redirect to dashboard
    await page.waitForLoadState('networkidle');
    
    // After successful login, should redirect to main app or dashboard
    // The exact behavior depends on the app implementation
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('should handle invalid login credentials', async ({ page }) => {
    await page.goto('/login');
    
    // Fill out login form with invalid credentials
    await page.fill('input[name="email"], input[type="email"]', 'wrong@example.com');
    await page.fill('input[name="password"], input[type="password"]', 'wrongpassword');
    
    // Submit the form
    await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Sign in")');
    
    // Wait for error message to appear
    await expect(page.locator(':has-text("Invalid credentials"), :has-text("incorrect"), :has-text("wrong")')).toBeVisible({ timeout: 5000 });
  });

  test('should validate required fields in registration', async ({ page }) => {
    await page.goto('/register');
    
    // Try to submit empty form
    await page.click('button[type="submit"], button:has-text("Register"), button:has-text("Sign up")');
    
    // Should see validation messages (HTML5 validation or custom validation)
    // This depends on the form implementation
    const emailInput = page.locator('input[name="email"], input[type="email"]');
    const nameInput = page.locator('input[name="name"], input[placeholder*="name"]');
    const passwordInput = page.locator('input[name="password"], input[type="password"]');
    
    // Check for HTML5 validation or custom validation messages
    await expect(emailInput).toHaveAttribute('required');
    await expect(nameInput).toHaveAttribute('required');
    await expect(passwordInput).toHaveAttribute('required');
  });

  test('should validate email format in registration', async ({ page }) => {
    await page.goto('/register');
    
    // Fill form with invalid email
    await page.fill('input[name="email"], input[type="email"]', 'invalid-email');
    await page.fill('input[name="name"], input[placeholder*="name"]', 'Test User');
    await page.fill('input[name="password"], input[type="password"]', 'password123');
    
    // Submit the form
    await page.click('button[type="submit"], button:has-text("Register"), button:has-text("Sign up")');
    
    // Should see email validation error (either HTML5 or custom)
    const emailInput = page.locator('input[name="email"], input[type="email"]');
    await expect(emailInput).toHaveAttribute('type', 'email'); // HTML5 email validation
  });
});