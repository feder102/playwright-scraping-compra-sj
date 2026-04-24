/**
 * Scraper de motos publicadas en Compra en SJ
 * Obtiene los últimos anuncios de la categoría Motos (cat=226)
 * Output: JSON a stdout para que notify_telegram.js lo procese
 */

const { chromium } = require('playwright');

const BASE_URL = "https://www.compraensanjuan.com";
const MOTOS_URL = `${BASE_URL}/b.php?texto=&cat=226&pagina=1&orden=10&conprecio=1&estado=Todos&foto=1&envio=0`;

async function scrapearMotos(maxAnuncios = 15) {
  console.error(`[${new Date().toISOString()}] Iniciando scrape de motos...`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.error("Cargando página de motos...");
    await page.goto(MOTOS_URL, { timeout: 60000, waitUntil: 'networkidle' }).catch(() => {
      console.error("⚠️ No se pudo esperar 'networkidle', intentando con 'domcontentloaded'...");
      return page.goto(MOTOS_URL, { timeout: 60000, waitUntil: 'domcontentloaded' }).catch(() => {
        console.error("⚠️ No se pudo esperar 'domcontentloaded' tampoco, continuando...");
      });
    });

    await new Promise(r => setTimeout(r, 2000));

    const anuncios = await page.evaluate(({ baseUrl, maxAnuncios }) => {
      const resultados = [];

      const items = document.querySelectorAll('div.row.lista-avisos');

      for (const item of items) {
        const titleElement = item.querySelector('.aviso-title a');
        if (!titleElement) continue;

        const href = titleElement.getAttribute('href');
        if (!href) continue;

        const url = href.startsWith('http') ? href : baseUrl + '/' + href;

        const imgElement = item.querySelector('img');
        let imagenUrl = '';
        if (imgElement) {
          let imgSrc = imgElement.getAttribute('src');
          if (imgSrc && imgSrc.trim() !== '') {
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

        const titulo = titleElement.innerText.trim();

        const categoria = (() => {
          const categoryLink = item.querySelector('.aviso-categoria-start a');
          if (categoryLink) return categoryLink.innerText.trim();
          return 'Motos';
        })();

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
    return anuncios;

  } catch (error) {
    console.error(`❌ Error durante scrape: ${error.message}`);
    return [];
  } finally {
    await browser.close();
  }
}

async function main() {
  try {
    const anuncios = await scrapearMotos(15);
    console.log(JSON.stringify(anuncios, null, 2));
  } catch (error) {
    console.error(`❌ Error fatal: ${error.message}`);
    process.exit(1);
  }
}

main().catch(error => {
  console.error(`❌ Uncaught error: ${error.message}`);
  process.exit(1);
});
