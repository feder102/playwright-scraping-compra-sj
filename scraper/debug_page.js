/**
 * Script para debuggear la estructura HTML de una página de anuncio
 */

const { chromium } = require('playwright');

const TEST_URL = 'https://www.compraensanjuan.com/anuncio_ve/2606217/toyota-hilux-4x4-srv-30-automatica-2014';

async function debugPage() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log('Navegando a:', TEST_URL);
  await page.goto(TEST_URL, { timeout: 60000, waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('domcontentloaded');

  // Obtener HTML completo
  const html = await page.content();
  console.log('\n=== FULL HTML ===\n');
  console.log(html);

  // Obtener texto visible
  console.log('\n=== VISIBLE TEXT ===\n');
  const text = await page.innerText('body');
  console.log(text);

  // Obtener todos los td elementos
  console.log('\n=== TD ELEMENTS ===\n');
  const tds = await page.$$eval('td', els => els.map(el => el.innerText));
  console.log(JSON.stringify(tds, null, 2));

  // Obtener todos los elementos con sus clases
  console.log('\n=== ALL ELEMENTS WITH CLASSES ===\n');
  const elements = await page.$$eval('*', els =>
    els.slice(0, 50).map(el => ({
      tag: el.tagName,
      class: el.className,
      text: el.innerText ? el.innerText.substring(0, 100) : ''
    }))
  );
  console.log(JSON.stringify(elements, null, 2));

  await browser.close();
}

debugPage().catch(console.error);
