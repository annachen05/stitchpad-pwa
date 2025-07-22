import { test, expect } from '@playwright/test'

test('basic app functionality', async ({ page }) => {
  // Navigiere zur Seite und warte, bis sie vollständig geladen ist
  await page.goto('/', { waitUntil: 'networkidle' });
  
  // Teste, ob die Seite überhaupt lädt
  const title = await page.title();
  expect(title).toBeTruthy();
  console.log('Seitentitel:', title);
  
  // Screenshot der geladenen Seite
  await page.screenshot({ path: 'app-loaded.png', fullPage: true });
  
  // Prüfe, ob mindestens ein Button vorhanden ist
  const buttons = await page.$$('button');
  console.log(`${buttons.length} Buttons gefunden`);
  expect(buttons.length).toBeGreaterThan(0);
  
  // Logge alle Button-Texte
  for (const button of buttons) {
    const text = await button.textContent();
    console.log(`Button: "${text}"`);
  }
});