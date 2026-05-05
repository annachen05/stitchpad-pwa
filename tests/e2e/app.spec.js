import { test, expect } from '@playwright/test'

test('has correct title', async ({ page }) => {
  await page.goto('/')
  const title = await page.title()
  expect(title).toBe('Stitchpad PWA')
})

test('should load main app container', async ({ page }) => {
  await page.goto('/')
  
  const app = page.locator('#app').first()
  await expect(app).toBeVisible()
})

test('should show drawing canvas component', async ({ page }) => {
  await page.goto('/')
  
  const drawingContainer = page.locator('.drawing-canvas')
  await expect(drawingContainer).toBeVisible()
  
  const svg = page.locator('.drawing-canvas svg')
  await expect(svg).toBeVisible()
})

test('should show side toolbar', async ({ page }) => {
  await page.goto('/')
  
  const sideToolbar = page.locator('.side-toolbar')
  await expect(sideToolbar).toBeVisible()
  
  // Check if side toolbar has expected buttons
  const buttons = await page.locator('.side-toolbar button').all()
  expect(buttons.length).toBeGreaterThan(0)
})

test('should show main toolbar buttons', async ({ page }) => {
  await page.goto('/')

  await expect(page.locator('button', { hasText: 'Undo' })).toBeVisible()
  await expect(page.locator('button', { hasText: 'Grid' })).toBeVisible()
  await expect(page.locator('button', { hasText: 'Import' })).toBeVisible()
  await expect(page.locator('button', { hasText: 'About' })).toBeVisible()
})

test('should show machine control buttons', async ({ page }) => {
  await page.goto('/')
  
  // Test that machine control buttons are visible
  await expect(page.locator('button', { hasText: 'Connect Machine' })).toBeVisible()
  await expect(page.locator('button', { hasText: 'Send to Machine' })).toBeVisible()
})

test('should show export functionality', async ({ page }) => {
  await page.goto('/')

  // Single export entry point lives in the left toolbar
  const exportButton = page.locator('.side-toolbar button', { hasText: 'Export' }).first()
  await expect(exportButton).toBeVisible()

  // Clicking Export should open the in-app export dialog in automated tests
  // (native OS file picker is disabled under Playwright to prevent hangs)
  await exportButton.click()
  await expect(page.locator('.save-dialog')).toBeVisible()

  // Ensure unreliable formats are not exposed
  await expect(page.getByText('DST', { exact: true })).toHaveCount(0)
  await expect(page.getByText('EXP', { exact: true })).toHaveCount(0)
})

test('should toggle side toolbar', async ({ page }) => {
  await page.goto('/')
  
  const toggleButton = page.locator('.toolbar-toggle')
  await expect(toggleButton).toBeVisible()
  
  const sideToolbar = page.locator('.side-toolbar')
  
  // Initially should be open
  await expect(sideToolbar).not.toHaveClass(/closed/)
  
  // Click to close
  await toggleButton.click()
  await expect(sideToolbar).toHaveClass(/closed/)
  
  // Click to open again
  await toggleButton.click()
  await expect(sideToolbar).not.toHaveClass(/closed/)
})

test('machine buttons should be clickable', async ({ page }) => {
  await page.goto('/')
  
  const connectButton = page.locator('button', { hasText: 'Connect Machine' })
  const sendButton = page.locator('button', { hasText: 'Send to Machine' })
  
  // Test that buttons are enabled and clickable
  await expect(connectButton).toBeEnabled()
  await expect(sendButton).toBeEnabled()
  
  // Test clicking (should not cause errors even if connection fails)
  await connectButton.click()
  // Wait a bit to see if any error toasts appear
  await page.waitForTimeout(1000)
  
  // The connect might fail (which is expected in test environment)
  // but the button should still be functional
})