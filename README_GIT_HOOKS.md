# 🔄 Git Hooks Automáticos - Scraper

## ¿Qué es?

Hooks automáticos que **reconstruyen Docker cada vez que hay cambios** en la carpeta `scraper/`.

## 🚀 Cómo Funciona

### Post-Commit Hook
Cuando haces `git commit` en archivos de `scraper/`:

```bash
git add scraper_busqueda.js
git commit -m "Mejorar búsqueda"

# Automáticamente:
# 1. Detecta cambios en scraper/
# 2. Desconecta OpenClaw
# 3. Reconstruye Docker (docker-compose build)
# 4. Levanta containers (docker-compose up -d)
# 5. Reconecta OpenClaw
# 6. Verifica salud del servicio
```

### Post-Merge Hook
Cuando haces `git pull` y hay cambios en `scraper/`:

```bash
git pull origin main

# Si hay cambios en scraper/:
# → Mismo proceso que post-commit
```

## 📁 Archivos de Hooks

- `.git/hooks/post-commit` - Se ejecuta después de cada commit
- `.git/hooks/post-merge` - Se ejecuta después de merge/pull

## ✅ Ventajas

- ✅ **Automático:** No necesitas acordarte de reconstruir
- ✅ **Seguro:** Solo reconstruye si hay cambios en scraper/
- ✅ **Rápido:** Mantiene OpenClaw conectado
- ✅ **Transparente:** Te muestra logs de qué hace

## 📊 Comportamiento

```
Tu cambio en scraper/ → Git commit → Post-commit hook ejecuta
                                    ↓
                         Detecta cambios en scraper/
                                    ↓
                         Reconstruye Docker
                                    ↓
                         ✅ Listo, cambios vivos
```

## 🔧 Configuración

Los hooks están configurados en:
- Ubicación: `.git/hooks/`
- Permisos: `+x` (ejecutables)
- Idioma: Bash

### Si quieres deshabilitarlos

```bash
# Renombra para desactivar
mv .git/hooks/post-commit .git/hooks/post-commit.disabled
mv .git/hooks/post-merge .git/hooks/post-merge.disabled

# Para reactivar
mv .git/hooks/post-commit.disabled .git/hooks/post-commit
mv .git/hooks/post-merge.disabled .git/hooks/post-merge
```

## 📝 Flujo Típico

```bash
# 1. Modificar archivo
vim scraper/scrape_busqueda.js

# 2. Hacer commit
git add scraper/scrape_busqueda.js
git commit -m "Mejorar búsqueda"

# Hook automático ejecuta:
# 🔄 Cambios detectados en scraper/
# 🐳 Reconstruyendo Docker automáticamente...
# ✅ Docker reconstruido y ejecutándose

# 3. Listo, cambios en vivo
curl http://localhost:3001/health
```

## 🚨 Si Algo Falla

### Docker no se levanta

```bash
# Ver logs
docker logs scraper-api

# Reconstruir manualmente
cd scraper
docker-compose down
docker-compose build
docker-compose up -d
```

### Hook no se ejecutó

Verifica que:
1. Archivo es ejecutable: `chmod +x .git/hooks/post-commit`
2. Cambios son en `scraper/` (no en otra carpeta)
3. Commit fue exitoso (sin errores)

## 📞 Notas

- Los hooks son locales (no se sincronizan con git)
- Si clonas el repo en otra máquina, necesitas estos hooks
- Son seguros: solo tocan `scraper/` y Docker

## 🔗 Ver También

- Documentación del scraper: [SCRAPER_PROYECTO_COMPLETO.md](../OpenClaw/workspace/SCRAPER_PROYECTO_COMPLETO.md)
- Setup de Docker: [SETUP_SCRAPER_OPENCLAW.md](../OpenClaw/workspace/SETUP_SCRAPER_OPENCLAW.md)
