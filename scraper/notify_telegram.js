const fs = require('fs');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const SCRAPER_OUTPUT = process.env.SCRAPER_OUTPUT;

if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
  console.error('Error: TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID no configurados');
  process.exit(1);
}

async function sendToTelegram(message) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'HTML',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Telegram API error: ${JSON.stringify(error)}`);
    }

    console.log('✅ Mensaje enviado a Telegram');
  } catch (error) {
    console.error('❌ Error enviando a Telegram:', error.message);
    process.exit(1);
  }
}

function formatMessage(anuncios) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('es-AR');
  const timeStr = now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

  let message = `🕐 <b>Scrape compraensanjuan.com</b>\n${dateStr} ${timeStr}\n\n`;
  message += `📦 <b>${anuncios.length} anuncios encontrados</b>\n\n`;

  // Limitar a 20 para no exceder límites de Telegram
  const listado = anuncios.slice(0, 20);

  listado.forEach((anuncio, idx) => {
    const titulo = anuncio.titulo
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .slice(0, 50);
    const categoria = anuncio.categoria || 'N/A';
    const url = anuncio.url.replace(/</g, '&lt;').replace(/>/g, '&gt;');

    message += `${idx + 1}. <b>${titulo}</b> <i>(${categoria})</i>\n`;
    message += `   <a href="${url}">🔗 Ver anuncio</a>\n\n`;
  });

  if (anuncios.length > 20) {
    message += `<i>... y ${anuncios.length - 20} más</i>`;
  }

  return message;
}

async function main() {
  try {
    if (!SCRAPER_OUTPUT) {
      console.error('Error: SCRAPER_OUTPUT vacío o no configurado');
      process.exit(1);
    }

    // Extraer la última línea que debería ser el JSON
    const lines = SCRAPER_OUTPUT.trim().split('\n');
    let jsonData = null;

    // Buscar la primera línea que comienza con '[' (array JSON)
    for (const line of lines) {
      if (line.trim().startsWith('[')) {
        try {
          jsonData = JSON.parse(line);
          break;
        } catch (e) {
          // Continuar buscando
        }
      }
    }

    if (!jsonData || !Array.isArray(jsonData)) {
      console.error('Error: No se pudo parsear el JSON del scraper');
      console.error('Output recibido:', SCRAPER_OUTPUT.slice(0, 200));
      process.exit(1);
    }

    const message = formatMessage(jsonData);
    await sendToTelegram(message);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
