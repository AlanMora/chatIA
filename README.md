# SofIA ChatIA

SofIA ChatIA es una plataforma para crear agentes conversacionales profesionales orientados a servicios publicos. El objetivo actual es construir un asistente institucional para DIF Zapopan capaz de orientar a la ciudadania sobre tramites, servicios, programas, talleres y apoyos usando una base de conocimiento documental, RAG, modelos configurables y control de comportamiento conversacional.

## Alcance Actual

- Aplicacion full-stack con React, Vite, Express, TypeScript, PostgreSQL, Drizzle y pgvector.
- Autenticacion local JWT/sesion y soporte para Replit Auth.
- CRUD de chatbots por usuario.
- Base de conocimiento con carga de texto, URL y archivos PDF/DOC/DOCX/TXT/JSONL.
- Administracion de base de conocimiento con seleccion multiple, eliminacion masiva y visualizacion de archivos PDF cargados desde esta version.
- Generacion de embeddings configurable por chatbot, con OpenAI `text-embedding-3-small` a 1536 dimensiones como default recomendado.
- Busqueda vectorial con pgvector.
- Catalogo de modelos/proveedores en base de datos con refresh desde API y validacion antes de guardar.
- Capa UX conversacional para consultas ambiguas, informacion complementaria, fuera de alcance, emergencias y contacto humano.
- Skills y tools configurables por chatbot con permisos, confirmacion para acciones sensibles y auditoria.
- Widget embebible con streaming SSE.
- Analitica de conversaciones y mensajes.
- Captura de leads.
- Configuracion inicial de voz con ElevenLabs.
- Configuracion local para Windows 11 y Docker/Postgres.
- Deploy con Docker Compose, Postgres/pgvector, healthcheck y seed reproducible de configuracion actual.

## Vision

Crear un agente conversacional de nivel gubernamental que sea:

- Preciso: no inventa datos y responde solo con informacion disponible.
- Conversacional: primero orienta, luego profundiza por apartado y maneja ambiguedad sin frustrar al usuario.
- Auditable: registra fuentes, decisiones y uso de herramientas.
- Configurable: modelos, embeddings, prompts, skills y tools desde interfaz web.
- Seguro: separa datos por usuario, protege API keys y controla acceso a herramientas.
- Accesible: lenguaje claro, flujos cortos y experiencia usable en celular.

## Documentos De Proyecto

- [Alcance del proyecto](docs/ALCANCE_PROYECTO.md)
- [Plan por fases](docs/PLAN_IMPLEMENTACION.md)
- [Control de avance](docs/CONTROL_AVANCE.md)
- [Desarrollo local en Windows](DEV_WINDOWS.md)
- [Deploy en Proxmox](docs/DEPLOY_PROXMOX.md)

## Deploy Docker

El proyecto incluye `docker-compose.yml` para despliegue con app y PostgreSQL/pgvector:

```powershell
docker compose up -d --build
```

Al iniciar, la app ejecuta:

```powershell
npm run db:push
npm run seed:current
npm start
```

El seed vive en `seed/current-config.seed.json` y replica la configuracion actual sin llaves privadas: usuario institucional, chatbot SofIA, modelos, embeddings, skills/tools y capacidades habilitadas.

Healthcheck:

```text
GET /api/health
```

## Rama De Desarrollo

El trabajo de ampliacion se esta llevando en:

```text
desarrollo-agente-profesional-gob
```

## Oportunidades De Mejora

- Separar `server/routes.ts` por dominios.
- Proteger API keys con cifrado y no devolverlas al frontend.
- Optimizar queries SQL y agregar indices.
- Agregar migraciones versionadas para produccion en lugar de `db:push`.
- Agregar Nginx/SSL y backups automatizados.
- Implementar RBAC institucional.
- Medir costo por modelo/proveedor y uso de tools.
- Agregar OCR para PDFs escaneados.
- Agregar versionado de documentos de base de conocimiento.
- Agregar flujo formal de escalamiento humano y mesa de ayuda.

## Futuros Alcances

- Seguridad gubernamental: cifrado de secretos, roles, retencion de datos, auditoria completa y politicas de privacidad.
- Analitica avanzada: resolucion, temas mas consultados, servicios sin informacion, calidad por conversacion y alertas.
- Operacion productiva: Nginx, SSL, backups, monitoreo, runbook y despliegues controlados.
- Tools ejecutables reales: exportar conversaciones, crear leads, generar tickets y canalizar a responsables con confirmacion.
- Mejora documental: OCR, deduplicacion, segmentacion semantica por ficha y control de versiones.

## Referencias De Diseno

El producto toma como referencia principios de servicios digitales publicos: diseno centrado en usuarios, lenguaje claro, accesibilidad, trazabilidad, privacidad y soporte humano cuando el asistente no pueda resolver una solicitud.
