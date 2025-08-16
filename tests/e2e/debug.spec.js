import { test } from '@playwright/test'

test('debug DOM structure', async ({ page }) => {
  await page.goto('/')
  
  // Screenshot machen für visuelle Inspektion
  await page.screenshot({ path: 'screenshot.png' })
  
  // IDs und Klassen ausgeben
  const bodyHTML = await page.evaluate(() => document.body.innerHTML)
  console.log('BODY HTML:', bodyHTML.substring(0, 1000)) // Ersten 1000 Zeichen
  
  // Alle Canvas-Elemente suchen
  const canvasElements = await page.locator('canvas').count()
  console.log('Canvas elements found:', canvasElements)
  
  // Alle relevanten CSS-Klassen prüfen
  const classes = ['.drawing-canvas', '.canvas-area', '.stage', '#stage', '#canvas']
  for (const selector of classes) {
    const count = await page.locator(selector).count()
    console.log(`${selector}: ${count} elements found`)
  }
})

test('debug about dialog', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  
  // Get the DOM before clicking
  const beforeHTML = await page.evaluate(() => document.body.innerHTML)
  console.log("Before click:", beforeHTML.includes('about-dialog'))
  
  // Click the button
  const aboutButton = page.locator('button', { hasText: 'About' })
  await aboutButton.click({ force: true })
  
  // Wait a bit and then check the DOM
  await page.waitForTimeout(1000)
  const afterHTML = await page.evaluate(() => document.body.innerHTML)
  console.log("After click:", afterHTML.includes('about-dialog'))
  
  // Log all dialog-like elements
  const dialogElements = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('div[class*="dialog"], div[class*="dialog"]'))
      .map(el => ({ class: el.className, text: el.textContent }))
  })
  console.log("Dialog elements:", dialogElements)
})