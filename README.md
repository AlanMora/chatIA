# SofIA | Asistente virtual del DIF Zapopan

SofIA es el asistente virtual institucional del DIF Zapopan. Orienta a la ciudadania sobre tramites, servicios, programas, apoyos, preguntas frecuentes y la Red de atencion DIF Zapopan, con una experiencia conversacional clara, accesible y disponible desde el sitio web institucional.

Esta es la primera version publica de SofIA. Su proposito es facilitar el acceso a informacion institucional; no sustituye la atencion profesional, los canales de emergencia ni los procesos oficiales de cada servicio.

## Caracteristicas principales

- Respuestas conversacionales en espanol, con lenguaje claro y tono institucional cercano.
- Recuperacion aumentada por busqueda vectorial (RAG): SofIA identifica la intencion de la persona, recupera informacion relevante y responde segun el contexto de la consulta.
- Fuentes de conocimiento separadas por proposito:
  - **Tramites y servicios:** requisitos, costos, vigencia, convocatoria, lugares y contactos.
  - **Red de atencion DIF Zapopan:** centros, Habilitecas, Nidos, CAIC y demas espacios de atencion, con ubicacion, horario, telefono y enlace de mapa cuando existe.
  - **Preguntas frecuentes:** respuestas institucionales reutilizables para dudas comunes.
- Presentacion adaptada a la fuente: fichas por apartado para tramites y servicios; ubicaciones, horarios, telefonos y mapas para la Red de atencion; respuestas breves y contextualizadas para FAQ.
- Manejo de opciones numeradas. Las personas pueden responder con el numero, el nombre o el apartado, por ejemplo `4` para consultar costos.
- Memoria conversacional de corto alcance para continuar preguntas como "cual es el horario?" o "donde se encuentran?" sin repetir toda la consulta.
- Respuestas de orientacion para consultas ambiguas, temas fuera de alcance, solicitud de contacto y situaciones sensibles o de posible emergencia.
- Widget web responsive con bienvenida, accesos rapidos, enlaces seguros, renderizado Markdown y listas visibles aun dentro de WordPress.
- Plantillas de insercion para el widget y configuracion grafica de dominios permitidos.
- Panel administrativo para chatbots, base de conocimiento, modelo, embeddings, seguridad del widget, analitica, leads y configuracion visual.
- Sincronizacion opcional desde MySQL para la fuente de tramites y servicios. Importa registros vigentes de `tramites_y_servicios` y los prepara para RAG.

## Experiencia publica

SofIA puede ayudar a encontrar un servicio aunque la pregunta no coincida literalmente con el titulo de una ficha. Por ejemplo, puede interpretar solicitudes sobre apoyo alimentario, atencion psicologica, platicas prematrimoniales, Habilitecas, servicios para personas mayores o la ubicacion de un centro.

Cuando hay varias coincidencias, muestra alternativas numeradas. Cuando la persona elige una, la ficha se consulta por partes para evitar respuestas extensas y dificiles de revisar:

1. En que consiste
2. A quien va dirigido
3. Requisitos
4. Costos
5. Horario, vigencia o convocatoria
6. Lugar y contacto
7. Nota importante
8. Ficha completa

## Seguridad y uso responsable

- El widget publico solo acepta los dominios configurados para cada chatbot. En produccion, una lista vacia no habilita CORS externo.
- Las rutas administrativas requieren autenticacion y las configuraciones estan aisladas por usuario.
- Las contrasenas de sincronizacion MySQL se cifran en el servidor y no se devuelven a la interfaz.
- Las peticiones publicas del widget no requieren cookies administrativas.
- SofIA no debe solicitar datos sensibles ni sustituir canales de emergencia. El mensaje de privacidad se muestra en el widget.
- Las respuestas se basan en la informacion disponible en la base de conocimiento; la informacion oficial del tramite prevalece.

## Arquitectura

- Frontend: React, Vite, TypeScript, Tailwind y componentes accesibles.
- Backend: Express y TypeScript.
- Datos: PostgreSQL, Drizzle ORM y pgvector para embeddings y busqueda semantica.
- IA: modelos y embeddings configurables por chatbot. El valor recomendado inicial para embeddings es OpenAI `text-embedding-3-small` con 1536 dimensiones.
- Operacion: Docker Compose, PostgreSQL/pgvector, healthcheck y configuracion reproducible mediante seed.

## Base de conocimiento

La plataforma admite contenido manual, URL y archivos PDF, DOC, DOCX, TXT, Markdown y JSONL. Los contenidos se procesan en fragmentos con embeddings para habilitar recuperacion semantica.

### Directorio y Red de atencion

El archivo `jsonl/integrar/06_directorio_dif_zapopan.canonical.jsonl` contiene el directorio institucional normalizado para RAG. Se utiliza como fuente de verdad para telefonos y contactos de oficinas, centros, Habilitecas, Nidos, CAIC y areas operativas.

```powershell
npm run prepare:directory-jsonl -- --source="C:\Users\chano\Downloads\Directorio_DIF_Zapopan_RAG_limpio.jsonl"
npm run import:sofia-kb
npm run eval:directory
```

### Sincronizacion MySQL de tramites y servicios

Desde **Configuracion > Sincronizacion MySQL de Tramites y Servicios** se configura el host, puerto, base de datos, usuario de solo lectura, contrasena e intervalo. La conexion se prueba antes de activar la integracion.

La sincronizacion toma los registros con `vigente_2026 = 'SÍ'` de la tabla `tramites_y_servicios`, genera o actualiza su ficha RAG y conserva un identificador externo estable por registro. El acceso a MySQL debe usar una cuenta con permiso de solo lectura.

> La sincronizacion de catalogos grandes puede tomar tiempo porque cada ficha se vectoriza. Antes de volver a ejecutarla en produccion, conviene verificar el estado y los conteos importados en la base de conocimiento.

## Widget web

Configura los dominios permitidos en **Configuracion > Seguridad Productiva del Widget** con origenes completos, por ejemplo:

```text
https://www.difzapopan.gob.mx
https://difzapopan.gob.mx
```

Para desarrollo local, agrega el origen con puerto si aplica, por ejemplo `http://localhost:5173`. Como respaldo operativo, `WIDGET_ALLOWED_ORIGINS` acepta una lista separada por comas cuando el chatbot todavia no tiene dominios configurados.

Fragmento recomendado para WordPress o un sitio web:

```html
<script
  src="https://chatdif.difzapopan.gob.mx/widget.js?v=20260713"
  data-chatbot-id="1"
  defer>
</script>
```

En WordPress, la politica CSP debe permitir `script-src` y `connect-src` hacia `https://chatdif.difzapopan.gob.mx`. Si se utiliza iframe, se debe permitir tambien en `frame-src`.

## Desarrollo y despliegue

Documentacion relacionada:

- [Alcance del proyecto](docs/ALCANCE_PROYECTO.md)
- [Plan por fases](docs/PLAN_IMPLEMENTACION.md)
- [Control de avance](docs/CONTROL_AVANCE.md)
- [Desarrollo local en Windows](DEV_WINDOWS.md)
- [Deploy en Proxmox](docs/DEPLOY_PROXMOX.md)

Para iniciar el entorno Docker:

```powershell
docker compose up -d --build
```

Al arrancar, la aplicacion ejecuta:

```powershell
npm run db:push
npm run seed:current
npm start
```

El seed en `seed/current-config.seed.json` replica la configuracion institucional sin secretos. El estado de la aplicacion se puede consultar en:

```text
GET /api/health
```

En produccion, el proxy inverso debe terminar TLS y reenviar `Host`, `X-Forwarded-Proto`, `X-Forwarded-Host`, `X-Forwarded-For` y `X-Real-IP`. El puerto `5000` no debe exponerse directamente a Internet.

## Mejoras siguientes

- Mostrar en interfaz el progreso, resultado y errores de sincronizacion MySQL; evitar ejecuciones simultaneas y respuestas HTTP de larga duracion.
- Incorporar migraciones versionadas para produccion en lugar de depender exclusivamente de `db:push`.
- Fortalecer operacion: respaldos automaticos, monitoreo, alertas, retencion de datos y runbooks.
- Implementar RBAC institucional y auditoria ampliada de cambios administrativos.
- Medir calidad de respuestas, consultas sin resolucion, temas mas solicitados y costo por modelo/proveedor.
- Anadir versionado, deduplicacion y flujos de revision para documentos de conocimiento.
- Integrar OCR para PDFs escaneados.
- Formalizar la canalizacion a atencion humana, tickets y responsables con confirmacion de la persona usuaria.
- Extender las herramientas operativas de forma segura, con permisos y trazabilidad.

## Principios de producto

SofIA se disena bajo principios de servicios digitales publicos: informacion clara, accesibilidad, privacidad, trazabilidad, inclusion y acompanamiento humano cuando un asistente no puede resolver una solicitud.