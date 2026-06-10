# Guia De Deploy En Proxmox

Esta guia describe un despliegue recomendado de SofIA ChatIA en Proxmox usando una VM Linux con Docker Compose.

## Arquitectura Recomendada

```text
Proxmox
└── VM Ubuntu Server / Debian
    ├── Docker
    ├── Docker Compose
    ├── App SofIA ChatIA
    ├── PostgreSQL + pgvector
    └── Volumenes persistentes
```

Servicios incluidos por `docker-compose.yml`:

- `app`: aplicacion Node/React/Express.
- `db`: PostgreSQL con pgvector.
- `postgres_data`: volumen de base de datos.
- `app_uploads`: volumen de archivos subidos, incluidos PDFs nuevos.

## Requisitos De La VM

Minimo recomendado para pruebas:

- 2 vCPU
- 4 GB RAM
- 40 GB disco
- Ubuntu Server 24.04 LTS o Debian 12

Recomendado para produccion inicial:

- 4 vCPU
- 8 GB RAM
- 80 GB disco o mas
- IP fija en la red
- Backups habilitados desde Proxmox

## Crear VM En Proxmox

1. Crear una VM nueva.
2. Usar ISO de Ubuntu Server o Debian.
3. Asignar CPU, RAM y disco.
4. Configurar red con bridge, normalmente `vmbr0`.
5. Instalar sistema operativo.
6. Configurar IP fija o reserva DHCP.

Ejemplo de IP:

```text
192.168.8.90
```

## Preparar El Servidor

Entrar por SSH:

```bash
ssh usuario@192.168.8.90
```

Actualizar paquetes:

```bash
sudo apt update
sudo apt upgrade -y
```

Instalar utilidades:

```bash
sudo apt install -y ca-certificates curl git ufw
```

## Instalar Docker

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
```

Cerrar sesion y volver a entrar por SSH.

Validar:

```bash
docker --version
docker compose version
```

## Clonar El Proyecto

```bash
git clone https://github.com/AlanMora/chatIA.git
cd chatIA
git checkout desarrollo-agente-profesional-gob
```

## Configurar Variables De Entorno

Crear `.env` desde el ejemplo:

```bash
cp .env.example .env
nano .env
```

Valores minimos a configurar:

```env
NODE_ENV=production
PORT=5000
APP_PORT=5000

POSTGRES_USER=chatbot
POSTGRES_PASSWORD=CAMBIAR_PASSWORD_SEGURO
POSTGRES_DB=chatbot

JWT_SECRET=CAMBIAR_SECRET_SEGURO
SESSION_SECRET=CAMBIAR_SECRET_SEGURO

AI_INTEGRATIONS_OPENAI_API_KEY=
OPENAI_EMBEDDING_API_KEY=

EMBEDDING_PROVIDER=openai
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
OPENAI_EMBEDDING_DIMENSIONS=1536
```

Generar secrets:

```bash
openssl rand -hex 32
openssl rand -hex 32
```

Si se usara Ollama remoto para embeddings:

```env
EMBEDDING_PROVIDER=ollama
OLLAMA_EMBEDDING_BASE_URL=http://192.168.8.82:11434
OLLAMA_EMBEDDING_MODEL=nomic-embed-text
```

Para este proyecto actualmente se recomienda OpenAI embeddings a 1536 dimensiones.

## Levantar El Sistema

Construir y arrancar:

```bash
docker compose up -d --build
```

Ver logs:

```bash
docker compose logs -f app
```

Validar servicios:

```bash
docker compose ps
curl http://localhost:5000/api/health
```

Respuesta esperada:

```json
{"ok":true,"service":"sofia-chatia","timestamp":"..."}
```

Abrir en navegador:

```text
http://192.168.8.90:5000
```

## Que Hace El Arranque

El servicio `app` ejecuta:

```bash
npm run db:push
npm run seed:current
npm start
```

Esto:

- Sincroniza tablas con Drizzle.
- Aplica el seed de configuracion actual.
- Inicia la aplicacion.

El seed incluye:

- Usuario institucional.
- Chatbot SofIA.
- Prompt, descripcion y bienvenida.
- Modelos y embeddings.
- Skills/tools.
- Capacidades activadas.

No incluye API keys privadas.

## Firewall

Permitir SSH y puerto de la app:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 5000/tcp
sudo ufw enable
sudo ufw status
```

Si se usara Nginx/SSL despues, exponer solo:

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

## Actualizar Version

Entrar al servidor:

```bash
cd chatIA
git fetch origin
git checkout desarrollo-agente-profesional-gob
git pull
docker compose up -d --build
```

Verificar:

```bash
docker compose logs -f app
curl http://localhost:5000/api/health
```

## Backups

### Backup Desde Proxmox

Configurar backup programado de la VM completa desde Proxmox.

Recomendado:

- Diario.
- Retencion minima: 7 dias.
- Incluir la VM completa.

### Backup Manual De Base De Datos

```bash
docker compose exec db pg_dump -U chatbot chatbot > backup-sofia-$(date +%F).sql
```

Restaurar:

```bash
cat backup-sofia-YYYY-MM-DD.sql | docker compose exec -T db psql -U chatbot -d chatbot
```

### Backup De Uploads

Los archivos cargados viven en el volumen `app_uploads`.

Para copiar volumenes se recomienda usar backup de VM en Proxmox o una tarea externa con `rsync`.

## Revisar Estado

Contenedores:

```bash
docker compose ps
```

Logs app:

```bash
docker compose logs -f app
```

Logs base de datos:

```bash
docker compose logs -f db
```

Uso de recursos:

```bash
docker stats
```

## Problemas Comunes

### La app no arranca

Revisar logs:

```bash
docker compose logs app
```

Validar `.env`:

```bash
cat .env
```

Revisar que existan:

- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_DB`
- `JWT_SECRET`
- `SESSION_SECRET`
- `OPENAI_EMBEDDING_API_KEY` si se usan embeddings OpenAI

### Error De Embeddings

Si usa OpenAI:

- Validar API key.
- Validar que el modelo sea `text-embedding-3-small`.
- Validar dimension `1536`.

Si usa Ollama:

```bash
curl http://192.168.8.82:11434/api/tags
```

### No Se Ven PDFs Cargados Antes

La visualizacion de PDFs aplica para archivos cargados despues de la version que guarda archivo fisico.

Los PDFs anteriores pueden tener texto extraido, pero no archivo asociado.

### Puerto Ocupado

Cambiar `APP_PORT` en `.env`:

```env
APP_PORT=5001
```

Reiniciar:

```bash
docker compose up -d
```

## Recomendaciones Para Produccion

Antes de exponer a internet:

- Agregar Nginx o proxy reverso.
- Configurar SSL con Let's Encrypt.
- Cifrar API keys en base de datos.
- Definir roles administrativos.
- Configurar backups automaticos.
- Monitorear logs y uso de recursos.
- Restringir acceso al panel administrativo.
- No publicar `.env`.

## Checklist De Deploy

- [ ] VM creada en Proxmox.
- [ ] IP fija configurada.
- [ ] Docker instalado.
- [ ] Proyecto clonado.
- [ ] Rama `desarrollo-agente-profesional-gob` seleccionada.
- [ ] `.env` configurado.
- [ ] API key de OpenAI configurada para embeddings.
- [ ] `docker compose up -d --build` ejecutado.
- [ ] `/api/health` responde.
- [ ] App abre desde navegador.
- [ ] Backup Proxmox configurado.
- [ ] Firewall revisado.
