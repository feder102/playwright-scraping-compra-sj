/**
 * Test scrapeAnuncio from scrape_busqueda.js on a single known URL
 */

const { chromium } = require('playwright');

const TEST_URL = 'https://www.compraensanjuan.com/anuncio_ve/2606217/toyota-hilux-4x4-srv-30-automatica-2014';

async function scrapeAnuncio(url) {
  let browser = null;
  let page = null;

  try {
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage();

    await page.goto(url, { timeout: 60000, waitUntil: 'networkidle' }).catch(() => {});
    await page.waitForLoadState('networkidle').catch(() => {});
    // Wait a bit extra for JavaScript to render dynamic content
    await page.waitForTimeout(200);

    // Extraer todos los datos de forma simple y directa (VERSIÓN FUNCIONAL DEL TEST)
    const result = await page.evaluate(() => {
      const data = {
        titulo: '',
        marca: '',
        modelo: '',
        version: '',
        anio: null,
        km: null,
        color: '',
        combustible: '',
        estado: '',
        precio: null,
        imagen_url: null
      };

      // Título
      const h1 = document.querySelector('h1');
      if (h1) data.titulo = h1.innerText.trim();

      // Precio
      const h3s = document.querySelectorAll('h3');
      for (let h3 of h3s) {
        if (h3.innerText.includes('$')) {
          const match = h3.innerText.replace(/\./g, '').replace(',', '.').match(/[\d]+/);
          if (match) data.precio = parseFloat(match[0]);
          break;
        }
      }

      // Características
      const caracteristicas = document.querySelectorAll('p.name-caracteristica');

      // Si no encuentra elementos, devolver con campos vacíos (mejor que crashear)
      if (caracteristicas.length === 0) {
        // Elementos no encontrados, pero devolvemos los datos que tenemos
        return data;
      }

      for (let p of caracteristicas) {
        const text = p.innerText.trim();
        const span = p.querySelector('span.caracteristica');
        const value = span ? span.innerText.trim() : '';

        if (text.includes('Marca:')) data.marca = value;
        else if (text.includes('Modelo:')) data.modelo = value;
        else if (text.includes('Version:') || text.includes('Versión:')) data.version = value;
        else if (text.includes('Año:')) {
          const yearMatch = value.match(/\d{4}/);
          if (yearMatch) data.anio = parseInt(yearMatch[0]);
        }
        else if (text.includes('Kilómetros:')) {
          const kmMatch = value.match(/[\d\.]+/);
          if (kmMatch) data.km = parseInt(kmMatch[0].replace(/\./g, ''));
        }
        else if (text.includes('Color:')) data.color = value;
        else if (text.includes('Combustible:')) data.combustible = value;
        else if (text.includes('Estado:')) data.estado = value;
      }

      // Imagen
      const imgs = document.querySelectorAll('img[src*="fotos_vehiculos"]');
      if (imgs.length > 0) {
        data.imagen_url = imgs[0].src;
      }

      return data;
    });

    if (!result) {
      console.error(`⚠️ No result from page.evaluate for ${url}`);
      return null;
    }

    const finalObject = {
      titulo: result.titulo,
      url,
      precio: result.precio,
      marca: result.marca,
      modelo: result.modelo,
      version: result.version,
      anio: result.anio,
      kilometros: result.km,
      color: result.color,
      combustible: result.combustible,
      estado: result.estado,
      descripcion: null,
      imagen_url: result.imagen_url,
      categoria: 'Vehículos',
      scraped_at: new Date().toISOString()
    };

    console.log('Result:');
    console.log(JSON.stringify(finalObject, null, 2));

    return finalObject;
  } catch (e) {
    console.error(`Error scrapeando ${url}: ${e.message}`);
    return null;
  } finally {
    if (browser && page) {
      try {
        await page.close().catch(() => {});
        await browser.close().catch(() => {});
      } catch (err) {
        // Ignore errors closing browser
      }
    }
  }
}

(async () => {
  console.log('Testing scrapeAnuncio with test URL...\n');
  await scrapeAnuncio(TEST_URL);
})();
