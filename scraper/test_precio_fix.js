const { chromium } = require('playwright');

// Test URLs from the latest search
const TEST_URLS = [
  'https://www.compraensanjuan.com/anuncio_ve/2607809/volkswagen-amarok-highline-pack-2014-at-180hp',
  'https://www.compraensanjuan.com/anuncio_ve/2569822/volkswagen-amarok-extreme-v6-2023',
];

async function testPriceExtraction(url) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(url, { timeout: 60000, waitUntil: 'networkidle' }).catch(() => {});
    await page.waitForLoadState('networkidle').catch(() => {});

    const result = await page.evaluate(() => {
      let precioEncontrado = false;
      let data = { precio: null, metodo: '' };

      // Método 1: h3 con $
      if (!precioEncontrado) {
        const h3s = document.querySelectorAll('h3');
        for (let h3 of h3s) {
          const text = h3.innerText;
          if (text.includes('$') || text.includes('U$S')) {
            const cleaned = text.replace(/[^\d.,]/g, '').replace(/\./g, '').replace(',', '.');
            const match = cleaned.match(/[\d.]+/);
            if (match) {
              data.precio = parseFloat(match[0]);
              data.metodo = 'h3';
              precioEncontrado = true;
              break;
            }
          }
        }
      }

      // Método 2: span con clase que incluya "precio"
      if (!precioEncontrado) {
        const spans = document.querySelectorAll('span[class*="precio"], span[class*="price"]');
        for (let span of spans) {
          const text = span.innerText;
          if (text.match(/[\d.,]/)) {
            const cleaned = text.replace(/[^\d.,]/g, '').replace(/\./g, '').replace(',', '.');
            const match = cleaned.match(/[\d.]+/);
            if (match) {
              const valor = parseFloat(match[0]);
              if (valor > 100) {
                data.precio = valor;
                data.metodo = 'span.precio';
                precioEncontrado = true;
                break;
              }
            }
          }
        }
      }

      // Método 3: div con patrón de precio
      if (!precioEncontrado) {
        const divs = document.querySelectorAll('div');
        for (let div of divs) {
          const text = div.innerText;
          if ((text.includes('$') || text.includes('U$S')) && text.match(/[\d.,]{4,}/)) {
            const cleaned = text.replace(/[^\d.,]/g, '').replace(/\./g, '').replace(',', '.');
            const match = cleaned.match(/[\d.]+/);
            if (match) {
              const valor = parseFloat(match[0]);
              if (valor > 100) {
                data.precio = valor;
                data.metodo = 'div';
                precioEncontrado = true;
                break;
              }
            }
          }
        }
      }

      return data;
    });

    console.log(`URL: ${url}`);
    console.log(`Precio: ${result.precio} (método: ${result.metodo})`);
    console.log('---');

  } catch (e) {
    console.error(`Error: ${e.message}`);
  } finally {
    await browser.close().catch(() => {});
  }
}

async function runTests() {
  for (const url of TEST_URLS) {
    await testPriceExtraction(url);
  }
}

runTests().catch(console.error);
