import { test, expect } from '@playwright/test';

test.describe('Dashboard Navigation and Components', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/');
    await page.getByRole('textbox', { name: /username/i }).fill('testuser');
    await page.getByRole('textbox', { name: /password/i }).fill('testpassword');
    await page.getByRole('button', { name: /login/i }).click();
    
    // Should be on dashboard
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('should display dashboard with main navigation', async ({ page }) => {
    // Check if main navigation items are present
    await expect(page.getByRole('navigation')).toBeVisible();
    await expect(page.getByRole('link', { name: /dashboard/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /tasks/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /business/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /analytics/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /team/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /offerings/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /chat/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /research/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /settings/i })).toBeVisible();
  });

  test('should navigate between different pages', async ({ page }) => {
    // Navigate to tasks
    await page.getByRole('link', { name: /tasks/i }).click();
    await expect(page).toHaveURL(/.*tasks/);
    await expect(page.getByRole('heading', { name: /tasks/i })).toBeVisible();
    
    // Navigate to business
    await page.getByRole('link', { name: /business/i }).click();
    await expect(page).toHaveURL(/.*business/);
    await expect(page.getByRole('heading', { name: /business/i })).toBeVisible();
    
    // Navigate to analytics
    await page.getByRole('link', { name: /analytics/i }).click();
    await expect(page).toHaveURL(/.*analytics/);
    await expect(page.getByRole('heading', { name: /analytics/i })).toBeVisible();
    
    // Navigate back to dashboard
    await page.getByRole('link', { name: /dashboard/i }).click();
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('should display dashboard widgets and cards', async ({ page }) => {
    // Check for common dashboard elements
    await expect(page.getByText(/welcome/i)).toBeVisible();
    
    // Look for dashboard cards/widgets (adjust selectors based on actual implementation)
    const dashboardCards = page.locator('[data-testid*="card"], .card, [class*="card"]');
    await expect(dashboardCards.first()).toBeVisible();
  });

  test('should handle responsive navigation on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check if mobile menu toggle is present
    const mobileMenuToggle = page.getByRole('button', { name: /menu/i });
    if (await mobileMenuToggle.isVisible()) {
      await mobileMenuToggle.click();
      
      // Navigation should be visible after clicking toggle
      await expect(page.getByRole('navigation')).toBeVisible();
    }
  });

  test('should display user information in header', async ({ page }) => {
    // Check if user info is displayed (username, avatar, etc.)
    await expect(page.getByText(/testuser/i)).toBeVisible();
    
    // Check if logout option is available
    const userMenu = page.getByRole('button', { name: /user menu/i });
    if (await userMenu.isVisible()) {
      await userMenu.click();
      await expect(page.getByRole('menuitem', { name: /logout/i })).toBeVisible();
    }
  });

  test('should handle error states gracefully', async ({ page }) => {
    // Simulate network error by intercepting requests
    await page.route('**/api/**', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' })
      });
    });
    
    // Reload page to trigger API calls
    await page.reload();
    
    // Should show error state or fallback content
    // This depends on your error handling implementation
    await expect(page.getByText(/error/i).or(page.getByText(/something went wrong/i))).toBeVisible();
  });

  test('should maintain active navigation state', async ({ page }) => {
    // Navigate to tasks page
    await page.getByRole('link', { name: /tasks/i }).click();
    
    // Tasks navigation item should be active
    const tasksLink = page.getByRole('link', { name: /tasks/i });
    await expect(tasksLink).toHaveClass(/active|current/);
    
    // Navigate to business page
    await page.getByRole('link', { name: /business/i }).click();
    
    // Business navigation item should be active, tasks should not be
    const businessLink = page.getByRole('link', { name: /business/i });
    await expect(businessLink).toHaveClass(/active|current/);
    await expect(tasksLink).not.toHaveClass(/active|current/);
  });

  test('should display loading states', async ({ page }) => {
    // Intercept API requests to add delay
    await page.route('**/api/**', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      route.continue();
    });
    
    // Navigate to a data-heavy page
    await page.getByRole('link', { name: /analytics/i }).click();
    
    // Should show loading state
    await expect(page.getByText(/loading/i).or(page.locator('.spinner, .loading'))).toBeVisible();
    
    // Wait for content to load
    await expect(page.getByRole('heading', { name: /analytics/i })).toBeVisible();
  });

  test('should handle deep linking correctly', async ({ page }) => {
    // Navigate directly to a specific page URL
    await page.goto('/tasks');
    
    // Should still be authenticated and show the correct page
    await expect(page.getByRole('heading', { name: /tasks/i })).toBeVisible();
    
    // Navigate to another deep link
    await page.goto('/business');
    await expect(page.getByRole('heading', { name: /business/i })).toBeVisible();
  });

  test('should update page title correctly', async ({ page }) => {
    // Check default dashboard title
    await expect(page).toHaveTitle(/dashboard/i);
    
    // Navigate to tasks and check title
    await page.getByRole('link', { name: /tasks/i }).click();
    await expect(page).toHaveTitle(/tasks/i);
    
    // Navigate to business and check title
    await page.getByRole('link', { name: /business/i }).click();
    await expect(page).toHaveTitle(/business/i);
  });
});