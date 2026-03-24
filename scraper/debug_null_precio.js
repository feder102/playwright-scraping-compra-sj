const { chromium } = require('playwright');

// URLs with null prices from the recent scrape
const TEST_URLS = [
  'https://www.compraensanjuan.com/anuncio_ve/2572523/amarok-trendline-4x4-automatica',
  'https://www.compraensanjuan.com/anuncio_ve/2449417/volkswagen-amarok-modelo-2015-motion-automatica-caja-8vatop-de-gama-4x4-motion-nueva-impecable-unico-dueno',
];

async function debugPrice(url) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.log(`\n=== TESTING: ${url.substring(0, 80)} ===`);
    await page.goto(url, { timeout: 60000, waitUntil: 'networkidle' }).catch(() => {});
    await page.waitForLoadState('networkidle').catch(() => {});

    const result = await page.evaluate(() => {
      const debug = {
        h3_found: 0,
        h3_with_dollar: 0,
        h3_values: [],
        span_precio_found: 0,
        span_precio_values: [],
        precio_text: ''
      };

      // Check h3 elements
      const h3s = document.querySelectorAll('h3');
      debug.h3_found = h3s.length;
      for (let h3 of h3s) {
        const text = h3.innerText;
        if (text.includes('$') || text.includes('U$S')) {
          debug.h3_with_dollar++;
          debug.h3_values.push(text.substring(0, 50));
        }
      }

      // Check span.precio
      const spans = document.querySelectorAll('span[class*="precio"], span[class*="price"]');
      debug.span_precio_found = spans.length;
      for (let i = 0; i < Math.min(3, spans.length); i++) {
        debug.span_precio_values.push(spans[i].innerText.substring(0, 50));
      }

      // Look for price text in all text
      const allText = document.body.innerText;
      const priceMatch = allText.match(/[$ U$S][\s\d.,]+/);
      if (priceMatch) {
        debug.precio_text = priceMatch[0].substring(0, 100);
      }

      return debug;
    });

    console.log(`H3 found: ${result.h3_found}, with $: ${result.h3_with_dollar}`);
    if (result.h3_values.length > 0) {
      console.log(`  Values: ${result.h3_values.join(' | ')}`);
    }
    console.log(`Span.precio found: ${result.span_precio_found}`);
    if (result.span_precio_values.length > 0) {
      console.log(`  Values: ${result.span_precio_values.join(' | ')}`);
    }
    if (result.precio_text) {
      console.log(`Price in text: ${result.precio_text}`);
    }

  } catch (e) {
    console.error(`Error: ${e.message}`);
  } finally {
    await browser.close().catch(() => {});
  }
}

async function runTests() {
  for (const url of TEST_URLS) {
    await debugPrice(url);
  }
}

runTests().catch(console.error);
