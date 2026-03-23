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

// Mapeo de marcas a códigos cat (Compra en SJ - categoría)
const MARCAS = {
  'Ford': '22501',
  'Chevrolet': '22514',
  'Honda': '22515',
  'Renault': '22516',
  'Peugeot': '22517',
  'Toyota': '22530',
  'Nissan': '22520',
  'Volkswagen': '22531',
  'Fiat': '22510',
  'Hyundai': '22521'
};

// Mapeo de modelos a códigos cat específicos (Compra en SJ)
// Estructura: 'Marca Modelo': { cat: 'category_code', nombre: 'Nombre Modelo' }
const MODELOS = {
  // Volkswagen
  'Volkswagen Amarok': { cat: '2253111', nombre: 'Amarok' },
  'Volkswagen Gol': { cat: '2253101', nombre: 'Gol' },
  'Volkswagen Polo': { cat: '2253102', nombre: 'Polo' },
  'Volkswagen Vento': { cat: '2253103', nombre: 'Vento' },
  'Volkswagen Tiguan': { cat: '2253112', nombre: 'Tiguan' },
  'Volkswagen Touareg': { cat: '2253113', nombre: 'Touareg' },

  // Toyota
  'Toyota Hilux': { cat: '2253002', nombre: 'Hilux' },
  'Toyota Hilux SW4': { cat: '2253003', nombre: 'Hilux SW4' },
  'Toyota Corolla': { cat: '2253007', nombre: 'Corolla' },
  'Toyota Etios': { cat: '2253008', nombre: 'Etios' },
  'Toyota Fortuner': { cat: '2253009', nombre: 'Fortuner' },
  'Toyota Prius': { cat: '2253010', nombre: 'Prius' },

  // Ford
  'Ford Ranger': { cat: '2250512', nombre: 'Ranger' },
  'Ford Focus': { cat: '2250521', nombre: 'Focus' },
  'Ford Fiesta': { cat: '2250522', nombre: 'Fiesta' },
  'Ford Mustang': { cat: '2250523', nombre: 'Mustang' },
  'Ford Explorer': { cat: '2250524', nombre: 'Explorer' },
  'Ford Transit': { cat: '2250525', nombre: 'Transit' },

  // Chevrolet
  'Chevrolet Corsa': { cat: '2251401', nombre: 'Corsa' },
  'Chevrolet Prisma': { cat: '2251402', nombre: 'Prisma' },
  'Chevrolet Cruze': { cat: '2251403', nombre: 'Cruze' },
  'Chevrolet Montana': { cat: '2251404', nombre: 'Montana' },
  'Chevrolet S10': { cat: '2251405', nombre: 'S10' },
  'Chevrolet Tracker': { cat: '2251406', nombre: 'Tracker' },

  // Honda
  'Honda Civic': { cat: '2251501', nombre: 'Civic' },
  'Honda Accord': { cat: '2251502', nombre: 'Accord' },
  'Honda Fit': { cat: '2251503', nombre: 'Fit' },
  'Honda City': { cat: '2251504', nombre: 'City' },
  'Honda CR-V': { cat: '2251505', nombre: 'CR-V' },

  // Renault
  'Renault Clio': { cat: '2251601', nombre: 'Clio' },
  'Renault Sandero': { cat: '2251602', nombre: 'Sandero' },
  'Renault Logan': { cat: '2251603', nombre: 'Logan' },
  'Renault Scenic': { cat: '2251604', nombre: 'Scenic' },
  'Renault Koleos': { cat: '2251605', nombre: 'Koleos' },

  // Fiat
  'Fiat 500': { cat: '2251001', nombre: '500' },
  'Fiat Uno': { cat: '2251002', nombre: 'Uno' },
  'Fiat Palio': { cat: '2251003', nombre: 'Palio' },
  'Fiat Mobi': { cat: '2251004', nombre: 'Mobi' },
  'Fiat Argo': { cat: '2251005', nombre: 'Argo' },
  'Fiat Cronos': { cat: '2251006', nombre: 'Cronos' },

  // Peugeot
  'Peugeot 208': { cat: '2251701', nombre: '208' },
  'Peugeot 307': { cat: '2251702', nombre: '307' },
  'Peugeot 408': { cat: '2251703', nombre: '408' },
  'Peugeot 2008': { cat: '2251705', nombre: '2008' },

  // Nissan
  'Nissan Versa': { cat: '2252001', nombre: 'Versa' },
  'Nissan Sentra': { cat: '2252002', nombre: 'Sentra' },
  'Nissan Frontier': { cat: '2252003', nombre: 'Frontier' },
  'Nissan Kicks': { cat: '2252004', nombre: 'Kicks' },
};

// Argumentos: tipo, marca, modelo, añoDesde, añoHasta, precioDesde, precioHasta, kmDesde, kmHasta
const args = process.argv.slice(2);
const [tipo, marca, modelo, añoDesde, añoHasta, precioDesde, precioHasta, kmDesde, kmHasta] = args;

function construirURL() {
  // Compra en SJ usa sistema de categorías (cat=)
  // Primero intenta encontrar categoria específica para marca+modelo
  // Si no, usa solo marca

  let categoryCode = null;

  // Buscar modelo específico (marca + modelo)
  if (modelo && marca) {
    const modeloKey = `${marca} ${modelo}`;
    if (MODELOS[modeloKey]) {
      categoryCode = MODELOS[modeloKey].cat;
    }
  }

  // Si no encuentra modelo, usar marca sola
  if (!categoryCode && marca && MARCAS[marca]) {
    categoryCode = MARCAS[marca];
  }

  // Si no hay marca, usar categoría de camionetas (por defecto para búsquedas genéricas)
  if (!categoryCode) {
    categoryCode = '225'; // Camionetas, Utilitarios, SUV
  }

  let url = `${BASE_URL}/b.php`;
  const params = new URLSearchParams();

  params.append('cat', categoryCode);
  params.append('estado', 'Todos');
  params.append('foto', '');
  params.append('conprecio', '');
  params.append('orden', '0');

  // Añadir filtros de precio y km si están disponibles
  if (kmDesde || kmHasta || precioDesde || precioHasta || añoDesde || añoHasta) {
    // El sitio puede no soportar estos parámetros en b.php
    // Se filtran después en scrapeAnuncio()
  }

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
      imagen_url: imagenUrl,
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
