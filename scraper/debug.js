const { chromium } = require('playwright');

const BASE_URL = "https://www.compraensanjuan.com";
const CATEGORIA_URL = `${BASE_URL}/b.php?cat=225&orden=10`;

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.log("Visitando:", CATEGORIA_URL);
    await page.goto(CATEGORIA_URL, { timeout: 30000 });
    await page.waitForLoadState('domcontentloaded');

    console.log("\n=== ANÁLISIS DE SELECTORES ===\n");

    // Buscar diferentes selectores posibles
    const enlaces1 = await page.$$eval('a[href*="/anuncio_ve/"]', els => els.length).catch(() => 0);
    console.log("✗ a[href*=\"/anuncio_ve/\"]:", enlaces1);

    const enlaces2 = await page.$$eval('a[href*="anuncio"]', els => els.length).catch(() => 0);
    console.log("✓ a[href*=\"anuncio\"]:", enlaces2);

    const enlaces3 = await page.$$eval('a[href*="/anuncio"]', els => els.length).catch(() => 0);
    console.log("✓ a[href*=\"/anuncio\"]:", enlaces3);

    const enlaces4 = await page.$$('a').then(els => els.length);
    console.log("✓ Total de 'a' tags:", enlaces4);

    // Mostrar algunos hrefs de ejemplo
    const ejemplos = await page.$$eval('a', els =>
      els.slice(0, 10)
        .filter(el => el.href && (el.href.includes('anuncio') || el.href.includes('/b.php')))
        .map(el => el.href)
    );
    console.log("\nEjemplos de href encontrados:");
    ejemplos.forEach((url, i) => console.log(`  ${i+1}. ${url}`));

    // Inspeccionar estructura de la página
    console.log("\n=== ESTRUCTURA DE PÁGINA ===\n");
    const title = await page.title();
    console.log("Title:", title);

    const hasContent = await page.$('.producto, .anuncio, .item, [class*="product"], [class*="listing"]').then(el => !!el);
    console.log("Tiene divs con clases de producto:", hasContent);

  } catch (error) {
    console.error("Error:", error.message);
  }

  await browser.close();
})();
