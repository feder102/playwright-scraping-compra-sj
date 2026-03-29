const fs = require('fs');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const SCRAPER_OUTPUT = process.env.SCRAPER_OUTPUT;

if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
  console.error('Error: TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID no configurados');
  process.exit(1);
}

async function sendPhotoToTelegram(imageUrl, caption) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        photo: imageUrl,
        caption: caption,
        parse_mode: 'HTML',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Telegram API error: ${JSON.stringify(error)}`);
    }

    return true;
  } catch (error) {
    console.error('❌ Error enviando foto a Telegram:', error.message);
    return false;
  }
}

async function sendMessageToTelegram(message) {
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

    return true;
  } catch (error) {
    console.error('❌ Error enviando mensaje a Telegram:', error.message);
    return false;
  }
}

function formatCaption(anuncio) {
  const titulo = anuncio.titulo
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .slice(0, 100);
  const categoria = anuncio.categoria || 'N/A';
  const url = anuncio.url.replace(/</g, '&lt;').replace(/>/g, '&gt;');

  let caption = `<b>${titulo}</b>\n`;
  caption += `📂 <i>${categoria}</i>\n`;
  caption += `<a href="${url}">🔗 Ver anuncio</a>`;

  return caption;
}

async function main() {
  try {
    if (!SCRAPER_OUTPUT) {
      console.error('Error: SCRAPER_OUTPUT vacío o no configurado');
      process.exit(1);
    }

    // Extraer JSON del output (puede estar precedido por logs)
    let jsonData = null;

    // Buscar el array JSON (comienza con [ seguido de whitespace/newline y {)
    const jsonMatch = SCRAPER_OUTPUT.match(/\[\s*\{[\s\S]*\]\s*$/);

    if (jsonMatch) {
      try {
        jsonData = JSON.parse(jsonMatch[0]);
      } catch (e) {
        console.error('Error al parsear JSON:', e.message);
        // Intentar un segundo método: buscar desde [ más cercano al final
        try {
          const lastBracket = SCRAPER_OUTPUT.lastIndexOf('[');
          if (lastBracket !== -1) {
            const jsonStr = SCRAPER_OUTPUT.substring(lastBracket);
            jsonData = JSON.parse(jsonStr);
          }
        } catch (e2) {
          // No se pudo parsear
        }
      }
    }

    if (!jsonData || !Array.isArray(jsonData)) {
      console.error('Error: No se pudo parsear el JSON del scraper');
      console.error('Output recibido:', SCRAPER_OUTPUT.slice(0, 200));

      // Intentar enviar mensaje de error a Telegram
      if (SCRAPER_OUTPUT.includes('Error') || SCRAPER_OUTPUT.includes('Timeout')) {
        const now = new Date();
        const dateStr = now.toLocaleDateString('es-AR');
        const timeStr = now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

        const errorMsg = `❌ <b>Error en scraper</b>\n${dateStr} ${timeStr}\n\n`;
        const errorDetail = SCRAPER_OUTPUT.substring(0, 300);
        await sendMessageToTelegram(errorMsg + errorDetail);
      }

      process.exit(1);
    }

    console.log(`✅ Scraper encontró ${jsonData.length} anuncios`);

    // Si no hay anuncios, enviar mensaje informativo
    if (jsonData.length === 0) {
      const now = new Date();
      const dateStr = now.toLocaleDateString('es-AR');
      const timeStr = now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

      const msg = `ℹ️ <b>Sin anuncios</b>\n${dateStr} ${timeStr}\n\nNo se encontraron anuncios nuevos.`;
      await sendMessageToTelegram(msg);
      console.log('✅ Notificación completada (sin anuncios)');
      return;
    }

    // Enviar mensaje de resumen
    const now = new Date();
    const dateStr = now.toLocaleDateString('es-AR');
    const timeStr = now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

    let summary = `🕐 <b>Scrape compraensanjuan.com</b>\n`;
    summary += `${dateStr} ${timeStr}\n\n`;
    summary += `📦 <b>${jsonData.length} anuncios encontrados</b>\n\n`;

    await sendMessageToTelegram(summary);

    // Enviar cada anuncio con su imagen (máximo 10 para no saturar)
    const limit = Math.min(10, jsonData.length);
    for (let i = 0; i < limit; i++) {
      const anuncio = jsonData[i];
      const caption = formatCaption(anuncio);

      if (anuncio.imagen_url) {
        await sendPhotoToTelegram(anuncio.imagen_url, caption);
      } else {
        await sendMessageToTelegram(`${i + 1}. ${caption}`);
      }

      // Pequeño delay para no saturar la API
      await new Promise(r => setTimeout(r, 300));
    }

    if (jsonData.length > limit) {
      const footer = `<i>... y ${jsonData.length - limit} anuncios más</i>`;
      await sendMessageToTelegram(footer);
    }

    console.log('✅ Notificación completada');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
