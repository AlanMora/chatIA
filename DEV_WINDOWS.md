# Desarrollo Local en Windows 11

## Requisitos

- Windows 11
- Node.js 20 LTS recomendado
- npm
- Docker Desktop con el motor Linux iniciado

> El proyecto puede instalar dependencias con Node 24, pero Docker y los tipos del proyecto están alineados con Node 20. Para evitar diferencias raras entre local y producción, usa Node 20 LTS.

## Primer Setup

```powershell
npm install
```

El archivo `.env` local ya está configurado para usar Postgres en `localhost:5432`.

## Levantar Base de Datos

Abre Docker Desktop y espera a que indique que el motor está corriendo.

```powershell
npm run db:up
```

Habilita pgvector y sincroniza el esquema:

```powershell
npm run db:vector
npm run db:push
```

Tambien puedes correr todo el setup de base de datos en un solo paso:

```powershell
npm run db:setup
```

## Arrancar la App

```powershell
npm run dev
```

La app queda en:

```text
http://localhost:5000
```

## Comandos Útiles

```powershell
npm run check
npm run build
npm run db:logs
npm run db:down
```

## Notas

- Las claves de OpenAI, Gemini, OpenRouter y ElevenLabs están vacías en `.env`; llena solo las que vayas a probar.
- La base de conocimiento usa primero la configuracion de embedding del chatbot en la UI. Si no hay configuracion por chatbot, toma `EMBEDDING_PROVIDER` y los defaults de `.env`. El modelo recomendado para el esquema actual es `text-embedding-3-small` con `1536` dimensiones.
- `npm run check` actualmente detecta errores TypeScript existentes en el código. No son errores de instalación de dependencias.
- Si Docker responde con error del pipe `dockerDesktopLinuxEngine`, abre Docker Desktop antes de correr `npm run db:up`.
