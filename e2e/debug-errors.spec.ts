import { test, expect } from '@playwright/test';

test('debug: capture console errors', async ({ page }) => {
  // Capture console messages
  const consoleMessages: string[] = [];
  page.on('console', msg => {
    consoleMessages.push(`${msg.type()}: ${msg.text()}`);
  });
  
  // Capture page errors
  const pageErrors: string[] = [];
  page.on('pageerror', error => {
    pageErrors.push(error.message);
  });
  
  // Navigate to the page
  await page.goto('/');
  
  // Wait a bit for errors to appear
  await page.waitForTimeout(2000);
  
  // Print all console messages
  console.log('=== Console Messages ===');
  consoleMessages.forEach(msg => console.log(msg));
  
  // Print all page errors
  console.log('\n=== Page Errors ===');
  pageErrors.forEach(err => console.log(err));
  
  // Check what's in the DOM
  const html = await page.content();
  console.log('\n=== Page HTML (first 1000 chars) ===');
  console.log(html.substring(0, 1000));
  
  // Try to find the root element
  const rootExists = await page.locator('#root').count();
  console.log('\n=== Root element exists:', rootExists > 0);
  
  // Basic assertion
  await expect(page.locator('body')).toBeVisible();
});