import { test, expect } from '@playwright/test';

test('debug: check page loads', async ({ page }) => {
  // Navigate to the page
  await page.goto('/');
  
  // Wait for any content to load
  await page.waitForLoadState('networkidle');
  
  // Take a screenshot
  await page.screenshot({ path: 'debug-screenshot.png' });
  
  // Get the page title
  const title = await page.title();
  console.log('Page title:', title);
  
  // Get all text content
  const content = await page.textContent('body');
  console.log('Page content:', content?.substring(0, 500));
  
  // Check if there's any error
  const errors = await page.evaluate(() => {
    return window.console.error ? 'Has errors' : 'No errors';
  });
  console.log('Console errors:', errors);
  
  // Basic assertion that page has some content
  await expect(page.locator('body')).toBeVisible();
});