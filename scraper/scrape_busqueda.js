/**
 * Scraper de búsqueda personalizada para compraensanjuan.com
 * Uso: node scrape_busqueda.js [tipo] [marca] [modelo] [añoDesde] [añoHasta] [precioDesde] [precioHasta] [kmDesde] [kmHasta]
 */

const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://rwauwtqeywzzjonycipf.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3YXV3dHFleXd6empvbnljaXBmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzkyODg1OSwiZXhwIjoyMDg5NTA0ODU5fQ.y0EpBD24tXv3M-aeO5yp57dyj8vUSkz0MSrEy3xS4Mc";

const BASE_URL = "https://www.compraensanjuan.com";

// Mapeo de tipos a IDs
const TIPOS = {
  'Autos': '224',
  'Camiones': '226',
  'Camionetas, Utilitarios, SUV': '225',
  'Motos, Cuatriciclos': '227',
  'Náutica': '228',
  'Otros vehículos': '229'
};

// Mapeo de marcas a códigos mar_seg (Compra en SJ)
const MARCAS = {
  'Ford': '22513',
  'Chevrolet': '22514',
  'Honda': '22515',
  'Renault': '22516',
  'Peugeot': '22517',
  'Toyota': '22519',
  'Nissan': '22520',
  'Volkswagen': '22531',
  'Fiat': '22510',
  'Hyundai': '22521'
};

// Mapeo de modelos a códigos mod_mar (Compra en SJ)
// Estructura: 'Marca Modelo': 'mod_mar_code'
const MODELOS = {
  // Ford
  'Ford Focus': '2251301',
  'Ford Fiesta': '2251302',
  'Ford Ranger': '2251304',
  'Ford Mustang': '2251310',
  'Ford Explorer': '2251311',
  // Volkswagen
  'Volkswagen Gol': '2253101',
  'Volkswagen Polo': '2253102',
  'Volkswagen Vento': '2253103',
  'Volkswagen Amarok': '2253111',
  'Volkswagen Tiguan': '2253112',
  'Volkswagen Touareg': '2253113',
  // Chevrolet
  'Chevrolet Corsa': '2251401',
  'Chevrolet Prisma': '2251402',
  'Chevrolet Cruze': '2251403',
  'Chevrolet Montana': '2251404',
  'Chevrolet S10': '2251405',
  'Chevrolet Tracker': '2251406',
  // Toyota
  'Toyota Corolla': '2251901',
  'Toyota Etios': '2251902',
  'Toyota Hilux': '2251905',
  'Toyota SW4': '2251906',
  'Toyota Fortuner': '2251907',
  'Toyota Prius': '2251908',
  // Honda
  'Honda Civic': '2251501',
  'Honda Accord': '2251502',
  'Honda Fit': '2251503',
  'Honda City': '2251504',
  'Honda CR-V': '2251505',
  // Renault
  'Renault Clio': '2251601',
  'Renault Sandero': '2251602',
  'Renault Logan': '2251603',
  'Renault Scenic': '2251604',
  'Renault Koleos': '2251605',
  // Fiat
  'Fiat 500': '2251001',
  'Fiat Uno': '2251002',
  'Fiat Palio': '2251003',
  'Fiat Mobi': '2251004',
  'Fiat Argo': '2251005',
  'Fiat Cronos': '2251006',
  // Peugeot
  'Peugeot 208': '2251701',
  'Peugeot 307': '2251702',
  'Peugeot 408': '2251703',
  'Peugeot 2008': '2251705',
  // Nissan
  'Nissan Versa': '2252001',
  'Nissan Sentra': '2252002',
  'Nissan Frontier': '2252003',
  'Nissan Kicks': '2252004',
};

// Argumentos: tipo, marca, modelo, añoDesde, añoHasta, precioDesde, precioHasta, kmDesde, kmHasta
const args = process.argv.slice(2);
const [tipo, marca, modelo, añoDesde, añoHasta, precioDesde, precioHasta, kmDesde, kmHasta] = args;

function construirURL() {
  let url = `${BASE_URL}/b_vh.php`;
  const params = new URLSearchParams();
  
  // Tipo -> ID
  if (tipo && tipo !== 'Todos' && TIPOS[tipo]) {
    params.append('tipo', TIPOS[tipo]);
  }
  
  // Marca -> ID
  if (marca && marca !== 'Todos' && MARCAS[marca]) {
    params.append('mar_seg', MARCAS[marca]);
  }
  
  // Modelo -> ID (busca con "Marca Modelo")
  if (modelo && marca) {
    const modeloKey = `${marca} ${modelo}`;
    if (MODELOS[modeloKey]) {
      params.append('mod_mar', MODELOS[modeloKey]);
    }
  }
  
  params.append('vendedor', 'Todos');
  params.append('primeramano', 'Todos');
  params.append('combustible', 'Todos');
  
  if (kmDesde) params.append('km_desde', kmDesde);
  if (kmHasta) params.append('km_hasta', kmHasta);
  if (precioDesde) params.append('precio_desde', precioDesde);
  if (precioHasta) params.append('precio_hasta', precioHasta);
  if (añoDesde) params.append('anio_desde', añoDesde);
  if (añoHasta) params.append('anio_hasta', añoHasta);
  
  params.append('orden', '0');
  
  return `${url}?${params.toString()}`;
}

function extraerPrecio(texto) {
  if (!texto) return null;
  const match = texto.replace(/\./g, '').replace(',', '.').match(/[\d]+/);
  return match ? parseFloat(match[0]) : null;
}

function extraerAnio(texto) {
  if (!texto) return null;
  const match = texto.match(/Año:?\s*(\d{4})/i);
  return match ? parseInt(match[1]) : null;
}

function extraerKm(texto) {
  if (!texto) return null;
  const match = texto.match(/Kilómetros?:?\s*([\d\.]+)/i);
  return match ? parseInt(match[1].replace(/\./g, '')) : null;
}

async function scrapeAnuncio(page, url) {
  try {
    await page.goto(url, { timeout: 30000 });
    await page.waitForLoadState('domcontentloaded');
    
    const titulo = await page.title();
    const precioElem = await page.$('h3:has-text("$")');
    const precioTexto = precioElem ? await precioElem.innerText() : null;
    const precio = extraerPrecio(precioTexto);
    
    const caracteristicas = {};
    const lineas = await page.$$eval('td', tds => tds.map(td => td.innerText).filter(t => t.includes(':')));
    
    for (const linea of lineas) {
      const [key, ...valueParts] = linea.split(':');
      if (key && valueParts.length) {
        caracteristicas[key.trim()] = valueParts.join(':').trim();
      }
    }
    
    const marca = caracteristicas['Marca'] || '';
    const modelo = caracteristicas['Modelo'] || '';
    const version = caracteristicas['Version'] || '';
    const anio = extraerAnio(caracteristicas['Año'] || '');
    const km = extraerKm(caracteristicas['Kilómetros'] || '');
    const color = caracteristicas['Color'] || '';
    const combustible = caracteristicas['Combustible'] || '';
    const estado = caracteristicas['Estado'] || '';
    
    const descripcion = await page.$eval('div.anuncio-descripcion', el => el.innerText).catch(() => null);
    const imagenUrl = await page.$eval('img.anuncio-imagen', el => el.src).catch(() => null);
    
    return {
      titulo,
      url,
      precio,
      marca,
      modelo,
      version,
      anio,
      kilometros: km,
      color,
      combustible,
      estado,
      descripcion: descripcion ? descripcion.substring(0, 500) : null,
      categoria: tipo || 'Vehículos',
      scraped_at: new Date().toISOString()
    };
  } catch (e) {
    console.error(`Error scrapeando ${url}: ${e.message}`);
    return null;
  }
}

async function buscarVehiculos(maxAnuncios = 50) {
  const url = construirURL();
  console.log("Iniciando búsqueda personalizada...");
  console.log("URL:", url);
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  console.log("Cargando página de búsqueda...");
  await page.goto(url, { timeout: 30000 });
  await page.waitForLoadState('load');
  
  // Si hay parámetros, submit el formulario
  if (tipo || marca || modelo) {
    await page.click('button:has-text("Buscar")').catch(() => {});
    await page.waitForTimeout(2000);
  }
  
  // Encontrar enlaces de anuncios
  const enlaces = await page.$$eval('a[href*="anuncio_ve"]', els =>
    els.map(el => el.href).filter(h => h.includes('/anuncio_ve/'))
  );
  
  const urls = [...new Set(enlaces)].slice(0, maxAnuncios);
  console.log(`Encontrados ${urls.length} anuncios`);
  
  const resultados = [];
  for (let i = 0; i < urls.length; i++) {
    console.log(`Scrapeando ${i+1}/${urls.length}: ${urls[i]}`);
    const resultado = await scrapeAnuncio(page, urls[i]);
    if (resultado) {
      resultados.push(resultado);
    }
  }
  
  await browser.close();
  return resultados;
}

async function guardarEnSupabase(datos) {
  console.log("Guardando en Supabase...");
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  
  for (const item of datos) {
    try {
      const { error } = await supabase
        .from('compra_ensanjuan')
        .insert([item]);
      
      if (error) {
        console.error(`Error guardando ${item.titulo}: ${error.message}`);
      } else {
        console.log("Guardado:", item.titulo?.substring(0, 30));
      }
    } catch (e) {
      console.error("Error:", e.message);
    }
  }
}

async function main() {
  console.log("=== Búsqueda Personalizada ===");
  console.log("Filtros:");
  console.log("  Tipo:", tipo || "Todos");
  console.log("  Marca:", marca || "Todos");
  console.log("  Modelo:", modelo || "Todos");
  console.log("  Año:", (añoDesde || "0"), "-", (añoHasta || "Todos"));
  console.log("  Precio:", (precioDesde || "0"), "-", (precioHasta || "Todos"));
  console.log("  Km:", (kmDesde || "0"), "-", (kmHasta || "Todos"));
  console.log("==============================");
  
  const resultados = await buscarVehiculos(30);
  
  console.log(`\nTotal scrapeados: ${resultados.length}`);
  
  if (resultados.length > 0) {
    await guardarEnSupabase(resultados);
    console.log("\n=== RESUMEN ===");
    console.log(`Vehículos encontrados: ${resultados.length}`);
    resultados.forEach(v => {
      console.log(`- ${v.marca} ${v.modelo} (${v.anio}): $${v.precio?.toLocaleString() || 'N/A'}`);
    });
  } else {
    console.log("No se encontraron vehículos con esos filtros.");
  }
}

main().catch(console.error);
