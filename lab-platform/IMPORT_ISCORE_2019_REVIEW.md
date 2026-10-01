# Revisión previa de importación iScore 2019

El preview es de sólo lectura. No modifica los archivos fuente ni escribe en Supabase.

## Resultado del inventario

- La carpeta contiene 10 libros XLSX: 6 de temporada regular y 4 de semifinales.
- Los libros tienen hojas de `Batting`, `Pitching` y `Fielding`; el preview encontró 506 filas de jugador entre todas las hojas, sin encabezados requeridos faltantes ni nombres repetidos dentro de una misma hoja.
- La temporada regular también incluye 27 scorecards PDF individuales.
- No se encontraron CSV de partido.
- Wilmer confirmó para 2019: Águilas → Cachorros, Cóndores → Arias y Vikingos como club histórico independiente.
- La carpeta de `Juego 21` indica 25-09-2021; el scorecard PDF indica 25-09-2019.

## Diferencias de formato

- Las planillas XLSX son acumulados por equipo/temporada, no estadísticas por juego.
- Los encabezados varían entre libros: el pitcheo usa `K`/`SO`; el fildeo usa `ERR` en lugar de `E` y hay columnas diferentes en Vikingos.
- Playoffs está separado por equipo en cuatro libros y requiere conservar `fase=playoffs`.
- Los PDF contienen scorecards con resultados, jugadas por inning y resúmenes de pitcheo, pero no están en un formato de tabla CSV importable.
- 14 nombres aparecen en más de un club en los XLSX. El importador no los fusiona automáticamente entre clubes; crea identidades separadas salvo coincidencia histórica única del mismo club y los deja identificados para revisión posterior.

## Compatibilidad actual

El importador histórico de partidos procesa seis CSV por juego (`statsHome/Visitor` de bateo, pitcheo y fildeo). El nuevo flujo XLSX guarda totales individuales por club/temporada/fase en una tabla separada; no crea registros de partidos ni inventa estadísticas de juego. Conserva todas las columnas originales, además de métricas normalizadas para bateo, pitcheo y fildeo.

El importador registra hashes de los 10 XLSX y 27 PDF en el lote de auditoría. Los PDF originales permanecen en su carpeta fuente y sirven como evidencia para cotejar resultados; no se copian ni modifican.

Para inventariar XLSX:

```powershell
python scripts/preview-iscore-xlsx.py "C:\Users\ezequ\Downloads\ESTADISTICAS 2019\ESTADÍSTICAS 2019"
```

Agregar totales de temporada directamente a tablas que exigen `partido_id` inventaría partidos. El modelo elegido es guardar resúmenes agregados por jugador/club/temporada/fase y mantener los scorecards como evidencia independiente.

El código genera un SQL idempotente de staging, vincula identidades sólo con una coincidencia histórica única del mismo club y guarda los datos crudos para auditoría.

El 2026-10-01 se aplicó la migración y se importaron 506 filas y 171 inscripciones en staging `wnribimpzdoebeqtqxbs`. La comparación de las 506 filas (métricas, columnas originales y hashes), los 10 XLSX y los hashes de 27 PDF devolvió cero diferencias. Una segunda importación conservó IDs y datos sin duplicados. Se verificó acceso con rol `anon` a las vistas completas e históricas. No se crearon partidos 2019; se conservan los 142 partidos históricos. Producción no recibió esta migración ni estos datos.

## Decisiones pendientes

1. Verificar la publicación del código y la visualización pública de 2019; la migración y las 506 filas ya están aplicadas y cotejadas en staging y producción.
2. Revisar los 14 nombres repetidos entre clubes para decidir cuáles corresponden a la misma persona; el flujo actual evita fusionarlos sin evidencia.
3. Revisar la fecha del Juego 21: la carpeta indica 25-09-2021 y el PDF 25-09-2019.

## Comandos

Preview de estructura y cobertura:

```powershell
npm run iscore:xlsx:preview -- "C:\Users\ezequ\Downloads\ESTADISTICAS 2019\ESTADÍSTICAS 2019"
```

Preparar el plan local sin escribir en la base:

```powershell
npm run iscore:xlsx:apply -- "C:\Users\ezequ\Downloads\ESTADISTICAS 2019\ESTADÍSTICAS 2019"
```

Para aplicar, primero debe estar aplicada la migración `20260930195000_add_iscore_season_summaries.sql`; el comando exige `--execute` y una referencia explícita. Staging usa `--staging-ref`; la publicación autorizada en producción usa `--production-ref fhyurtioqpfmiwdciylt`. El proyecto vinculado debe coincidir.

El 2026-10-01 se aplicaron la migración y las 506 filas en producción. La verificación fuente–base devolvió cero diferencias y las vistas son accesibles con rol público. Se corrigió la resolución del club para usar el slug, conservando su nombre institucional existente. La primera transacción fallida quedó revertida íntegramente.

Para cotejar la carga de staging contra las fuentes, sin escrituras:

```powershell
python -B scripts/verify-iscore-xlsx-import.py "C:\Users\ezequ\Downloads\ESTADISTICAS 2019\ESTADÍSTICAS 2019"
```
