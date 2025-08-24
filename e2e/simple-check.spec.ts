import { test, expect } from '@playwright/test';

test('simple: check if Dashboard heading exists', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(2000); // Wait for React to render
  
  // Get all h1 elements
  const headings = await page.$$eval('h1', elements => 
    elements.map(el => el.textContent)
  );
  console.log('H1 headings found:', headings);
  
  // Check if body has content
  const bodyText = await page.textContent('body');
  console.log('Body has text:', bodyText ? bodyText.length + ' chars' : 'empty');
  
  // Check for any Chakra UI container
  const container = await page.$('.chakra-container');
  console.log('Chakra container exists:', !!container);
  
  // Take screenshot for debugging
  await page.screenshot({ path: 'simple-check.png' });
  
  // Simple check that page loads
  await expect(page).toHaveTitle(/CygnusWealth/);
});