/**
 * Scraper de últimos productos publicados en Compra en SJ
 * Obtiene los últimos 20 anuncios de todas las categorías
 * Output: JSON a stdout para que Tito lo procese
 */

const { chromium } = require('playwright');

const BASE_URL = "https://www.compraensanjuan.com";
const ULTIMOS_URL = `${BASE_URL}/ultimos_publicados.php?cat=`;

/**
 * Extrae los últimos anuncios de la página
 */
async function scrapearUltimos(maxAnuncios = 20) {
  console.error(`[${new Date().toISOString()}] Iniciando scrape de últimos publicados...`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.error("Cargando página de últimos publicados...");
    await page.goto(ULTIMOS_URL, { timeout: 30000 });
    await page.waitForLoadState('load');

    // Extraer todos los anuncios
    const anuncios = await page.evaluate((baseUrl) => {
      const resultados = [];

      // Buscar todos los divs que contienen anuncios
      const items = document.querySelectorAll('[class*="aviso"]');

      for (const item of items) {
        // Buscar el link del anuncio
        const linkElement = item.querySelector('a[href*="anuncio_"]');
        if (!linkElement) continue;

        const href = linkElement.getAttribute('href');
        if (!href) continue;

        // Url completa
        const url = baseUrl + '/' + href;

        // Imagen
        const imgElement = item.querySelector('.img-lista');
        let imagenUrl = '';
        if (imgElement && imgElement.parentElement) {
          const imgSrc = imgElement.getAttribute('src');
          if (imgSrc) {
            imagenUrl = baseUrl + '/' + imgSrc.replace('?v=' + new URLSearchParams(new URL(imgSrc).search).get('v'), '');
          }
        }

        // Título
        const titleElement = item.querySelector('.aviso-title a');
        const titulo = titleElement ? titleElement.innerText.trim() : '';

        // Categoría (primer breadcrumb después de "Compra en SJ")
        const categoria = (() => {
          const breadcrumbs = item.querySelectorAll('.aviso-categoria-start a');
          if (breadcrumbs.length > 0) {
            return breadcrumbs[0].innerText.trim();
          }
          return 'Sin categoría';
        })();

        if (titulo && url) {
          resultados.push({
            titulo,
            url,
            imagen_url: imagenUrl,
            categoria,
            scraped_at: new Date().toISOString()
          });

          if (resultados.length >= 20) break;
        }
      }

      return resultados;
    }, BASE_URL);

    console.error(`✅ Scrape completado: ${anuncios.length} anuncios encontrados`);
    return anuncios.slice(0, maxAnuncios);

  } catch (error) {
    console.error(`❌ Error durante scrape: ${error.message}`);
    return [];
  } finally {
    await browser.close();
  }
}

/**
 * Formatea los resultados en JSON para stdout
 */
function formatearJSON(anuncios) {
  return JSON.stringify(anuncios, null, 2);
}

/**
 * Función principal
 */
async function main() {
  try {
    const anuncios = await scrapearUltimos(20);

    // Output: JSON limpio a stdout (sin mensajes de debug)
    console.log(formatearJSON(anuncios));

  } catch (error) {
    console.error(`❌ Error fatal: ${error.message}`);
    process.exit(1);
  }
}

main().catch(error => {
  console.error(`❌ Uncaught error: ${error.message}`);
  process.exit(1);
});
