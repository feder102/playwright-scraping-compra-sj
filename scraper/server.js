/**
 * Scraper API Server
 * Expone endpoints para ejecutar scripts JavaScript del scraper
 */

const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

/**
 * POST /run
 * Ejecuta un script JavaScript del scraper
 * Body: { script: "nombre_script.js", args?: [...] }
 */
app.post('/run', async (req, res) => {
  try {
    const { script, args = [] } = req.body;

    // Validar que el script existe
    if (!script) {
      return res.status(400).json({ error: 'Script name required' });
    }

    const scriptPath = path.join(__dirname, script);

    // Validar que el archivo existe
    if (!fs.existsSync(scriptPath)) {
      return res.status(404).json({ error: `Script not found: ${script}` });
    }

    // Validar que está dentro del directorio del scraper (seguridad)
    const realPath = fs.realpathSync(scriptPath);
    const scraperDir = fs.realpathSync(__dirname);
    if (!realPath.startsWith(scraperDir)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Ejecutar el script
    const child = spawn('node', [script, ...args], {
      cwd: __dirname,
      timeout: 5 * 60 * 1000, // 5 minutos máximo
    });

    let stdout = '';
    let stderr = '';
    let responseSent = false;

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (!responseSent) {
        responseSent = true;
        res.json({
          success: code === 0,
          exitCode: code,
          stdout,
          stderr,
        });
      }
    });

    // Timeout
    setTimeout(() => {
      if (!responseSent) {
        responseSent = true;
        child.kill();
        res.status(408).json({
          error: 'Script execution timeout',
          stdout,
          stderr,
        });
      }
    }, 5 * 60 * 1000);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /run-async
 * Ejecuta un script de forma asíncrona (devuelve job ID)
 * Body: { script: "nombre_script.js", args?: [...] }
 */
const jobs = new Map();
let jobId = 0;

app.post('/run-async', (req, res) => {
  try {
    const { script, args = [] } = req.body;

    if (!script) {
      return res.status(400).json({ error: 'Script name required' });
    }

    const scriptPath = path.join(__dirname, script);
    if (!fs.existsSync(scriptPath)) {
      return res.status(404).json({ error: `Script not found: ${script}` });
    }

    const realPath = fs.realpathSync(scriptPath);
    const scraperDir = fs.realpathSync(__dirname);
    if (!realPath.startsWith(scraperDir)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const id = ++jobId;

    // Crear entrada en el Map INMEDIATAMENTE
    let jobData = { id, script, status: 'running', exitCode: null, stdout: '', stderr: '', timestamp: new Date() };
    jobs.set(id, jobData);

    const child = spawn('node', [script, ...args], {
      cwd: __dirname,
      timeout: 30 * 60 * 1000, // 30 minutos máximo
    });

    child.stdout?.on('data', (data) => {
      jobData.stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      jobData.stderr += data.toString();
    });

    child.on('close', (code) => {
      jobData.status = code === 0 ? 'success' : 'failed';
      jobData.exitCode = code;
    });

    res.json({ jobId: id, status: 'running' });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /job/:id
 * Obtiene el estado de un job asíncrono
 */
app.get('/job/:id', (req, res) => {
  const job = jobs.get(parseInt(req.params.id));
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  res.json(job);
});

/**
 * GET /scripts
 * Lista todos los scripts disponibles
 */
app.get('/scripts', (req, res) => {
  try {
    const files = fs.readdirSync(__dirname);
    const scripts = files.filter(f => f.endsWith('.js') && f !== 'server.js');
    res.json({ scripts });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /health
 * Health check
 */
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

app.listen(PORT, () => {
  console.log(`🚀 Scraper API Server running on port ${PORT}`);
  console.log(`📝 Available endpoints:`);
  console.log(`   POST /run - Execute script synchronously`);
  console.log(`   POST /run-async - Execute script asynchronously`);
  console.log(`   GET /job/:id - Check async job status`);
  console.log(`   GET /scripts - List available scripts`);
  console.log(`   GET /health - Health check`);
});
