import { test, expect } from '@playwright/test';

test.describe('Task Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/');
    await page.getByRole('textbox', { name: /username/i }).fill('testuser');
    await page.getByRole('textbox', { name: /password/i }).fill('testpassword');
    await page.getByRole('button', { name: /login/i }).click();
    
    // Navigate to tasks page
    await page.goto('/tasks');
  });

  test('should display tasks page', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /tasks/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /add task/i })).toBeVisible();
  });

  test('should create a new task', async ({ page }) => {
    // Click add task button
    await page.getByRole('button', { name: /add task/i }).click();
    
    // Fill task form
    await page.getByRole('textbox', { name: /title/i }).fill('Test Task');
    await page.getByRole('textbox', { name: /description/i }).fill('This is a test task');
    
    // Submit form
    await page.getByRole('button', { name: /save/i }).click();
    
    // Verify task appears in list
    await expect(page.getByText('Test Task')).toBeVisible();
    await expect(page.getByText('This is a test task')).toBeVisible();
  });

  test('should edit an existing task', async ({ page }) => {
    // First create a task
    await page.getByRole('button', { name: /add task/i }).click();
    await page.getByRole('textbox', { name: /title/i }).fill('Original Task');
    await page.getByRole('textbox', { name: /description/i }).fill('Original description');
    await page.getByRole('button', { name: /save/i }).click();
    
    // Wait for task to appear
    await expect(page.getByText('Original Task')).toBeVisible();
    
    // Click edit button for the task
    await page.getByRole('button', { name: /edit/i }).first().click();
    
    // Update task
    await page.getByRole('textbox', { name: /title/i }).fill('Updated Task');
    await page.getByRole('textbox', { name: /description/i }).fill('Updated description');
    await page.getByRole('button', { name: /save/i }).click();
    
    // Verify task is updated
    await expect(page.getByText('Updated Task')).toBeVisible();
    await expect(page.getByText('Updated description')).toBeVisible();
    await expect(page.getByText('Original Task')).not.toBeVisible();
  });

  test('should delete a task', async ({ page }) => {
    // First create a task
    await page.getByRole('button', { name: /add task/i }).click();
    await page.getByRole('textbox', { name: /title/i }).fill('Task to Delete');
    await page.getByRole('textbox', { name: /description/i }).fill('This task will be deleted');
    await page.getByRole('button', { name: /save/i }).click();
    
    // Wait for task to appear
    await expect(page.getByText('Task to Delete')).toBeVisible();
    
    // Click delete button
    await page.getByRole('button', { name: /delete/i }).first().click();
    
    // Confirm deletion if there's a confirmation dialog
    if (await page.getByRole('button', { name: /confirm/i }).isVisible()) {
      await page.getByRole('button', { name: /confirm/i }).click();
    }
    
    // Verify task is removed
    await expect(page.getByText('Task to Delete')).not.toBeVisible();
  });

  test('should update task status', async ({ page }) => {
    // First create a task
    await page.getByRole('button', { name: /add task/i }).click();
    await page.getByRole('textbox', { name: /title/i }).fill('Status Test Task');
    await page.getByRole('button', { name: /save/i }).click();
    
    // Wait for task to appear
    await expect(page.getByText('Status Test Task')).toBeVisible();
    
    // Change status to in-progress
    await page.getByRole('combobox', { name: /status/i }).first().selectOption('in-progress');
    
    // Verify status change
    await expect(page.getByText(/in progress/i)).toBeVisible();
    
    // Change status to completed
    await page.getByRole('combobox', { name: /status/i }).first().selectOption('completed');
    
    // Verify status change
    await expect(page.getByText(/completed/i)).toBeVisible();
  });

  test('should filter tasks by status', async ({ page }) => {
    // Create tasks with different statuses
    const tasks = [
      { title: 'Todo Task', status: 'todo' },
      { title: 'In Progress Task', status: 'in-progress' },
      { title: 'Completed Task', status: 'completed' }
    ];
    
    for (const task of tasks) {
      await page.getByRole('button', { name: /add task/i }).click();
      await page.getByRole('textbox', { name: /title/i }).fill(task.title);
      await page.getByRole('combobox', { name: /status/i }).selectOption(task.status);
      await page.getByRole('button', { name: /save/i }).click();
      await expect(page.getByText(task.title)).toBeVisible();
    }
    
    // Filter by todo status
    await page.getByRole('combobox', { name: /filter/i }).selectOption('todo');
    await expect(page.getByText('Todo Task')).toBeVisible();
    await expect(page.getByText('In Progress Task')).not.toBeVisible();
    await expect(page.getByText('Completed Task')).not.toBeVisible();
    
    // Filter by completed status
    await page.getByRole('combobox', { name: /filter/i }).selectOption('completed');
    await expect(page.getByText('Todo Task')).not.toBeVisible();
    await expect(page.getByText('In Progress Task')).not.toBeVisible();
    await expect(page.getByText('Completed Task')).toBeVisible();
    
    // Clear filter
    await page.getByRole('combobox', { name: /filter/i }).selectOption('all');
    await expect(page.getByText('Todo Task')).toBeVisible();
    await expect(page.getByText('In Progress Task')).toBeVisible();
    await expect(page.getByText('Completed Task')).toBeVisible();
  });

  test('should search tasks', async ({ page }) => {
    // Create tasks for searching
    const tasks = [
      'Frontend Development Task',
      'Backend API Implementation',
      'Database Migration',
      'UI Design Updates'
    ];
    
    for (const taskTitle of tasks) {
      await page.getByRole('button', { name: /add task/i }).click();
      await page.getByRole('textbox', { name: /title/i }).fill(taskTitle);
      await page.getByRole('button', { name: /save/i }).click();
      await expect(page.getByText(taskTitle)).toBeVisible();
    }
    
    // Search for 'frontend'
    await page.getByRole('textbox', { name: /search/i }).fill('Frontend');
    await expect(page.getByText('Frontend Development Task')).toBeVisible();
    await expect(page.getByText('Backend API Implementation')).not.toBeVisible();
    
    // Search for 'api'
    await page.getByRole('textbox', { name: /search/i }).fill('API');
    await expect(page.getByText('Frontend Development Task')).not.toBeVisible();
    await expect(page.getByText('Backend API Implementation')).toBeVisible();
    
    // Clear search
    await page.getByRole('textbox', { name: /search/i }).fill('');
    await expect(page.getByText('Frontend Development Task')).toBeVisible();
    await expect(page.getByText('Backend API Implementation')).toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    // Try to create task without title
    await page.getByRole('button', { name: /add task/i }).click();
    await page.getByRole('button', { name: /save/i }).click();
    
    // Should show validation error
    await expect(page.getByText(/title is required/i)).toBeVisible();
    
    // Should not close the dialog
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('should handle long task titles and descriptions gracefully', async ({ page }) => {
    const longTitle = 'A'.repeat(200);
    const longDescription = 'B'.repeat(1000);
    
    await page.getByRole('button', { name: /add task/i }).click();
    await page.getByRole('textbox', { name: /title/i }).fill(longTitle);
    await page.getByRole('textbox', { name: /description/i }).fill(longDescription);
    await page.getByRole('button', { name: /save/i }).click();
    
    // Task should be created and displayed properly (possibly truncated)
    await expect(page.getByText(longTitle.substring(0, 50))).toBeVisible();
  });
});