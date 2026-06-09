# Control De Avance

## Estado General

| Area | Estado | Notas |
| --- | --- | --- |
| Rama de desarrollo | Completado | `desarrollo-agente-profesional-gob` |
| Entorno Windows | Completado | Docker, Postgres, pgvector y app local |
| Embeddings OpenAI | Completado | `text-embedding-3-small`, 1536 dimensiones |
| Carga PDF | Completado | Validada carga masiva de 80 PDFs sin errores reportados |
| Prompt conversacional | Completado | Flujo validado por usuario y evaluaciones |
| Evaluaciones conversacionales | Completado | `npm run eval:conversation` con 40 casos sin fallos |
| Trazabilidad RAG | Completado | Admin muestra estrategia, fuentes y chunks por respuesta |
| TypeScript limpio | Completado | `npm run check` ejecutado sin errores |
| Build completo | Completado | `npm run build` ejecutado; quedan advertencias no bloqueantes |
| Modelos desde UI | Completado | Fase 3 cerrada: UI, catalogo DB, refresh y validacion backend |
| UX conversacional complementaria | Completado | Fase 4 cerrada: ambiguedad, fuera de alcance, emergencia y contacto humano |
| Skills/tools | Completado | Fase 5 cerrada: tablas, UI, prompt y auditoria |
| Base de conocimiento UX | Completado | Seleccion multiple, borrado masivo y visualizacion de archivos PDF nuevos |
| Deploy Docker | Completado | `docker-compose.yml`, healthcheck y seed actual |
| Seguridad secrets | Pendiente | Fase 7 |
| Analitica avanzada | Pendiente | Fase 8 |

## Bitacora

| Fecha | Cambio | Estado |
| --- | --- | --- |
| 2026-06-09 | Analisis inicial de arquitectura y riesgos | Completado |
| 2026-06-09 | Configuracion de desarrollo Windows 11 | Completado |
| 2026-06-09 | Docker Postgres/pgvector local | Completado |
| 2026-06-09 | OpenAI embeddings 1536 dimensiones | Completado |
| 2026-06-09 | Correccion de lectura PDF con API publica de `pdf-parse` | Completado |
| 2026-06-09 | Ajuste de prompt conversacional por apartados | En validacion |
| 2026-06-09 | Creacion de rama de desarrollo | Completado |
| 2026-06-09 | Creacion de docs de alcance, fases y control | Completado |
| 2026-06-09 | Inicio Fase 1: estabilizacion tecnica y limpieza TypeScript | En progreso |
| 2026-06-09 | Correccion de errores TypeScript en RAG, Gemini, PDF, batch e integraciones auxiliares | Completado |
| 2026-06-09 | Sanitizacion de API keys en respuestas de chatbots y exportacion | Completado |
| 2026-06-09 | Verificacion de propiedad para editar/eliminar respuestas predefinidas | Completado |
| 2026-06-09 | Sincronizacion de esquema local con Drizzle | Completado |
| 2026-06-09 | Validacion de carga masiva de 80 PDFs | Completado |
| 2026-06-09 | Correccion deterministica para seleccion numerica desde listados de servicios | En validacion |
| 2026-06-09 | Correccion deterministica para nombre directo de servicio | En validacion |
| 2026-06-09 | Inicio Fase 2: politica conversacional centralizada y evaluaciones | En progreso |
| 2026-06-09 | Creacion de `server/conversation-policy.ts` y prompt composer runtime | Completado |
| 2026-06-09 | Evaluacion conversacional automatizada inicial: 22 casos pasan, 0 fallan | Completado |
| 2026-06-09 | Campos RAG en `widget_messages`: estrategia, fuentes y chunks | Completado |
| 2026-06-09 | Evaluacion RAG real inicial: 5 casos pasan, 0 fallan | Completado |
| 2026-06-09 | Visualizacion de trazabilidad RAG en analitica/conversaciones | Completado |
| 2026-06-09 | Consulta RAG enriquecida con servicio activo para apartados multi-turno | Completado |
| 2026-06-09 | Evaluacion RAG multi-turno: 21 casos pasan, 0 fallan | Completado |
| 2026-06-09 | Cierre Fase 2 validado por usuario | Completado |
| 2026-06-09 | Se agrega Fase 4 de UX y capa conversacional complementaria | Completado |
| 2026-06-09 | Inicio Fase 3: modelos y embeddings configurables desde UI | En progreso |
| 2026-06-09 | Catalogo OpenAI ampliado en editor: GPT-5.5, GPT-5.4, GPT-5.4 Mini, GPT-5.3 Codex, GPT-5.2 | Completado |
| 2026-06-09 | Campos de embeddings por chatbot agregados a esquema y UI | Completado |
| 2026-06-09 | RAG usa configuracion de embedding del chatbot con compatibilidad `.env` | Completado |
| 2026-06-09 | Endpoints de catalogo de modelos: proveedores, modelos y refresh estatico | Completado |
| 2026-06-09 | Editor consume catalogo de modelos desde API con fallback local | Completado |
| 2026-06-09 | Endpoint `PATCH /api/chatbots/:id/model-settings` agregado | Completado |
| 2026-06-09 | Tablas `model_providers`, `model_catalog` y `chatbot_model_settings` creadas en DB | Completado |
| 2026-06-09 | Validacion backend de modelos por proveedor y embeddings maximo 1536 dimensiones | Completado |
| 2026-06-09 | RAG prioriza configuracion de embedding del chatbot y usa `.env` como respaldo | Completado |
| 2026-06-09 | Cierre Fase 3: modelos y embeddings configurables desde UI | Completado |
| 2026-06-09 | Inicio Fase 4: UX y capa conversacional complementaria | En progreso |
| 2026-06-09 | Intenciones UX agregadas: ambigua, complementaria, fuera de alcance, emergencia y contacto humano | Completado |
| 2026-06-09 | Estados conversacionales agregados para UX y futuras analiticas/tools | Completado |
| 2026-06-09 | Respuestas deterministicas para saludo, ambiguedad, fuera de alcance, emergencia y contacto humano | Completado |
| 2026-06-09 | Politica runtime y RAG reforzadas para informacion complementaria sin inventar datos | Completado |
| 2026-06-09 | Evaluacion conversacional ampliada: 40 casos pasan, 0 fallan | Completado |
| 2026-06-09 | Cierre Fase 4: UX conversacional complementaria | Completado |
| 2026-06-09 | Inicio Fase 5: skills/tools con permisos, logs y auditoria | En progreso |
| 2026-06-09 | Tablas `agent_skills`, `agent_tools`, `chatbot_skills`, `chatbot_tools` y `tool_execution_logs` agregadas | Completado |
| 2026-06-09 | Catalogo inicial de skills/tools y prompt de capacidades habilitadas | Completado |
| 2026-06-09 | Pestaña Skills agregada al editor del chatbot | Completado |
| 2026-06-09 | Auditoria de tool calls agregada via endpoint de logs | Completado |
| 2026-06-09 | Base de conocimiento: seleccion multiple y eliminacion por lote | Completado |
| 2026-06-09 | Base de conocimiento: PDFs nuevos se almacenan y pueden visualizarse | Completado |
| 2026-06-09 | Cierre Fase 5: skills/tools | Completado |
| 2026-06-09 | Nueva Fase 6 de deploy Docker agregada | Completado |
| 2026-06-09 | `docker-compose.yml` productivo, `/api/health` y seed actual creados | Completado |

## Backlog Priorizado

### P0 - Bloqueantes

- Preparar hardening de seguridad: cifrado de API keys, RBAC y politicas de retencion.

### P1 - Producto

- Prompt composer y evaluaciones conversacionales.
- Fuentes recuperadas por respuesta.
- Mejorar analitica de tools y costo por modelo/proveedor.

### P2 - Operacion

- Alertas de calidad.
- Exportacion de leads y conversaciones.
- Runbook productivo.

## Decisiones

| Decision | Motivo |
| --- | --- |
| Usar OpenAI `text-embedding-3-small` | Encaja con pgvector 1536 actual |
| Mantener Ollama como opcion futura | Servidor local ya existe y puede usarse para chat o embeddings |
| Trabajar por fases | Evita mezclar estabilizacion, producto y seguridad |
| Crear catalogo dinamico de modelos | La disponibilidad depende de proveedor y API key |
| Implementar skills/tools con permisos | Proyecto gubernamental requiere control y auditoria |

## Riesgos Abiertos

- El modelo puede ignorar reglas de formato si el contexto RAG es demasiado largo, aunque ahora hay respuestas deterministicas para casos UX criticos.
- La base de conocimiento puede mezclar servicios si los chunks no estan bien segmentados.
- Las API keys por chatbot deben cifrarse antes de uso productivo.
- Se requiere trazabilidad para justificar respuestas institucionales.
- El bundle de frontend supera 500 kB; conviene aplicar code splitting en una fase posterior.
- Browserslist/caniuse-lite esta desactualizado; no bloquea desarrollo, pero debe actualizarse en mantenimiento.
- La visualizacion de PDF aplica a archivos cargados despues de esta version; PDFs anteriores no tienen archivo fisico asociado si solo se guardo texto extraido.

## Proxima Iteracion Recomendada

1. Iniciar Fase 7 Seguridad, Privacidad y Gobierno.
2. Cifrar API keys almacenadas por chatbot.
3. Agregar RBAC y roles administrativos.
4. Definir retencion/exportacion/eliminacion de conversaciones.
5. Preparar runbook productivo y politica de backups.
