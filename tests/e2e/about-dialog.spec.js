import { test, expect } from '@playwright/test'

test('debug about dialog', async ({ page }) => {
  // Set larger viewport for stable tests
  await page.setViewportSize({ width: 1280, height: 800 })
  
  // Navigate to app with longer timeouts
  await page.goto('/', { timeout: 60000, waitUntil: 'networkidle' })
  
  // Log HTML content for debugging
  const bodyHTML = await page.evaluate(() => document.body.innerHTML)
  console.log('Body HTML (first 300 chars):', bodyHTML.substring(0, 300))
  
  // Screenshot before action
  await page.screenshot({ path: 'debug-before.png', fullPage: true })
  
  // Try to find the button with flexible localization
  console.log('Looking for different selectors for About button')
  
  // Update selectors to look for "About"
  const selectors = [
    'button:has-text("About")',
    'text="About"',
    '[data-test="about-button"]', // Keep this for a potential future data-test-id
    'button[title*="About"]',
  ]
  
  for (const selector of selectors) {
    const element = page.locator(selector)
    const count = await element.count()
    console.log(`${selector}: ${count} elements found`)
    
    if (count > 0) {
      await expect(element.first()).toBeVisible()
      break
    }
  }
})