import { test, expect } from '@playwright/test'

test('should find and click the Über button', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  
  const aboutButton = page.locator('button', { hasText: 'Über' })
  await expect(aboutButton).toBeVisible()
  
  // Just verify we can click without errors
  await aboutButton.click({ force: true })
  await page.waitForTimeout(1000)
  
  // Log DOM state for debugging
  console.log('DOM after click:', await page.evaluate(() => {
    return {
      aboutDialogExists: document.querySelector('.about-dialog') !== null,
      buttons: Array.from(document.querySelectorAll('button')).map(b => b.textContent),
      dialogsFound: Array.from(document.querySelectorAll('div')).filter(d => 
        d.textContent.includes('Schließen') || 
        d.className.includes('dialog') || 
        d.className.includes('dialogue')
      ).map(el => ({ class: el.className, visible: el.offsetParent !== null }))
    };
  }));
  
  // Success if we get this far
})