import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
  });

  test('should display login page when not authenticated', async ({ page }) => {
    // Check if login form is present
    await expect(page.locator('form')).toBeVisible();
    await expect(page.getByRole('textbox', { name: /username/i })).toBeVisible();
    await expect(page.getByRole('textbox', { name: /password/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /login/i })).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    // Fill in invalid credentials
    await page.getByRole('textbox', { name: /username/i }).fill('invaliduser');
    await page.getByRole('textbox', { name: /password/i }).fill('wrongpassword');
    
    // Click login button
    await page.getByRole('button', { name: /login/i }).click();
    
    // Check for error message
    await expect(page.getByText(/invalid username or password/i)).toBeVisible();
  });

  test('should successfully login with valid credentials', async ({ page }) => {
    // Fill in valid credentials (you may need to create a test user first)
    await page.getByRole('textbox', { name: /username/i }).fill('testuser');
    await page.getByRole('textbox', { name: /password/i }).fill('testpassword');
    
    // Click login button
    await page.getByRole('button', { name: /login/i }).click();
    
    // Check for successful redirect to dashboard
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.getByText(/welcome/i)).toBeVisible();
  });

  test('should redirect to login when accessing protected route', async ({ page }) => {
    // Try to navigate directly to a protected route
    await page.goto('/dashboard');
    
    // Should be redirected to login
    await expect(page).toHaveURL(/.*login/);
    await expect(page.getByRole('textbox', { name: /username/i })).toBeVisible();
  });

  test('should successfully register new user', async ({ page }) => {
    // Navigate to register page
    await page.getByRole('link', { name: /register/i }).click();
    
    // Fill registration form
    await page.getByRole('textbox', { name: /username/i }).fill('newuser');
    await page.getByRole('textbox', { name: /password/i }).fill('newpassword');
    
    // Submit registration
    await page.getByRole('button', { name: /register/i }).click();
    
    // Should be redirected to dashboard after successful registration
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('should successfully logout', async ({ page }) => {
    // First login
    await page.getByRole('textbox', { name: /username/i }).fill('testuser');
    await page.getByRole('textbox', { name: /password/i }).fill('testpassword');
    await page.getByRole('button', { name: /login/i }).click();
    
    // Wait for dashboard to load
    await expect(page).toHaveURL(/.*dashboard/);
    
    // Click logout button
    await page.getByRole('button', { name: /logout/i }).click();
    
    // Should be redirected to login page
    await expect(page).toHaveURL(/.*login/);
    await expect(page.getByRole('textbox', { name: /username/i })).toBeVisible();
  });

  test('should maintain session across page refreshes', async ({ page }) => {
    // Login
    await page.getByRole('textbox', { name: /username/i }).fill('testuser');
    await page.getByRole('textbox', { name: /password/i }).fill('testpassword');
    await page.getByRole('button', { name: /login/i }).click();
    
    await expect(page).toHaveURL(/.*dashboard/);
    
    // Refresh the page
    await page.reload();
    
    // Should still be logged in
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.getByText(/welcome/i)).toBeVisible();
  });
});