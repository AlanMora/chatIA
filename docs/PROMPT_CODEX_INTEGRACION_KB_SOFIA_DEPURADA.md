# PROMPT PARA CODEX - Integrar KB depurada de SofIA

Trabaja en el proyecto SofIA de DIF Zapopan.

## Objetivo

Integrar la base de conocimiento depurada contenida en:

`jsonl/integrar/99_sofia_kb_master_completo_depurado.jsonl`

o, si el sistema trabaja por skill, importar los cuatro archivos de `jsonl/integrar/`.

## Reglas críticas

1. No importar los archivos ubicados en `jsonl/referencia_no_integrar/`.
2. No duplicar `sofia_capa_institucional_dif_zapopan`, porque ya fue separada en capas.
3. No usar las ubicaciones legacy como fuente principal; usar `04_centros_dif_zapopan_activos.canonical.jsonl`.
4. Mantener los programas repetidos por nombre cuando cambia la audiencia, por ejemplo Huertos Urbanos o Centro de Trabajo Social.
5. Indexar por `skill`, `tipo_documento`, `categoria`, `audiencia`, `titulo`, `contenido` y `metadata`.

## Skills esperadas

- institucional_sofia
- protocolos_orientacion_riesgo
- programas_servicios_dif_zapopan
- ubicaciones_institucionales

## Comportamiento esperado del router

- Si la persona pregunta quién es SofIA, qué puede hacer, contacto general o información institucional: usar `institucional_sofia`.
- Si menciona violencia, riesgo, emergencia, maltrato, abandono, crisis o víctima: priorizar `protocolos_orientacion_riesgo`.
- Si pregunta por apoyos, programas, servicios, requisitos o población objetivo: usar `programas_servicios_dif_zapopan`.
- Si pregunta por dirección, teléfono, horario, mapa, centro, NIDO, Habiliteca, CEMAM o ubicación: usar `ubicaciones_institucionales`.
- Si la consulta mezcla programa + ubicación, responder combinando programa y centro relacionado solo cuando haya evidencia en la KB.

## Tareas técnicas

1. Crear o ajustar importador JSONL.
2. Validar una línea JSON por registro.
3. Normalizar `pageContent`/`contenido` si el indexador aún usa `pageContent`.
4. Guardar metadata completa para filtros.
5. Evitar duplicados por `id`.
6. Agregar pruebas de importación:
   - total esperado master: 92
   - centros activos: 43
   - programas: 38
   - protocolos: 4
   - institucional: 7

## Resultado esperado

SofIA debe responder con información clara, no inventar, y citar o mencionar la fuente cuando esté disponible en `source_url` o `metadata.source_url`.
