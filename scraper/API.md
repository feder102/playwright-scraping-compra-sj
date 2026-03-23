# Scraper API Server

Servidor Express que expone endpoints para ejecutar scripts JavaScript del scraper desde OpenClaw.

## Endpoints

### 1. `POST /run` - Ejecución Síncrona
Ejecuta un script y espera a que termine. **Usa esto para scripts cortos**.

**Request:**
```json
{
  "script": "scrape_vehiculos.js",
  "args": ["--option", "value"]
}
```

**Response (éxito):**
```json
{
  "success": true,
  "exitCode": 0,
  "stdout": "...",
  "stderr": ""
}
```

**Response (error):**
```json
{
  "success": false,
  "exitCode": 1,
  "stdout": "...",
  "stderr": "Error message"
}
```

**Timeout:** 5 minutos

---

### 2. `POST /run-async` - Ejecución Asíncrona
Ejecuta un script en background y devuelve un Job ID. **Usa esto para scripts largos**.

**Request:**
```json
{
  "script": "scrape_vehiculos.js",
  "args": ["--option", "value"]
}
```

**Response:**
```json
{
  "jobId": 1,
  "status": "queued"
}
```

---

### 3. `GET /job/:id` - Estado del Job
Obtiene el estado y resultado de un job asíncrono.

**Response (en ejecución):**
```json
{
  "id": 1,
  "script": "scrape_vehiculos.js",
  "status": "running"
}
```

**Response (completado):**
```json
{
  "id": 1,
  "script": "scrape_vehiculos.js",
  "status": "success",
  "exitCode": 0,
  "stdout": "...",
  "stderr": "",
  "timestamp": "2024-03-22T10:30:00.000Z"
}
```

---

### 4. `GET /scripts` - Listar Scripts
Lista todos los scripts disponibles.

**Response:**
```json
{
  "scripts": [
    "scrape_vehiculos.js",
    "debug.js",
    "otros_script.js"
  ]
}
```

---

### 5. `GET /health` - Health Check
Verifica que el servidor está activo.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-03-22T10:30:00.000Z"
}
```

---

## Ejemplos de Uso desde OpenClaw

### Ejecutar scraper de forma síncrona (esperar resultado):
```javascript
const response = await fetch('http://scraper-api:3001/run', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    script: 'scrape_vehiculos.js'
  })
});

const result = await response.json();
console.log('Exit code:', result.exitCode);
console.log('Output:', result.stdout);
```

### Ejecutar scraper de forma asíncrona (no esperar):
```javascript
// Iniciar la ejecución
const response = await fetch('http://scraper-api:3001/run-async', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    script: 'scrape_vehiculos.js'
  })
});

const { jobId } = await response.json();

// Consultar el estado después
const statusResponse = await fetch(`http://scraper-api:3001/job/${jobId}`);
const jobStatus = await statusResponse.json();
console.log('Job status:', jobStatus.status);
```

### Listar scripts disponibles:
```javascript
const response = await fetch('http://scraper-api:3001/scripts');
const { scripts } = await response.json();
console.log('Available scripts:', scripts);
```

---

## Arquitectura

```
┌─────────────┐     Network: scraper-network      ┌──────────────┐
│  OpenClaw   │◄─────────────────────────────────►│   Scraper    │
│  Gateway    │                                    │   API Server │
│             │  POST http://scraper-api:3001/run │   (Node.js)  │
└─────────────┘                                    └──────────────┘
                                                   │
                                                   ├─ scrape_vehiculos.js
                                                   ├─ debug.js
                                                   └─ otros_script.js
```

---

## Inicio

### 1. Levantar el contenedor del scraper:
```bash
cd /home/lorenzo/Fede/playwright-scraping-compra-sj/scraper
docker-compose up -d
```

### 2. Verificar que está corriendo:
```bash
curl http://localhost:3001/health
```

### 3. Listar scripts disponibles:
```bash
curl http://localhost:3001/scripts
```

---

## Notas de Seguridad

- Los scripts se ejecutan solo desde el directorio `/app` (sandbox)
- No es posible acceder a archivos fuera del directorio del scraper
- Timeout de 5 min para `/run` y 30 min para `/run-async`
- Los jobs asíncrónos se guardan en memoria (se pierden si reinicia el servidor)

---

## Creando nuevos scripts

Solo copia un archivo `.js` al directorio del scraper y aparecerá automáticamente en `/scripts`.

Ejemplo:
```bash
# Crear un nuevo script
cat > /home/lorenzo/Fede/playwright-scraping-compra-sj/scraper/mi_script.js << 'EOF'
console.log('Hola desde mi_script.js');
EOF

# Ejecutarlo
curl -X POST http://localhost:3001/run \
  -H 'Content-Type: application/json' \
  -d '{"script": "mi_script.js"}'
```
