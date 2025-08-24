import { test, expect } from '@playwright/test';

test('minimal test', async ({ page }) => {
  // Just navigate and check title - nothing else
  await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 5000 });
  await expect(page).toHaveTitle(/CygnusWealth/, { timeout: 5000 });
});