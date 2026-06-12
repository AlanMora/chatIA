# Reporte de depuración KB SofIA
Fecha de generación: 2026-06-12
## Resultado recomendado
Integrar únicamente los archivos dentro de `jsonl/integrar/`.

| Capa | Archivo | Registros | Recomendación |
|---|---:|---:|---|
| 01_institucional_base.canonical.jsonl | integrar | 7 | Sí |
| 02_protocolos_orientacion_riesgo.canonical.jsonl | integrar | 4 | Sí |
| 03_programas_servicios_dif_zapopan.seed.canonical.jsonl | integrar | 38 | Sí |
| 04_centros_dif_zapopan_activos.canonical.jsonl | integrar | 43 | Sí |
| 99_sofia_kb_master_completo_depurado.jsonl | integrar | 92 | Sí, si tu importador acepta un solo archivo |

## Archivos que salen sobrando o deben quedar como referencia
- `sofia_capa_institucional_dif_zapopan(1).jsonl`: no integrarlo junto con las capas separadas. Contiene duplicados exactos de base institucional, protocolos y ubicaciones legacy.
- `sofia_ubicaciones_institucionales (1).jsonl`: no integrarlo como fuente principal. Fue reemplazado por `centros_dif_zapopan_activos`, que trae coordenadas oficiales.
- `sofia_ubicaciones_institucionales_con_maps_url.jsonl`: no integrarlo como fuente principal. Solo queda como respaldo legacy con URLs por dirección.

## Duplicados exactos por contenido detectados

- Hash `793947f364`:
  - `sofia_institucional_base(1).jsonl` / `institucional-sofia-001` / SofIA - Asistente virtual de orientación DIF Zapopan
  - `sofia_capa_institucional_dif_zapopan(1).jsonl` / `institucional-sofia-001` / SofIA - Asistente virtual de orientación DIF Zapopan

- Hash `e9037f0ed5`:
  - `sofia_institucional_base(1).jsonl` / `institucional-dif-zapopan-001` / DIF Zapopan - Información institucional general
  - `sofia_capa_institucional_dif_zapopan(1).jsonl` / `institucional-dif-zapopan-001` / DIF Zapopan - Información institucional general

- Hash `9bc69ec95e`:
  - `sofia_institucional_base(1).jsonl` / `contacto-general-dif-zapopan-001` / DIF Zapopan - Contacto general y sede principal
  - `sofia_capa_institucional_dif_zapopan(1).jsonl` / `contacto-general-dif-zapopan-001` / DIF Zapopan - Contacto general y sede principal

- Hash `b57afc89cd`:
  - `sofia_institucional_base(1).jsonl` / `area-cemam-001` / CEMAM - Centro Metropolitano del Adulto Mayor
  - `sofia_capa_institucional_dif_zapopan(1).jsonl` / `area-cemam-001` / CEMAM - Centro Metropolitano del Adulto Mayor

- Hash `b48e7f5c48`:
  - `sofia_institucional_base(1).jsonl` / `area-habilitecas-001` / Habilitecas - Centros de Desarrollo Comunitario
  - `sofia_capa_institucional_dif_zapopan(1).jsonl` / `area-habilitecas-001` / Habilitecas - Centros de Desarrollo Comunitario

- Hash `edc06f14de`:
  - `sofia_institucional_base(1).jsonl` / `area-nido-caic-001` / Centros NIDO y CAIC
  - `sofia_capa_institucional_dif_zapopan(1).jsonl` / `area-nido-caic-001` / Centros NIDO y CAIC

- Hash `9cccd1bf36`:
  - `sofia_institucional_base(1).jsonl` / `area-trabajo-social-001` / Centro de Trabajo Social
  - `sofia_capa_institucional_dif_zapopan(1).jsonl` / `area-trabajo-social-001` / Centro de Trabajo Social

- Hash `40ab9cd25b`:
  - `sofia_protocolos_orientacion_riesgo(1).jsonl` / `protocolo-riesgo-001` / Protocolo de orientación en casos de riesgo, violencia o emergencia
  - `sofia_capa_institucional_dif_zapopan(1).jsonl` / `protocolo-riesgo-001` / Protocolo de orientación en casos de riesgo, violencia o emergencia

- Hash `02d1f3e4be`:
  - `sofia_protocolos_orientacion_riesgo(1).jsonl` / `area-uavifam-001` / UAVIFAM - Unidad de Atención a Víctimas de Violencia Intrafamiliar
  - `sofia_capa_institucional_dif_zapopan(1).jsonl` / `area-uavifam-001` / UAVIFAM - Unidad de Atención a Víctimas de Violencia Intrafamiliar

- Hash `7f2d9a62a9`:
  - `sofia_protocolos_orientacion_riesgo(1).jsonl` / `area-uavv-001` / UAVV - Unidad de Acompañamiento a Víctimas de Violencia
  - `sofia_capa_institucional_dif_zapopan(1).jsonl` / `area-uavv-001` / UAVV - Unidad de Acompañamiento a Víctimas de Violencia

- Hash `f9189adf4b`:
  - `sofia_protocolos_orientacion_riesgo(1).jsonl` / `area-personas-mayores-riesgo-001` / Unidad de Atención a Casos - Personas mayores en maltrato, abandono u omisión de cuidados
  - `sofia_capa_institucional_dif_zapopan(1).jsonl` / `area-personas-mayores-riesgo-001` / Unidad de Atención a Casos - Personas mayores en maltrato, abandono u omisión de cuidados

- Hash `7a3b9aec52`:
  - `sofia_capa_institucional_dif_zapopan(1).jsonl` / `ubicacion-habiliteca-001` / Habiliteca No. 1 Paraísos del Collí
  - `sofia_ubicaciones_institucionales (1).jsonl` / `ubicacion-habiliteca-001` / Habiliteca No. 1 Paraísos del Collí
  - `sofia_ubicaciones_institucionales_con_maps_url.jsonl` / `ubicacion-habiliteca-001` / Habiliteca No. 1 Paraísos del Collí

- Hash `ecaa1a4efe`:
  - `sofia_capa_institucional_dif_zapopan(1).jsonl` / `ubicacion-habiliteca-002` / Habiliteca No. 2 Venta del Astillero
  - `sofia_ubicaciones_institucionales (1).jsonl` / `ubicacion-habiliteca-002` / Habiliteca No. 2 Venta del Astillero
  - `sofia_ubicaciones_institucionales_con_maps_url.jsonl` / `ubicacion-habiliteca-002` / Habiliteca No. 2 Venta del Astillero

- Hash `6d323cfe3f`:
  - `sofia_capa_institucional_dif_zapopan(1).jsonl` / `ubicacion-habiliteca-003` / Habiliteca No. 3 Santa Ana Tepatitlán
  - `sofia_ubicaciones_institucionales (1).jsonl` / `ubicacion-habiliteca-003` / Habiliteca No. 3 Santa Ana Tepatitlán
  - `sofia_ubicaciones_institucionales_con_maps_url.jsonl` / `ubicacion-habiliteca-003` / Habiliteca No. 3 Santa Ana Tepatitlán

- Hash `0dd9d7c3f2`:
  - `sofia_capa_institucional_dif_zapopan(1).jsonl` / `ubicacion-habiliteca-004` / Habiliteca No. 4 El Batán
  - `sofia_ubicaciones_institucionales (1).jsonl` / `ubicacion-habiliteca-004` / Habiliteca No. 4 El Batán
  - `sofia_ubicaciones_institucionales_con_maps_url.jsonl` / `ubicacion-habiliteca-004` / Habiliteca No. 4 El Batán

- Hash `f107fe414d`:
  - `sofia_capa_institucional_dif_zapopan(1).jsonl` / `ubicacion-habiliteca-010` / Habiliteca No. 10 Francisco Sarabia
  - `sofia_ubicaciones_institucionales (1).jsonl` / `ubicacion-habiliteca-010` / Habiliteca No. 10 Francisco Sarabia
  - `sofia_ubicaciones_institucionales_con_maps_url.jsonl` / `ubicacion-habiliteca-010` / Habiliteca No. 10 Francisco Sarabia

- Hash `80ee3a58db`:
  - `sofia_capa_institucional_dif_zapopan(1).jsonl` / `ubicacion-habiliteca-013` / Habiliteca No. 13 Atemajac
  - `sofia_ubicaciones_institucionales (1).jsonl` / `ubicacion-habiliteca-013` / Habiliteca No. 13 Atemajac
  - `sofia_ubicaciones_institucionales_con_maps_url.jsonl` / `ubicacion-habiliteca-013` / Habiliteca No. 13 Atemajac

- Hash `8c9a5e11a1`:
  - `sofia_capa_institucional_dif_zapopan(1).jsonl` / `ubicacion-kokone-015` / Habiliteca No. 15 San Juan de Ocotán (KOKONE)
  - `sofia_ubicaciones_institucionales (1).jsonl` / `ubicacion-kokone-015` / Habiliteca No. 15 San Juan de Ocotán (KOKONE)
  - `sofia_ubicaciones_institucionales_con_maps_url.jsonl` / `ubicacion-kokone-015` / Habiliteca No. 15 San Juan de Ocotán (KOKONE)

- Hash `8d2fd02487`:
  - `sofia_capa_institucional_dif_zapopan(1).jsonl` / `ubicacion-habiliteca-016` / Habiliteca No. 16 Vista Hermosa
  - `sofia_ubicaciones_institucionales (1).jsonl` / `ubicacion-habiliteca-016` / Habiliteca No. 16 Vista Hermosa
  - `sofia_ubicaciones_institucionales_con_maps_url.jsonl` / `ubicacion-habiliteca-016` / Habiliteca No. 16 Vista Hermosa

- Hash `96efa2b9c0`:
  - `sofia_capa_institucional_dif_zapopan(1).jsonl` / `ubicacion-habiliteca-017` / Habiliteca No. 17 Lomas de Tabachines
  - `sofia_ubicaciones_institucionales (1).jsonl` / `ubicacion-habiliteca-017` / Habiliteca No. 17 Lomas de Tabachines
  - `sofia_ubicaciones_institucionales_con_maps_url.jsonl` / `ubicacion-habiliteca-017` / Habiliteca No. 17 Lomas de Tabachines

- Hash `ae1ba146b1`:
  - `sofia_capa_institucional_dif_zapopan(1).jsonl` / `ubicacion-habiliteca-018` / Habiliteca No. 18 Villas de Guadalupe
  - `sofia_ubicaciones_institucionales (1).jsonl` / `ubicacion-habiliteca-018` / Habiliteca No. 18 Villas de Guadalupe
  - `sofia_ubicaciones_institucionales_con_maps_url.jsonl` / `ubicacion-habiliteca-018` / Habiliteca No. 18 Villas de Guadalupe

- Hash `35d00c0f76`:
  - `sofia_capa_institucional_dif_zapopan(1).jsonl` / `ubicacion-habiliteca-019` / Habiliteca No. 19 Jardines de Nuevo México
  - `sofia_ubicaciones_institucionales (1).jsonl` / `ubicacion-habiliteca-019` / Habiliteca No. 19 Jardines de Nuevo México
  - `sofia_ubicaciones_institucionales_con_maps_url.jsonl` / `ubicacion-habiliteca-019` / Habiliteca No. 19 Jardines de Nuevo México

- Hash `4185149cef`:
  - `sofia_capa_institucional_dif_zapopan(1).jsonl` / `ubicacion-habiliteca-020` / Habiliteca No. 20 Arenales Tapatíos
  - `sofia_ubicaciones_institucionales (1).jsonl` / `ubicacion-habiliteca-020` / Habiliteca No. 20 Arenales Tapatíos
  - `sofia_ubicaciones_institucionales_con_maps_url.jsonl` / `ubicacion-habiliteca-020` / Habiliteca No. 20 Arenales Tapatíos

- Hash `582cca66e6`:
  - `sofia_capa_institucional_dif_zapopan(1).jsonl` / `ubicacion-cres-001` / CRES Villa la Loma
  - `sofia_ubicaciones_institucionales (1).jsonl` / `ubicacion-cres-001` / CRES Villa la Loma
  - `sofia_ubicaciones_institucionales_con_maps_url.jsonl` / `ubicacion-cres-001` / CRES Villa la Loma

- Hash `8ba58c2d6f`:
  - `sofia_capa_institucional_dif_zapopan(1).jsonl` / `ubicacion-oficinas-centrales-modulo-f` / Oficinas Centrales DIF Zapopan Módulo F
  - `sofia_ubicaciones_institucionales (1).jsonl` / `ubicacion-oficinas-centrales-modulo-f` / Oficinas Centrales DIF Zapopan Módulo F
  - `sofia_ubicaciones_institucionales_con_maps_url.jsonl` / `ubicacion-oficinas-centrales-modulo-f` / Oficinas Centrales DIF Zapopan Módulo F

## Programas con nombre repetido que NO deben eliminarse automáticamente

- **Atención psicológica**: conservar por audiencia/ruta.
  - `programa_nna_atencion_psicologica` | audiencia: `niñas_niños_adolescentes` | url: `https://www.difzapopan.gob.mx/mujeres-y-hombres/atencion-psicologica/`
  - `programa_mh_atencion_psicologica` | audiencia: `mujeres_hombres` | url: `https://www.difzapopan.gob.mx/mujeres-y-hombres/atencion-psicologica/`

- **Brigadas comunitarias de salud**: conservar por audiencia/ruta.
  - `programa_nna_brigadas_salud` | audiencia: `niñas_niños_adolescentes` | url: `https://www.difzapopan.gob.mx/ninas-y-ninos/brigadas-comunitarias/`
  - `programa_mh_brigadas_salud` | audiencia: `mujeres_hombres` | url: `https://www.difzapopan.gob.mx/mujeres-y-hombres/brigadas-comunitarias/`

- **Huertos urbanos**: conservar por audiencia/ruta.
  - `programa_nna_huertos_urbanos` | audiencia: `niñas_niños_adolescentes` | url: `https://www.difzapopan.gob.mx/ninas-y-ninos/huertos-urbanos/`
  - `programa_mh_huertos_urbanos` | audiencia: `mujeres_hombres` | url: `https://www.difzapopan.gob.mx/mujeres-y-hombres/huertos-urbanos/`
  - `programa_pm_huertos_urbanos` | audiencia: `personas_mayores` | url: `https://www.difzapopan.gob.mx/personas-mayores/huertos-urbanos/`

- **Centro de Trabajo Social**: conservar por audiencia/ruta.
  - `programa_nna_centro_trabajo_social` | audiencia: `niñas_niños_adolescentes` | url: `https://www.difzapopan.gob.mx/ninas-y-ninos/centro-de-trabajo-social/`
  - `programa_mh_centro_trabajo_social` | audiencia: `mujeres_hombres` | url: `https://www.difzapopan.gob.mx/mujeres-y-hombres/centro-de-trabajo-social/`
  - `programa_pm_centro_trabajo_social` | audiencia: `personas_mayores` | url: `https://www.difzapopan.gob.mx/personas-mayores/centro-de-trabajo-social/`

- **Programa de asistencia alimentaria**: conservar por audiencia/ruta.
  - `programa_mh_asistencia_alimentaria` | audiencia: `mujeres_hombres` | url: `https://www.difzapopan.gob.mx/mujeres-y-hombres/programa-de-atencion-alimentaria-a-personas-vulnerabilidad/`
  - `programa_pm_asistencia_alimentaria` | audiencia: `personas_mayores` | url: `https://www.difzapopan.gob.mx/personas-mayores/programa-de-asistencia-alimentaria-a-grupos-prioritarios/`

## Conteo final recomendado
- Institucional base: 7
- Protocolos / riesgo: 4
- Programas y servicios: 38
- Centros activos con coordenadas: 43
- Total master depurado: 92 registros
