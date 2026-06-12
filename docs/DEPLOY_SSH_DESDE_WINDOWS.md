# Deploy por SSH desde Windows

Guía operativa para desplegar SofIA desde este equipo hacia el servidor Docker.

## Datos del entorno

- Proyecto local: `C:\Proyectos 2026\sofia\chatIA`
- Servidor: `192.168.8.39`
- Usuario SSH: `admin`
- Ruta remota: `/home/admin/deploys/chatIA`
- Llave PuTTY PPK: `C:\Users\chano\OneDrive\Documentos\ssh\ProxmoxDIFZ2025.ppk`
- URL app: `http://192.168.8.39:5000`
- Compose remoto: `docker compose`

El alias `infra-ia-docker` puede existir en PuTTY o en otra máquina, pero desde este equipo se validó el deploy usando la IP `192.168.8.39`.

## Herramientas requeridas

En este equipo deben existir:

- `git`
- `npm`
- PuTTY:
  - `C:\Program Files\PuTTY\plink.exe`
  - `C:\Program Files\PuTTY\pscp.exe`

Verificación rápida:

```powershell
where.exe git
where.exe plink
where.exe pscp
```

## Flujo recomendado

1. Trabajar en una rama de integración.
2. Validar localmente.
3. Hacer commit y push.
4. Conectarse al servidor por SSH.
5. Actualizar el repo remoto.
6. Reconstruir la imagen Docker.
7. Levantar la app.
8. Si cambió la base de conocimiento, importar JSONL con backup.
9. Validar health, rutas principales y RAG.

## Comandos locales previos

Desde `C:\Proyectos 2026\sofia\chatIA`:

```powershell
npm run check
npm run eval:jsonl-import
npm run eval:rag
npm run build
git status --short
git add .
git commit -m "mensaje del cambio"
git push
```

Si solo se despliega un cambio ya commiteado, basta con confirmar:

```powershell
git status --short
git rev-parse --short HEAD
```

## Conexión SSH

Comando base:

```powershell
& 'C:\Program Files\PuTTY\plink.exe' -batch -i 'C:\Users\chano\OneDrive\Documentos\ssh\ProxmoxDIFZ2025.ppk' admin@192.168.8.39 "cd ~/deploys/chatIA && docker compose ps"
```

Validación inicial recomendada:

```powershell
& 'C:\Program Files\PuTTY\plink.exe' -batch -i 'C:\Users\chano\OneDrive\Documentos\ssh\ProxmoxDIFZ2025.ppk' admin@192.168.8.39 "cd ~/deploys/chatIA && pwd && git branch --show-current && git status --short && docker compose ps"
```

## Deploy de código

Actualizar el servidor a la rama actual desplegada:

```powershell
& 'C:\Program Files\PuTTY\plink.exe' -batch -i 'C:\Users\chano\OneDrive\Documentos\ssh\ProxmoxDIFZ2025.ppk' admin@192.168.8.39 "cd ~/deploys/chatIA && git pull --ff-only && docker compose build app && docker compose up -d app && sleep 20 && docker compose ps"
```

Para cambiar a una rama nueva:

```powershell
& 'C:\Program Files\PuTTY\plink.exe' -batch -i 'C:\Users\chano\OneDrive\Documentos\ssh\ProxmoxDIFZ2025.ppk' admin@192.168.8.39 "cd ~/deploys/chatIA && git fetch origin nombre-rama && git switch nombre-rama && git pull --ff-only && docker compose build app && docker compose up -d app"
```

Ejemplo usado en integración JSONL:

```powershell
& 'C:\Program Files\PuTTY\plink.exe' -batch -i 'C:\Users\chano\OneDrive\Documentos\ssh\ProxmoxDIFZ2025.ppk' admin@192.168.8.39 "cd ~/deploys/chatIA && git fetch origin integracion-kb-jsonl-sofia && git switch integracion-kb-jsonl-sofia && git pull --ff-only && docker compose build app && docker compose up -d app"
```

## Importar KB JSONL en producción

Solo ejecutar cuando se requiera reemplazar la base de conocimiento del chatbot.

Este comando crea backup, purga la KB del `chatbotId=1` e importa master + trámites/servicios:

```powershell
& 'C:\Program Files\PuTTY\plink.exe' -batch -i 'C:\Users\chano\OneDrive\Documentos\ssh\ProxmoxDIFZ2025.ppk' admin@192.168.8.39 "cd ~/deploys/chatIA && docker compose exec -T app npm run import:sofia-kb -- --chatbotId=1 --backup --purge --files=master,tramitesservicios"
```

Después de importar, copiar el backup fuera del contenedor:

```powershell
& 'C:\Program Files\PuTTY\plink.exe' -batch -i 'C:\Users\chano\OneDrive\Documentos\ssh\ProxmoxDIFZ2025.ppk' admin@192.168.8.39 "cd ~/deploys/chatIA && mkdir -p backups/knowledge-base && docker cp chatia-app-1:/app/backups/knowledge-base/NOMBRE_BACKUP.json backups/knowledge-base/NOMBRE_BACKUP.json"
```

Ejemplo real generado:

```text
~/deploys/chatIA/backups/knowledge-base/chatbot-1-20260612-181449.json
```

## Validaciones post-deploy

Health y rutas principales:

```powershell
& 'C:\Program Files\PuTTY\plink.exe' -batch -i 'C:\Users\chano\OneDrive\Documentos\ssh\ProxmoxDIFZ2025.ppk' admin@192.168.8.39 "curl -fsS http://127.0.0.1:5000/api/health && curl -fsSI http://127.0.0.1:5000/analytics | head -n 1 && curl -fsSI http://127.0.0.1:5000/chatbots/1/preview | head -n 1"
```

Validar KB:

```powershell
& 'C:\Program Files\PuTTY\plink.exe' -batch -i 'C:\Users\chano\OneDrive\Documentos\ssh\ProxmoxDIFZ2025.ppk' admin@192.168.8.39 "cd ~/deploys/chatIA && docker compose exec -T app npm run eval:jsonl-import"
```

Validar RAG:

```powershell
& 'C:\Program Files\PuTTY\plink.exe' -batch -i 'C:\Users\chano\OneDrive\Documentos\ssh\ProxmoxDIFZ2025.ppk' admin@192.168.8.39 "cd ~/deploys/chatIA && docker compose exec -T app npm run eval:rag"
```

Revisar logs:

```powershell
& 'C:\Program Files\PuTTY\plink.exe' -batch -i 'C:\Users\chano\OneDrive\Documentos\ssh\ProxmoxDIFZ2025.ppk' admin@192.168.8.39 "cd ~/deploys/chatIA && docker compose logs --tail=80 app"
```

## Rollback básico

Si el problema es de código:

```powershell
& 'C:\Program Files\PuTTY\plink.exe' -batch -i 'C:\Users\chano\OneDrive\Documentos\ssh\ProxmoxDIFZ2025.ppk' admin@192.168.8.39 "cd ~/deploys/chatIA && git log --oneline -5"
```

Después seleccionar el commit estable y reconstruir:

```powershell
& 'C:\Program Files\PuTTY\plink.exe' -batch -i 'C:\Users\chano\OneDrive\Documentos\ssh\ProxmoxDIFZ2025.ppk' admin@192.168.8.39 "cd ~/deploys/chatIA && git switch nombre-rama-estable && git pull --ff-only && docker compose build app && docker compose up -d app"
```

Si el problema es la KB, restaurar desde el backup guardado. El importador actual crea backups JSON, pero la restauración debe hacerse con un script específico o una importación controlada según el formato del backup.

## Notas importantes

- No editar `.env` en deploy normal; se conservan las credenciales existentes en el servidor.
- `docker compose up -d app` ejecuta en arranque:
  - `npm run db:push`
  - `npm run seed:current`
  - `npm start`
- Para importar JSONL dentro del contenedor, el `Dockerfile` debe incluir `jsonl`, `server`, `script`, `shared`, `seed` y `tsconfig.json`.
- Antes de purgar KB en producción, confirmar que el backup fue creado correctamente.
- Después de cada deploy, validar `/api/health`, `/analytics`, `/chatbots/1/preview` y `eval:rag`.
