import { test, expect } from '@playwright/test'

test('debug about dialog', async ({ page }) => {
  // Starte den Test mit einem größeren Viewport
  await page.setViewportSize({ width: 1280, height: 800 });
  
  // Navigiere zur App mit längeren Timeouts
  await page.goto('/', { timeout: 60000, waitUntil: 'networkidle' });
  
  // Logge den HTML-Inhalt für Debugging
  const bodyHTML = await page.evaluate(() => document.body.innerHTML);
  console.log('Body HTML (first 300 chars):', bodyHTML.substring(0, 300));
  
  // Screenshot vor Aktion
  await page.screenshot({ path: 'debug-before.png', fullPage: true });
  
  // Versuche den Button durch flexiblere Lokalisierung zu finden
  console.log('Suche verschiedene Selektoren für den Über-Button');
  
  // Verschiedene Selektoren probieren
  const selectors = [
    'button:has-text("Über")',
    'text="Über"',
    '[aria-label="Über"]',
    'button:last-child'  // Falls es der letzte Button ist
  ];
  
  // Teste jeden Selektor
  let aboutButton = null;
  for (const selector of selectors) {
    const count = await page.locator(selector).count();
    console.log(`Selektor ${selector}: ${count} Element(e) gefunden`);
    if (count > 0) {
      aboutButton = page.locator(selector).first();
      break;
    }
  }
  
  if (!aboutButton) {
    console.log('Über-Button nicht gefunden! Zeige alle Buttons:');
    const allButtons = await page.$$('button');
    for (const button of allButtons) {
      const text = await button.textContent();
      console.log(`Button gefunden: "${text}"`);
    }
    throw new Error('Kein Über-Button gefunden');
  }
  
  // Versuche zu klicken
  console.log('Versuche auf Über-Button zu klicken');
  await aboutButton.click({ force: true, timeout: 10000 });
  
  // Warte und mache einen Screenshot
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'debug-after.png', fullPage: true });
  
  // Prüfe auf Dialog-Elemente
  console.log('Suche nach Dialog-Elementen');
  const dialogElements = await page.$$('div[class*="about"], div[class*="dialog"], div[class*="dialogue"], div[role="dialog"]');
  console.log(`${dialogElements.length} Dialog-Elemente gefunden`);
  
  for (const el of dialogElements) {
    const className = await el.getAttribute('class');
    const role = await el.getAttribute('role');
    const text = await el.textContent();
    console.log(`Dialog gefunden: class="${className}" role="${role}" text="${text.substring(0, 50)}..."`);
  }
  
  // Suche nach beiden möglichen Klassen
  const dialogSelectors = ['.about-dialog', '.about-dialogue'];

  for (const selector of dialogSelectors) {
    const count = await page.locator(selector).count();
    console.log(`${selector}: ${count} Element(e) gefunden`);
  }
});