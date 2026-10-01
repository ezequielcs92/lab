# Conciliacion de ponches 2017/2018

Fecha: 2026-10-01. Correccion aplicada y verificada en staging y produccion por autorizacion del usuario.

Causa: el importador leia SO, pero los CSV de pitcheo usan K. Los valores quedaron preservados en extras.K. Se cotejaron las 667 filas contra CSV originales, deduplicando partidos y vinculando por clave externa, club y nombre fuente. Cero diferencias.

| Anio | Filas | SO importado | K fuente |
|---|---:|---:|---:|
| 2017 | 368 | 0 | 1425 |
| 2018 | 299 | 0 | 1007 |

Correccion: supabase/correct_iscore_strikeouts_review.sql. Aplicada primero en staging y luego en produccion; ambas bases ahora tienen SO=1425 en 2017 y SO=1007 en 2018, cero diferencias respecto de extras.K. La auditoria conserva 667 valores previos. El fingerprint de todos los campos excepto so/updated_at se mantuvo identico en cada base: ningun otro dato se altero. No se reimportaron jugadores ni partidos. El codigo reconoce K/SO para futuras importaciones y las fichas muestran los ponches historicos y acumulados.

Comando: node scripts/reconcile-iscore-strikeouts.mjs <raiz-extraida>
