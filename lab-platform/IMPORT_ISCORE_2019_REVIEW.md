# Revisión previa de importación iScore 2019

El preview es de sólo lectura. No modifica archivos ni escribe en Supabase.

## Resultado del inventario

- La carpeta contiene 10 libros XLSX: 6 de temporada regular y 4 de semifinales.
- Los libros tienen hojas de `Batting`, `Pitching` y `Fielding`; el preview encontró 506 filas de jugador entre todas las hojas, sin encabezados requeridos faltantes ni nombres repetidos dentro de una misma hoja.
- La temporada regular también incluye 27 scorecards PDF individuales.
- No se encontraron CSV de partido.
- El club Vikingos no tiene mapeo histórico en la base.
- Águilas y Cóndores tienen mapeos candidatos conocidos para clubes históricos, pero se debe confirmar que se aplican a 2019.
- La carpeta de `Juego 21` indica 25-09-2021; el scorecard PDF indica 25-09-2019.

## Diferencias de formato

- Las planillas XLSX son acumulados por equipo/temporada, no estadísticas por juego.
- Los encabezados varían entre libros: pitcheo usa `K` en algunos libros y `SO` no está presente de forma uniforme; el fildeo usa `ERR` en lugar de `E` y columnas diferentes entre Vikingos y los demás equipos.
- Playoffs está separado por equipo en cuatro libros y requiere conservar `fase=playoffs`.
- Los PDF contienen scorecards con resultados, jugadas por inning y resúmenes de pitcheo, pero no están en un formato de tabla CSV importable.

## Compatibilidad actual

El importador histórico existente procesa seis CSV por partido (`statsHome/Visitor` de bateo, pitcheo y fildeo). El preview de CSV, si se ejecuta sobre 2019, detecta ahora los 27 scorecards y 10 libros como formatos no compatibles y genera 37 bloqueos; `iscore:apply` aborta antes de generar o ejecutar SQL.

Para inventariar XLSX:

```powershell
python scripts/preview-iscore-xlsx.py "C:\Users\ezequ\Downloads\ESTADISTICAS 2019\ESTADÍSTICAS 2019"
```

Agregar totales de temporada directamente a tablas que exigen `partido_id` inventaría partidos. Antes de importar hay que decidir entre guardar los XLSX en un modelo de estadísticas agregadas por jugador/temporada/fase, o desarrollar un parser por partido para los scorecards PDF. No se aplicaron datos.

## Decisiones pendientes

1. Confirmar el club histórico correspondiente a Vikingos y validar para 2019 los aliases de Águilas y Cóndores.
2. Elegir la fuente autoritativa de estadísticas anuales y cómo diferenciar reportes regulares de semifinales.
3. Revisar la fecha del Juego 21 con el cliente; la evidencia dentro del PDF apunta a 25-09-2019.
4. Conciliar identidades de jugadores antes de asociar nombres repetidos a un mismo `stable_id`.
