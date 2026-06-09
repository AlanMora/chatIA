# Alcance Del Proyecto

## Proposito

Construir una plataforma de agentes conversacionales profesionales para gobierno, con foco inicial en DIF Zapopan. El agente debe orientar a la ciudadania sobre tramites, servicios, programas, talleres y apoyos con respuestas precisas, progresivas y auditables.

## Problema A Resolver

La ciudadania necesita encontrar informacion institucional sin leer multiples documentos, navegar sitios complejos o recibir respuestas largas que mezclen servicios. El agente debe ayudar a identificar el servicio correcto y despues mostrar solo el apartado solicitado.

## Resultado Esperado

Un agente conversacional que:

- Entienda preguntas ciudadanas con lenguaje natural.
- Busque en documentos oficiales cargados.
- Devuelva listados solo con nombres.
- Al seleccionar un servicio, muestre un menu de apartados.
- Responda solo el apartado solicitado.
- Entregue ficha completa solo cuando el usuario la pida.
- Use modelos y embeddings configurables desde la interfaz.
- Pueda ejecutar tools/skills autorizadas.
- Mantenga auditoria de fuentes, herramientas y decisiones.

## Usuarios

- Ciudadania que consulta servicios publicos.
- Personal operativo que administra documentos y respuestas.
- Administradores tecnicos que configuran modelos, proveedores, skills y tools.
- Responsables institucionales que revisan calidad, seguridad y metricas.

## Alcance Funcional

### Agente Conversacional

- Flujo conversacional por fases: busqueda, listado, seleccion, apartado, ficha completa.
- Respuestas breves y orientadas a celular.
- Manejo de nuevas busquedas y continuidad de conversacion.
- Reglas de no invencion y no mezcla de servicios.
- Soporte para pruebas de comportamiento con casos esperados.

### Base De Conocimiento

- Carga masiva de PDFs y documentos.
- Extraccion de texto.
- Chunking.
- Embeddings con OpenAI o proveedor configurable.
- Busqueda vectorial pgvector.
- Registro de fuentes usadas.
- Reprocesamiento de documentos.

### Modelos Y Embeddings

- Seleccion de proveedor desde UI.
- Seleccion de modelo de chat desde UI.
- Seleccion de modelo de embedding desde UI.
- Catalogo de modelos por proveedor.
- Soporte para OpenAI, Ollama, Gemini, OpenRouter y endpoint custom.
- Validacion de modelos disponibles antes de guardar configuracion.

### Skills Y Tools

- Registro de tools disponibles.
- Activacion/desactivacion por chatbot.
- Permisos por tool.
- Logs de ejecucion.
- Politicas de seguridad por tipo de tool.
- Skills como paquetes de instrucciones, workflows y capacidades.

### Administracion Y Operacion

- Dashboard real con metricas.
- Gestion de leads.
- Historial de conversaciones.
- Ratings y satisfaccion.
- Exportacion de datos.
- Alertas por baja satisfaccion, alto volumen o conversaciones sin respuesta.

## Alcance Tecnico

- Frontend: React, Vite, TypeScript, TanStack Query, Tailwind, shadcn/Radix.
- Backend: Express, TypeScript, Drizzle.
- DB: PostgreSQL + pgvector.
- RAG: embeddings, recuperacion vectorial, composicion de contexto.
- Runtime local: Windows 11 + Docker Desktop.
- Despliegue: Docker Compose, Nginx, Certbot.

## Fuera De Alcance Inicial

- Aprobacion automatica de apoyos.
- Registro formal de beneficiarios.
- Validacion automatica de documentos ciudadanos.
- Sustitucion de atencion humana.
- Asesoria medica, legal o psicologica especializada.
- Fine-tuning de modelos en fase inicial.

## Riesgos

- Respuestas demasiado largas aunque el prompt pida brevedad.
- Mezcla de informacion entre servicios similares.
- API keys expuestas al frontend.
- Falta de auditoria de herramientas.
- RAG con chunks poco especificos.
- Dependencia de modelos remotos.
- Errores TypeScript existentes que bloquean calidad tecnica.

## Criterios De Exito

- Listados devuelven solo nombres.
- Seleccion de servicio devuelve menu de apartados.
- Apartado solicitado devuelve solo ese apartado.
- Ficha completa solo aparece si se pide explicitamente.
- Documentos PDF se cargan sin error y generan chunks.
- Embeddings OpenAI generan vectores de 1536 dimensiones.
- Administrador puede cambiar modelo y embedding desde UI.
- Tools/skills se pueden habilitar por chatbot.
- Cada respuesta puede auditar fuentes y herramientas usadas.

## Referencias Externas

- GOV.UK/GDS: principios de diseno de servicios publicos, como empezar con necesidades de usuario, hacer el trabajo dificil para que sea simple y disenar para todos.
- U.S. Web Design System: consistencia, accesibilidad y experiencia movil para servicios gubernamentales.
- 18F / Digital service teams: desarrollo agil, codigo abierto, diseno centrado en usuarios y modernizacion de servicios publicos.
- Estudios recientes sobre chatbots publicos 311 destacan retos de interpretacion, transparencia y contexto social.
- Investigaciones recientes de chatbots para administracion publica destacan privacidad, control de acceso y trazabilidad.
