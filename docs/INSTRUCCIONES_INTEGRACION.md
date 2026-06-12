# Instrucciones operativas de integración

## Opción A: importar un solo archivo

Usa:

`jsonl/integrar/99_sofia_kb_master_completo_depurado.jsonl`

Ventaja: una sola carga.
Riesgo: si el router por skill depende de archivos separados, deberás respetar el campo `skill`.

## Opción B: importar por skill

Carga por separado:

1. Institucional
2. Protocolos
3. Programas
4. Ubicaciones

Esta es la opción recomendada si SofIA usa router inteligente o clasificación previa.

## Campos mínimos

Cada registro trae:

- id
- skill
- tipo_documento
- categoria
- titulo
- contenido
- source
- source_url
- metadata

## Política de duplicados

- Duplicados exactos de `capa_institucional`: descartados.
- Ubicaciones legacy: descartadas como fuente principal.
- Programas con mismo nombre: conservar si cambia audiencia.
