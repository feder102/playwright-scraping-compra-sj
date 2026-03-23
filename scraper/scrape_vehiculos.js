/**
 * Scraper para compraensanjuan.com - Categoría Camionetas, Utilitarios, SUV
 * Guarda los datos en Supabase
 */

const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://rwauwtqeywzzjonycipf.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3YXV3dHFleXd6empvbnljaXBmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzkyODg1OSwiZXhwIjoyMDg5NTA0ODU5fQ.y0EpBD24tXv3M-aeO5yp57dyj8vUSkz0MSrEy3xS4Mc";

const BASE_URL = "https://www.compraensanjuan.com";
const CATEGORIA_URL = `${BASE_URL}/b.php?cat=225&orden=QueDes,fchact`;

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
        
        // Título
        const titulo = await page.title();
        
        // Precio
        const precioElem = await page.$('h3:has-text("$")');
        const precioTexto = precioElem ? await precioElem.innerText() : null;
        const precio = extraerPrecio(precioTexto);
        
        // Características - buscar en la página
        const caracteristicas = {};
        const lineas = await page.$$eval('td', tds => tds.map(td => td.innerText).filter(t => t.includes(':')));
        
        for (const linea of lineas) {
            const [key, ...valueParts] = linea.split(':');
            if (key && valueParts.length > 0) {
                caracteristicas[key.trim()] = valueParts.join(':').trim();
            }
        }
        
        // Descripción
        const descripcion = await page.$eval('div.col-md-8', el => el.innerText).catch(() => '');
        
        // Extraer campos
        const marca = caracteristicas['Marca'] || '';
        const modelo = caracteristicas['Modelo'] || '';
        const version = caracteristicas['Version'] || '';
        const anio = extraerAnio(caracteristicas['Año'] || '');
        const km = extraerKm(caracteristicas['Kilómetros'] || '');
        const color = caracteristicas['Color'] || '';
        const combustible = caracteristicas['Combustible'] || '';
        const estado = caracteristicas['Estado'] || '';
        
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
            categoria: 'Camionetas, Utilitarios, SUV',
            scraped_at: new Date().toISOString()
        };
    } catch (e) {
        console.error(`Error scrapeando ${url}: ${e.message}`);
        return null;
    }
}

async function scrapeCategoria(maxAnuncios = 50) {
    console.log("Iniciando scraper...");
    
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Obtener lista de anuncios
    console.log("Obteniendo lista de anuncios...");
    await page.goto(CATEGORIA_URL, { timeout: 30000 });
    await page.waitForLoadState('domcontentloaded');
    
    // Encontrar enlaces de anuncios
    const enlaces = await page.$$eval('a[href*="anuncio_ve"]', els =>
        els.map(el => el.href).filter(h => h.includes('/anuncio_ve/'))
    );
    
    // Deduplicar
    const urls = [...new Set(enlaces)].slice(0, maxAnuncios);
    
    console.log(`Encontrados ${urls.length} anuncios`);
    
    // Scrapear cada anuncio
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
                console.error(`Error guardando ${item.titulo?.substring(0, 30)}: ${error.message}`);
            } else {
                console.log(`Guardado: ${item.marca} ${item.modelo}`);
            }
        } catch (e) {
            console.error(`Error: ${e.message}`);
        }
    }
}

async function main() {
    const resultados = await scrapeCategoria(20);
    
    if (resultados.length > 0) {
        console.log(`\nTotal scrapeados: ${resultados.length}`);
        
        // Guardar en Supabase
        await guardarEnSupabase(resultados);
        
        // Mostrar resumen
        console.log('\n--- Resumen ---');
        for (const r of resultados.slice(0, 5)) {
            console.log(`- ${r.marca} ${r.modelo} ${r.anio || ''}: $${r.precio || 'N/A'}`);
        }
    } else {
        console.log("No se encontraron resultados");
    }
}

main().catch(console.error);
