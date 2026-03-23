const { chromium } = require('playwright');

const TEST_URL = 'https://www.compraensanjuan.com/anuncio_ve/2606217/toyota-hilux-4x4-srv-30-automatica-2014';

async function test() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(TEST_URL, { timeout: 60000, waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForLoadState('networkidle').catch(() => {});

  // Test the extraction
  const result = await page.evaluate(() => {
    const data = {
      marca: '',
      modelo: '',
      version: '',
      anio: null,
      km: null
    };

    console.log('DEBUG: Buscando elementos con selector p.name-caracteristica');
    const caracteristicas = document.querySelectorAll('p.name-caracteristica');
    console.log(`DEBUG: Encontrados ${caracteristicas.length} elementos`);

    for (let i = 0; i < Math.min(5, caracteristicas.length); i++) {
      const p = caracteristicas[i];
      console.log(`DEBUG [${i}]:`, p.innerText);
      const span = p.querySelector('span.caracteristica');
      if (span) {
        console.log(`  -> Valor: "${span.innerText}"`);
      }
    }

    for (let p of caracteristicas) {
      const text = p.innerText.trim();
      const span = p.querySelector('span.caracteristica');
      const value = span ? span.innerText.trim() : '';

      if (text.includes('Marca:')) {
        console.log('Found Marca:', value);
        data.marca = value;
      }
      else if (text.includes('Modelo:')) {
        console.log('Found Modelo:', value);
        data.modelo = value;
      }
      else if (text.includes('Version:') || text.includes('Versión:')) {
        console.log('Found Version:', value);
        data.version = value;
      }
      else if (text.includes('Año:')) {
        console.log('Found Año:', value);
        const yearMatch = value.match(/\d{4}/);
        if (yearMatch) data.anio = parseInt(yearMatch[0]);
      }
      else if (text.includes('Kilómetros:')) {
        console.log('Found Kilómetros:', value);
        const kmMatch = value.match(/[\d\.]+/);
        if (kmMatch) data.km = parseInt(kmMatch[0].replace(/\./g, ''));
      }
    }

    return data;
  });

  console.log('\nResult:', result);
  await browser.close();
}

test().catch(console.error);
