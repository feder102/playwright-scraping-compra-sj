/**
 * Scraper de últimos productos publicados en Compra en SJ
 * Obtiene los últimos 20 anuncios de todas las categorías
 * Output: JSON a stdout para que Tito lo procese
 */

const { chromium } = require('playwright');

const BASE_URL = "https://www.compraensanjuan.com";
const ULTIMOS_URL = `${BASE_URL}/b.php?texto=&cat=200&pagina=1&orden=10&conprecio=1&estado=Todos&foto=1&envio=0`;

/**
 * Extrae los últimos anuncios de la página
 */
async function scrapearUltimos(maxAnuncios = 10) {
  console.error(`[${new Date().toISOString()}] Iniciando scrape de últimos publicados...`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.error("Cargando página de últimos publicados...");
    // Timeout más generoso (60s) y esperar a networkidle para estabilidad
    await page.goto(ULTIMOS_URL, { timeout: 60000, waitUntil: 'networkidle' }).catch(() => {
      // Si falla, intentar con domcontentloaded
      console.error("⚠️ No se pudo esperar 'networkidle', intentando con 'domcontentloaded'...");
      return page.goto(ULTIMOS_URL, { timeout: 60000, waitUntil: 'domcontentloaded' }).catch(() => {
        console.error("⚠️ No se pudo esperar 'domcontentloaded' tampoco, continuando...");
      });
    });

    // Esperar un poco más para asegurar estabilidad del DOM
    await new Promise(r => setTimeout(r, 2000));

    // Extraer todos los anuncios
    const anuncios = await page.evaluate(({ baseUrl, maxAnuncios }) => {
      const resultados = [];

      // Buscar los items individuales (filas de la tabla/lista)
      // Cada item está en un div.row.lista-avisos
      const items = document.querySelectorAll('div.row.lista-avisos');

      for (const item of items) {
        // Buscar el link principal del anuncio (en .aviso-title)
        const titleElement = item.querySelector('.aviso-title a');
        if (!titleElement) continue;

        const href = titleElement.getAttribute('href');
        if (!href) continue;

        // Url completa
        const url = href.startsWith('http') ? href : baseUrl + '/' + href;

        // Imagen
        const imgElement = item.querySelector('img');
        let imagenUrl = '';
        if (imgElement) {
          let imgSrc = imgElement.getAttribute('src');
          if (imgSrc && imgSrc.trim() !== '') {
            // Limpiar rutas relativas
            imgSrc = imgSrc.replace(/^\.\//, '');

            if (imgSrc.startsWith('http')) {
              imagenUrl = imgSrc;
            } else if (imgSrc.startsWith('/')) {
              imagenUrl = baseUrl + imgSrc;
            } else {
              imagenUrl = baseUrl + '/' + imgSrc;
            }
          }
        }

        // Título
        const titulo = titleElement.innerText.trim();

        // Categoría (primer link de categoría dentro del item)
        const categoria = (() => {
          const categoryLink = item.querySelector('.aviso-categoria-start a');
          if (categoryLink) {
            return categoryLink.innerText.trim();
          }
          return 'Sin categoría';
        })();

        // Precio (buscar en divs que contienen $)
        let precio = null;
        const priceDivs = item.querySelectorAll('div');
        for (const div of priceDivs) {
          const text = div.innerText;
          if (text.includes('$')) {
            const match = text.match(/\$\s*([\d.]+(?:\.[\d]{3})*)/);
            if (match && match[1]) {
              precio = match[1];
              break;
            }
          }
        }

        if (titulo && url) {
          resultados.push({
            titulo,
            url,
            imagen_url: imagenUrl,
            categoria,
            precio,
            scraped_at: new Date().toISOString()
          });

          if (resultados.length >= maxAnuncios) break;
        }
      }

      return resultados;
    }, { baseUrl: BASE_URL, maxAnuncios });

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
    const anuncios = await scrapearUltimos(10);

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
