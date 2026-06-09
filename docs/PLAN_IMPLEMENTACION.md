# Plan De Implementacion Por Fases

## Rama

```text
desarrollo-agente-profesional-gob
```

## Fase 0 - Preparacion Y Control

Objetivo: ordenar el proyecto antes de cambios funcionales grandes.

Entregables:

- Rama de desarrollo.
- README actualizado.
- Documento de alcance.
- Plan por fases.
- Control de avance.
- Entorno Windows funcional.

Estado: completado.

## Fase 1 - Estabilizacion Tecnica

Objetivo: dejar el proyecto compilable y estable para desarrollo continuo.

Tareas:

- Corregir errores TypeScript existentes.
- Corregir integracion vieja de `pdf-parse` en ElevenLabs.
- Corregir tipos de embeddings/chunks en `storage.ts`.
- Revisar integraciones Replit no usadas y decidir si se mantienen, aislan o eliminan.
- Separar `server/routes.ts` en modulos:
  - auth
  - chatbots
  - knowledge-base
  - widget
  - analytics
  - notifications
  - predefined-responses
- Agregar pruebas minimas de rutas criticas.

Criterio de cierre:

```powershell
npm run check
npm run build
```

deben pasar.

## Fase 2 - RAG Y Comportamiento Conversacional

Objetivo: lograr el comportamiento conversacional esperado para gobierno.

Estado: completado.

Tareas:

- Crear prompt composer centralizado.
- Separar reglas globales, reglas de chatbot y reglas RAG.
- Detectar intencion: listado, seleccion, apartado, ficha completa, nueva busqueda.
- Evitar que el contexto RAG fuerce respuestas largas.
- Agregar evaluaciones de conversacion:
  - listado solo nombres
  - seleccion muestra menu
  - requisitos solo requisitos
  - costo solo costo
  - ficha completa solo si se pide
- Guardar fuente recuperada por respuesta.

Criterio de cierre:

- 20 casos conversacionales pasan sin mezclar servicios.
- Listados no contienen apartados.
- Ficha completa no aparece salvo que el usuario la pida.

Avance:

- Modulo `server/conversation-policy.ts` creado para centralizar politica conversacional.
- Prompt composer runtime integrado en el endpoint del widget.
- Script `npm run eval:conversation` agregado con 22 validaciones iniciales.
- Script `npm run eval:rag` agregado para validar recuperacion real con pgvector/embeddings; cubre 21 casos simples y multi-turno.
- Respuestas del asistente guardan estrategia RAG, fuentes recuperadas y numero de chunks.
- La consulta RAG se enriquece con el servicio activo cuando el usuario pide apartados como requisitos, costos, lugar o ficha completa.

## Fase 3 - Modelos Y Embeddings Configurables Desde UI

Objetivo: permitir que administradores cambien modelos sin editar `.env`.

Estado: completado.

Tareas:

- Crear tabla `model_providers`.
- Crear tabla `model_catalog`.
- Crear tabla `chatbot_model_settings`.
- Crear endpoints:
  - `GET /api/model-providers`
  - `GET /api/model-catalog`
  - `POST /api/model-catalog/refresh`
  - `PATCH /api/chatbots/:id/model-settings`
- Agregar UI en editor del chatbot:
  - proveedor de chat
  - modelo de chat
  - proveedor de embedding
  - modelo de embedding
  - dimensiones
  - temperatura
  - max tokens
- Validar modelos por proveedor antes de guardar.
- Permitir modelo custom manual.

Modelos OpenAI a soportar como catalogo configurable:

- `gpt-5.5`
- `gpt-5.4`
- `gpt-5.4-mini`
- `gpt-5.3-codex`
- `gpt-5.2`
- `gpt-5.1`
- `gpt-5`
- `gpt-4o`
- `gpt-4o-mini`

Nota: la disponibilidad real debe validarse contra el endpoint de modelos del proveedor/API key. No todos los modelos pueden estar habilitados para cada cuenta.

Embeddings OpenAI:

- `text-embedding-3-small`, 1536 dimensiones recomendado.
- `text-embedding-3-large`, configurable a 1536 si se requiere.

Criterio de cierre:

- El administrador cambia modelos desde UI.
- La carga de documentos usa el modelo de embedding seleccionado.
- El chat usa el modelo de chat seleccionado.
- El backend valida proveedor, modelo activo y dimensiones antes de guardar.

Avance:

- Catalogo OpenAI ampliado en el editor del chatbot.
- Endpoints `GET /api/model-providers`, `GET /api/model-catalog`, `POST /api/model-catalog/refresh` y `PATCH /api/chatbots/:id/model-settings` agregados.
- Editor del chatbot consume el catalogo desde API con fallback local.
- Tablas `model_providers`, `model_catalog` y `chatbot_model_settings` agregadas y sincronizadas con Drizzle.
- Catalogo seed inicial en base de datos y refresh por proveedor.
- Validacion backend de modelos por proveedor y limite vectorial de 1536 dimensiones.
- Configuracion de embedding agregada al esquema de chatbot:
  - proveedor
  - modelo
  - dimensiones
  - base URL para Ollama
- El generador RAG usa primero la configuracion de embedding del chatbot; `.env` queda como respaldo operativo y fuente de llaves/base global.

## Fase 4 - UX Y Capa Conversacional Complementaria

Objetivo: mejorar la experiencia ciudadana cuando la consulta no corresponde directamente a tramites, servicios, programas o talleres.

Estado: completado.

Concepto:

- Capa UX: estructura de conversacion, microcopy, menus y estados para guiar mejor al usuario.
- Informacion complementaria: respuestas institucionales breves sobre temas relacionados, sin inventar datos ni sustituir informacion oficial.
- Fuera de alcance: manejo claro de preguntas ajenas al DIF Zapopan, con redireccion amable.

Tareas:

- Crear politica de respuestas fuera de base de conocimiento:
  - tema relacionado al DIF pero sin dato en documentos
  - tema gubernamental externo
  - emergencia o riesgo
  - informacion general no institucional
- Mejorar bienvenida y opciones iniciales.
- Agregar sugerencias de siguiente paso despues de cada apartado.
- Crear estados conversacionales:
  - buscando servicio
  - servicio seleccionado
  - apartado seleccionado
  - fuera de alcance
  - requiere contacto humano
- Agregar evaluaciones UX:
  - pregunta ambigua
  - consulta fuera de DIF
  - dato no encontrado
  - solicitud sensible
  - derivacion a contacto humano
- Preparar textos para tono institucional, claro y movil.

Criterio de cierre:

- El agente orienta sin frustrar cuando no encuentra informacion.
- No inventa datos complementarios.
- Deriva a opciones seguras cuando la consulta esta fuera del alcance.
- Las respuestas fuera de tramite mantienen tono institucional.

Avance:

- Intenciones UX agregadas en `server/conversation-policy.ts`:
  - ambigua
  - complementaria
  - fuera de alcance
  - emergencia
  - contacto humano
- Estados conversacionales agregados:
  - buscando servicio
  - servicio seleccionado
  - apartado seleccionado
  - fuera de alcance
  - requiere contacto humano
  - emergencia
- Respuestas deterministicas para:
  - saludo o solicitud ambigua
  - informacion complementaria relacionada con DIF
  - tema fuera de alcance
  - emergencia o riesgo inmediato
  - solicitud de atencion con una persona
- Menu de apartados mejorado con sugerencia de "ficha completa".
- Politica runtime y reglas RAG reforzadas para no inventar informacion complementaria.
- Evaluacion conversacional ampliada a 40 casos sin fallos.

## Fase 5 - Skills Y Tools

Objetivo: agregar capacidades controladas al agente.

Estado: completado.

Concepto:

- Skill: paquete de instrucciones/workflow para un dominio.
- Tool: accion ejecutable, externa o interna, con permisos y logs.

Tareas:

- Crear tabla `agent_skills`.
- Crear tabla `agent_tools`.
- Crear tabla `chatbot_skills`.
- Crear tabla `chatbot_tools`.
- Crear tabla `tool_execution_logs`.
- Crear UI para habilitar skills/tools por chatbot.
- Definir permisos:
  - lectura
  - escritura
  - externo
  - sensible
  - requiere confirmacion
- Implementar tools iniciales:
  - buscar en base de conocimiento
  - listar servicios por categoria
  - obtener ficha de servicio
  - exportar conversacion
  - crear lead
  - derivar a contacto humano
- Agregar auditoria de tool calls.

Criterio de cierre:

- Tools habilitables por chatbot.
- Logs por tool call.
- El agente no ejecuta tools no autorizadas.

Avance:

- Tablas `agent_skills`, `agent_tools`, `chatbot_skills`, `chatbot_tools` y `tool_execution_logs` agregadas.
- Catalogo inicial de skills/tools en `server/agent-capabilities.ts`.
- Endpoints para listar, habilitar/deshabilitar y auditar capabilities:
  - `GET /api/agent-skills`
  - `GET /api/agent-tools`
  - `GET /api/chatbots/:id/capabilities`
  - `PATCH /api/chatbots/:id/capabilities`
  - `POST /api/chatbots/:id/tools/:toolId/log`
- Editor del chatbot incluye pestaña `Skills` para activar skills/tools y ver auditoria reciente.
- Prompt runtime recibe skills/tools habilitadas con reglas de no ejecucion falsa y confirmacion para acciones sensibles.
- Tools iniciales registradas:
  - buscar en base de conocimiento
  - listar servicios por categoria
  - obtener ficha de servicio
  - exportar conversacion
  - crear lead
  - derivar a contacto humano
- Mejora operativa adicional: base de conocimiento permite seleccion multiple, eliminar seleccionados y visualizar archivos PDF cargados.

## Fase 6 - Deploy Docker Y Seed Operativo

Objetivo: dejar el proyecto listo para levantar en servidor con Docker Compose y configuracion inicial reproducible.

Estado: completado.

Tareas:

- Crear `docker-compose.yml` productivo con app, Postgres/pgvector, volumenes y healthchecks.
- Ajustar `Dockerfile` para build productivo, scripts y seed.
- Agregar endpoint `/api/health`.
- Crear seed de configuracion actual:
  - usuario institucional
  - chatbot SofIA
  - prompt, bienvenida, descripcion y modelos
  - catalogo de modelos
  - skills/tools
  - capacidades activadas por chatbot
- Agregar comando `npm run seed:current`.
- Documentar variables `.env` necesarias para deploy.

Criterio de cierre:

- `docker compose up -d --build` puede construir app y DB.
- La app aplica schema y seed al iniciar.
- Los uploads persisten en volumen.
- Healthcheck disponible.

## Fase 7 - Seguridad, Privacidad Y Gobierno

Objetivo: cumplir expectativas de proyecto gubernamental.

Tareas:

- Cifrar API keys en DB.
- Nunca devolver secrets al frontend.
- RBAC por usuario/rol.
- Logs de auditoria.
- Politicas de retencion de conversaciones.
- Exportacion y eliminacion de datos.
- Avisos de limitacion del asistente.
- Mecanismo de escalamiento humano.
- Sanitizacion de archivos y validacion de tipo real.

Criterio de cierre:

- Secrets no aparecen en respuestas API.
- Acciones sensibles quedan auditadas.
- Roles controlan acceso administrativo.

## Fase 8 - Analitica Y Calidad

Objetivo: medir calidad del agente y mejorar iterativamente.

Tareas:

- Dashboard real con metricas del home.
- Tasa de resolucion.
- Satisfaccion.
- Temas mas consultados.
- Servicios sin informacion suficiente.
- Conversaciones con fallback.
- Tiempo de respuesta.
- Costo por proveedor/modelo.
- Evaluacion automatica de prompts.

Criterio de cierre:

- Administrador puede ver desempeno por chatbot.
- Se identifican huecos de base de conocimiento.

## Fase 9 - Despliegue Productivo Avanzado

Objetivo: endurecer y operar despliegues productivos avanzados.

Tareas:

- Nginx/SSL.
- Backups DB.
- Migraciones controladas.
- Healthchecks.
- Observabilidad.
- Runbook de soporte.
- Guia de operacion para personal institucional.

Criterio de cierre:

- Entorno productivo desplegable y documentado.
