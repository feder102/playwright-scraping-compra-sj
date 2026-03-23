"""
Scraper para compraensanjuan.com - Categoría Camionetas, Utilitarios, SUV
Guarda los datos en Supabase
"""

import asyncio
import re
from datetime import datetime
from playwright.async_api import async_playwright

# Supabase
from supabase import create_client, Client

SUPABASE_URL = "https://rwauwtqeywzzjonycipf.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3YXV3dHFleXd6empvbnljaXBmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzkyODg1OSwiZXhwIjoyMDg5NTA0ODU5fQ.y0EpBD24tXv3M-aeO5yp57dyj8vUSkz0MSrEy3xS4Mc"

BASE_URL = "https://www.compraensanjuan.com"
CATEGORIA_URL = f"{BASE_URL}/b.php?cat=225&orden=QueDes,fchact"

def extraer_precio(texto):
    """Extrae precio numérico del texto"""
    match = re.search(r'[\d,\.]+', texto.replace('.', '').replace(',', '.'))
    return float(match.group()) if match else None

def extraer_anio(texto):
    """Extrae año del texto"""
    match = re.search(r'Año:?(\d{4})', texto, re.IGNORECASE)
    return int(match.group(1)) if match else None

def extraer_km(texto):
    """Extrae kilómetros"""
    match = re.search(r'Kilómetros?[:\s]*([\d\.]+)', texto, re.IGNORECASE)
    return int(match.group(1).replace('.', '')) if match else None

async def scrape_anuncio(page, url):
    """Scrapea un anuncio individual"""
    try:
        await page.goto(url, timeout=30000)
        await page.wait_for_load_state('domcontentloaded')
        
        # Extraer datos
        titulo = await page.title()
        
        # Precio
        precio_elem = await page.query_selector('h3:has-text("$")')
        precio = await precio_elem.inner_text() if precio_elem else None
        precio_num = extraer_precio(precio) if precio else None
        
        # Características
        caracteristicas = {}
        lines = await page.query_selector_all('div.col-md-6, td')
        for line in lines:
            text = await line.inner_text()
            if ':' in text:
                key, value = text.split(':', 1)
                caracteristicas[key.strip()] = value.strip()
        
        # Descripción
        desc_elem = await page.query_selector('div.col-md-8')
        descripcion = await desc_elem.inner_text() if desc_elem else ""
        
        # Extraer campos específicos
        marca = caracteristicas.get('Marca', '')
        modelo = caracteristicas.get('Modelo', '')
        version = caracteristicas.get('Version', '')
        anio = extraer_anio(caracteristicas.get('Año', ''))
        km = extraer_km(caracteristicas.get('Kilómetros', ''))
        color = caracteristicas.get('Color', '')
        combustible = caracteristicas.get('Combustible', '')
        estado = caracteristicas.get('Estado', '')
        
        return {
            'titulo': titulo,
            'url': url,
            'precio': precio_num,
            'marca': marca,
            'modelo': modelo,
            'version': version,
            'anio': anio,
            'kilometros': km,
            'color': color,
            'combustible': combustible,
            'estado': estado,
            'descripcion': descripcion[:500] if descripcion else None,
            'categoria': 'Camionetas, Utilitarios, SUV',
            'scraped_at': datetime.now().isoformat()
        }
    except Exception as e:
        print(f"Error scrapeando {url}: {e}")
        return None

async def scrape_categoria(max_anuncios=50):
    """Scrapea los anuncios de la categoría"""
    print("Iniciando scraper...")
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()
        page = await context.new_page()
        
        # Obtener lista de anuncios
        print("Obteniendo lista de anuncios...")
        await page.goto(CATEGORIA_URL, timeout=30000)
        await page.wait_for_load_state('domcontentloaded')
        
        # Encontrar enlaces de anuncios
        enlaces = await page.query_selector_all('a[href*="/anuncio_ve/"]')
        urls = []
        for enlace in enlaces[:max_anuncios]:
            href = await enlace.get_attribute('href')
            if href and '/anuncio_ve/' in href:
                full_url = BASE_URL + href if href.startswith('/') else href
                if full_url not in urls:
                    urls.append(full_url)
        
        print(f"Encontrados {len(urls)} anuncios")
        
        # Scrapear cada anuncio
        resultados = []
        for i, url in enumerate(urls):
            print(f"Scripeando {i+1}/{len(urls)}: {url}")
            resultado = await scrape_anuncio(page, url)
            if resultado:
                resultados.append(resultado)
        
        await browser.close()
        
    return resultados

def guardar_en_supabase(datos):
    """Guarda los datos en Supabase"""
    print("Guardando en Supabase...")
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    # Insertar datos
    for item in datos:
        try:
            response = supabase.table('compra_ensanjuan').insert(item).execute()
            print(f"Guardado: {item['titulo'][:50]}...")
        except Exception as e:
            print(f"Error guardando {item.get('titulo', '?')}: {e}")

async def main():
    # Scrpar
    resultados = await scrape_categoria(max_anuncios=20)
    
    if resultados:
        print(f"\nTotal scrapeados: {len(resultados)}")
        
        # Guardar en Supabase
        guardar_en_supabase(resultados)
        
        # Mostrar resumen
        for r in resultados[:5]:
            print(f"- {r['marca']} {r['modelo']} {r.get('anio', '')}: ${r.get('precio', 'N/A')}")
    else:
        print("No se encontraron resultados")

if __name__ == "__main__":
    asyncio.run(main())
