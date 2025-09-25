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
  
  await page.waitForLoadState('networkidle')
  
  await expect(page.locator('button', { hasText: 'Undo' })).toBeVisible()
  await expect(page.locator('button', { hasText: 'Grid' })).toBeVisible()
  await expect(page.locator('button', { hasText: 'Import' })).toBeVisible()
  await expect(page.locator('button', { hasText: 'About' })).toBeVisible()
})

test('should show machine control buttons', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  
  // Test that machine control buttons are visible
  await expect(page.locator('button', { hasText: 'Connect Machine' })).toBeVisible()
  await expect(page.locator('button', { hasText: 'Send to Machine' })).toBeVisible()
})

test('should show export functionality', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  
  // Only test for SVG export button since DST/EXP are hidden
  await expect(page.locator('button', { hasText: 'Export SVG' })).toBeVisible()
  
  // Test that DST/EXP buttons are NOT visible
  await expect(page.locator('button', { hasText: 'Export DST' })).not.toBeVisible()
  await expect(page.locator('button', { hasText: 'Export EXP' })).not.toBeVisible()
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
  await page.waitForLoadState('networkidle')
  
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