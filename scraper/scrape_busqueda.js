/**
 * Scraper que FUNCIONA - basado en test_extraction.js que probadamente extrae bien
 */

const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://rwauwtqeywzzjonycipf.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3YXV3dHFleXd6empvbnljaXBmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzkyODg1OSwiZXhwIjoyMDg5NTA0ODU5fQ.y0EpBD24tXv3M-aeO5yp57dyj8vUSkz0MSrEy3xS4Mc";
const BASE_URL = "https://www.compraensanjuan.com";

const MARCAS = {
  'Toyota': '22530',
  'Ford': '22501',
  'Chevrolet': '22514',
  'Honda': '22515',
};

const MODELOS = {
  'Toyota Hilux': { cat: '2253002', nombre: 'Hilux' },
  'Ford Ranger': { cat: '2250512', nombre: 'Ranger' },
};

const args = process.argv.slice(2);
const [tipo, marca, modelo] = args;

function construirURL() {
  const url = `${BASE_URL}/b.php`;
  const params = new URLSearchParams();

  // Pasar marca si existe
  if (marca && MARCAS[marca]) {
    params.append('mar_seg', MARCAS[marca]);
  }

  // Pasar modelo si existe
  if (modelo && marca) {
    const modeloKey = `${marca} ${modelo}`;
    if (MODELOS[modeloKey]) {
      params.append('mod_mar', MODELOS[modeloKey].cat);
    }
  }

  // Parámetros por defecto
  params.append('estado', 'Todos');
  params.append('foto', '');
  params.append('conprecio', '');
  params.append('orden', '0');

  return `${url}?${params.toString()}`;
}

async function scrapeAnuncio(url) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // MISMO PATRÓN QUE test_extraction.js (que funciona)
    await page.goto(url, { timeout: 60000, waitUntil: 'networkidle' }).catch(() => {});
    await page.waitForLoadState('networkidle').catch(() => {});

    // EXTRACCIÓN - idéntica a test_extraction.js
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

      // Características - ESTE ES EL CÓDIGO QUE FUNCIONA EN test_extraction.js
      const caracteristicas = document.querySelectorAll('p.name-caracteristica');

      for (let p of caracteristicas) {
        const text = p.innerText.trim();
        const span = p.querySelector('span.caracteristica');
        const value = span ? span.innerText.trim() : '';

        if (text.includes('Marca:')) {
          data.marca = value;
        }
        else if (text.includes('Modelo:')) {
          data.modelo = value;
        }
        else if (text.includes('Version:') || text.includes('Versión:')) {
          data.version = value;
        }
        else if (text.includes('Año:')) {
          const yearMatch = value.match(/\d{4}/);
          if (yearMatch) data.anio = parseInt(yearMatch[0]);
        }
        else if (text.includes('Kilómetros:')) {
          const kmMatch = value.match(/[\d\.]+/);
          if (kmMatch) data.km = parseInt(kmMatch[0].replace(/\./g, ''));
        }
        else if (text.includes('Color:')) {
          data.color = value;
        }
        else if (text.includes('Combustible:')) {
          data.combustible = value;
        }
        else if (text.includes('Estado:')) {
          data.estado = value;
        }
      }

      // Imagen
      const imgs = document.querySelectorAll('img[src*="fotos_vehiculos"]');
      if (imgs.length > 0) {
        data.imagen_url = imgs[0].src;
      }

      return data;
    });

    if (!result) {
      return null;
    }

    return {
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
      categoria: tipo || 'Vehículos',
      scraped_at: new Date().toISOString()
    };
  } catch (e) {
    console.error(`Error scrapeando ${url}: ${e.message}`);
    return null;
  } finally {
    await browser.close().catch(() => {});
  }
}

async function buscarVehiculos(maxAnuncios = 30) {
  const url = construirURL();
  console.log("URL de búsqueda:", url);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(url, { timeout: 30000 }).catch(() => {});
  await page.waitForLoadState('domcontentloaded').catch(() => {});

  const enlaces = await page.$$eval('a[href*="anuncio_ve"]', els =>
    els.map(el => el.href).filter(h => h.includes('/anuncio_ve/'))
  );

  const urls = [...new Set(enlaces)].slice(0, maxAnuncios);
  console.log(`Encontrados ${urls.length} anuncios`);
  await browser.close();

  const resultados = [];
  for (let i = 0; i < urls.length; i++) {
    console.log(`[${i+1}/${urls.length}] ${urls[i].split('/').pop()}`);
    const resultado = await scrapeAnuncio(urls[i]);
    if (resultado) {
      resultados.push(resultado);
    }
  }

  return resultados;
}

async function guardarEnSupabase(datos) {
  console.log(`\nGuardando ${datos.length} registros en Supabase...`);
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  for (const item of datos) {
    try {
      const { error } = await supabase
        .from('compra_ensanjuan')
        .insert([item]);

      if (error) {
        console.error(`❌ ${item.titulo}: ${error.message}`);
      } else {
        console.log(`✅ ${item.marca} ${item.modelo} (${item.anio})`);
      }
    } catch (e) {
      console.error(`Error: ${e.message}`);
    }
  }
}

async function main() {
  console.log("=== Scraper Trabajando ===\n");
  const resultados = await buscarVehiculos(30);
  console.log(`\n=== RESULTADOS: ${resultados.length} vehículos ===`);

  if (resultados.length > 0) {
    await guardarEnSupabase(resultados);
  }
}

main().catch(console.error);
