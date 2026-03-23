# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This repository contains a **Playwright-based web scraper** for vehicle listings from compraensanjuan.com (an Argentine classified ads site). The active development is in the `/scraper` directory. The `/NodeJS` and `/Python` folders are educational examples from a tutorial showing Playwright usage patterns in both languages.

### Main Scraper
- **File**: `scraper/scrape_vehiculos.js`
- **Purpose**: Scrapes vehicle listings from the "Camionetas, Utilitarios, SUV" category and stores them in Supabase
- **Target URL**: `https://www.compraensanjuan.com/b.php?cat=225&orden=QueDes,fchact`

## Architecture

The scraper follows a two-stage pattern:

1. **Category Listing Stage** (`scrapeCategoria`)
   - Navigates to the category page
   - Extracts all listing links (`/anuncio_ve/` URLs) using `$$eval`
   - Deduplicates URLs and limits to specified count (default 20)

2. **Individual Listing Stage** (`scrapeAnuncio`)
   - Visits each listing URL
   - Extracts structured vehicle data:
     - Basic info: title, price, URL
     - Vehicle specs: marca (brand), modelo, version, año (year), kilometros, color, combustible, estado
     - Full description (truncated to 500 chars)
   - Uses helper functions to parse year, km, and price from text

3. **Data Persistence** (`guardarEnSupabase`)
   - Inserts each record into the `compra_ensanjuan` table
   - Logs errors per-item
   - Records scraped timestamp with each insertion

## Running the Scraper

### Setup
```bash
cd scraper
npm install
```

### Run the Scraper
```bash
node scraper/scrape_vehiculos.js
```

The default configuration scrapes 20 listings. To modify this, edit the `maxAnuncios` parameter in the `main()` function.

### Key Configuration
- **Supabase Credentials**: Hardcoded in `scrape_vehiculos.js` (lines 9-10)
  - `SUPABASE_URL` and `SUPABASE_KEY`
  - These connect to the `compra_ensanjuan` table
- **Target Database**: Supabase project at `rwauwtqeywzzjonycipf.supabase.co`

## Development Notes

### Playwright Patterns
- Uses headless Chromium browser
- Waits for `domContentLoaded` before scraping (not just navigation)
- Uses `$$eval` to extract multiple elements with map/filter
- CSS `:has-text()` pseudo-selector for finding price element
- Timeout: 30 seconds per page load

### Data Extraction
- **Price parsing** (`extraerPrecio`): Removes thousands separators (`.`), converts comma to decimal, extracts numeric value
- **Year parsing** (`extraerAnio`): Uses regex to find 4-digit year after "Año:" label
- **Kilometers parsing** (`extraerKm`): Finds numeric value, removes separators

### Important Implementation Details
1. **CSS Selector for characteristics**: The scraper looks for `td` elements and parses key-value pairs split by `:`
2. **Description extraction**: Uses `div.col-md-8` selector; fails gracefully if not present
3. **Error handling**: Try-catch wraps both scraping and Supabase operations; null returns on scrape error, logged console errors on DB errors
4. **URL deduplication**: Uses Set to avoid duplicate listings

## Educational Examples

The `/NodeJS` and `/Python` directories contain example scripts organized by feature:
- `basics/`: Browser launch, headless vs headful, multiple tabs
- `scraping/`: Text/link/image extraction, shadow DOM, waiting strategies
- `selectors/`: CSS, XPath, role, and text-based selectors
- `interactions/`: Click, fill, dropdown, hover, pagination, infinite scroll
- `data/`: Saving JSON/CSV/PDF, screenshots, file downloads
- `auth/`: Basic auth, cookie management
- `browser/`: User agents, proxies, device emulation
- `debug/`: Video/trace recording, pausing, console inspection
- `errors/`: Retry patterns

These can be run independently and serve as references for Playwright patterns.

## Common Modifications

### Change Target Category
Edit `CATEGORIA_URL` in `scrape_vehiculos.js` to target a different category ID:
```javascript
const CATEGORIA_URL = `${BASE_URL}/b.php?cat=XXX&orden=QueDes,fchact`;
```

### Adjust Number of Listings
Modify the call to `scrapeCategoria()` in `main()`:
```javascript
const resultados = await scrapeCategoria(50);  // scrape 50 instead of 20
```

### Extend Data Fields
1. Add new helper functions if parsing is needed (like `extraerPrecio`, `extraerAnio`)
2. Add new property extractions to the `caracteristicas` object in `scrapeAnuncio`
3. Add the field to the returned object and database insert

## Debugging

### Headless Mode
Change `headless: true` to `headless: false` in `scrapeCategoria()` to watch the browser in action.

### Page Inspection
Add `await page.pause()` before critical scraping steps to inspect the DOM in Playwright Inspector.

### Console Logging
Existing logs show:
- Script initialization
- Progress during category listing extraction
- Progress during individual listing scrapes
- Supabase insertion results

Additional `console.log()` calls can be added to debug selector matching or data extraction.
