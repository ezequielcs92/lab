# Evidencia de avances mientras se esperan insumos

Fecha: 2026-10-01. Avances autorizados para publicacion; correccion de ponches aplicada y verificada en staging y produccion.

## Ponches históricos

`scripts/reconcile-iscore-strikeouts.mjs` compara las 667 filas de producción con los CSV originales mediante partido externo, club y nombre fuente. Encontró K=1425 (2017) y K=1007 (2018) frente a SO=0 en base. La corrección portable por claves está en `supabase/correct_iscore_strikeouts_review.sql`; auditada y con precondiciones. La versión `test_iscore_strikeouts_rollback.sql` se ejecutó en staging con ROLLBACK y no dejó datos corregidos.

No aplicar las viejas migraciones ni reimportar partidos para corregir un campo. La correccion definitiva se aplico primero en staging y luego en produccion: 1425 ponches en 2017 y 1007 en 2018, cero diferencias con fuentes, 667 registros auditados. Fingerprints de otros campos antes/despues identicos. Retirado el ocultamiento temporal de SO en perfiles para esta publicacion.

## PDF e identidades

`scripts/audit-iscore-2019.py` extrae 27/27 resultados y fechas; identifica una fecha discordante (Juego 21) y orden de carpeta diferente de la cabecera PDF en Juegos 1 y 20. Las participaciones PDF y los acumulados XLSX no cubren necesariamente el mismo conjunto de juegos. No se reescribió el histórico 2019.

`REVISION_IDENTIDADES_2019.md` contiene 14 grupos normalizados con club, fase y métricas, listos para preguntar a Wilmer. Mantiene abiertos los casos y no fusiona nombres por sí solo.

Los resultados son un cotejo documental automatizado con revisión visual puntual del Juego 20; no una certificación de legalidad de todos los juegos. Rutas y páginas de evidencia están en `COTEJO_PDF_2019.json`.

## Pruebas

- Dos nuevas suites de integración de handlers: 11 casos BallClubz y 14 Sheets.
- Cubren falta de sesión, roles insuficientes, archivos inválidos/límite, lote ausente, fuente incorrecta, estados bloqueados, conflictos pendientes y respuesta idempotente sin llamadas de escritura.
- Supabase y Google Sheets están mockeados: no son pruebas end-to-end de terceros ni sustituyen transacciones reales/RLS.
- `supabase/test_iscore_summary_rls.sql` se ejecutó en staging con ROLLBACK: lectura pública de métricas, denegación de raw_stats/manifiesto y mutaciones anónimas; RLS del manifiesto sin JWT.
- Tres regresiones Node prueban alias K, SO y prioridad de K.
- Las pruebas de origen/CSRF ya existentes se ejecutan en la suite general. Estas nuevas suites llaman directamente handlers y no ejercitan el middleware.
- Resultado integrado: 79 pruebas Vitest, 5 pruebas Python del XLSX y 3 regresiones Node pasan; TypeScript/build de 49 rutas pasan; ESLint sin errores (25 warnings preexistentes).

Hallazgo para seguimiento: en `src/app/api/admin/sheets/apply/route.ts`, `request.json()` está antes del bloque `try`; un JSON malformado no tiene manejo local de error 400. No se cambió ese comportamiento en esta tarea de ampliación de pruebas.

## Propuestas e imágenes

Documentos de propuestas en raíz del proyecto: `Propuesta mantenimiento LAB.md` y `Propuesta anotacion en vivo LAB.md`. Son borradores de alcance para revisión comercial, sin precios ni SLA inventados ni compromisos de implementación.

`PLAN_OPTIMIZACION_GALERIA.md` y `GALERIA_INVENTARIO.json` documentan 152 imágenes, 1.234.501.896 bytes y piloto WebP en memoria sobre diez archivos. Ningún original fue modificado, borrado ni subido.

## Comandos de reproducción

```powershell
node scripts/reconcile-iscore-strikeouts.mjs "C:\Users\ezequ\AppData\Local\Temp\opencode\lab-historicos\extracted"
node scripts/test-iscore-strikeouts.mjs
python -B scripts/audit-iscore-2019.py "C:\Users\ezequ\Downloads\ESTADISTICAS 2019\ESTADÍSTICAS 2019"
python -B scripts/audit-local-gallery.py
npm test
npx tsc --noEmit
```

Las pruebas SQL deben apuntar expresamente a staging `wnribimpzdoebeqtqxbs`, no a producción.
