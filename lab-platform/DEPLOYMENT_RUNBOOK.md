# Runbook de despliegue fase 2

Este procedimiento evita aplicar migraciones nuevas directamente sobre producción sin una copia y una validación previa.

## Preflight obligatorio

1. Confirmar que el commit contiene sólo cambios intencionales y que no incluye `.env`, claves privadas, ZIP ni bases de datos.
2. Crear un backup de Supabase y registrar fecha, proyecto y responsable.
3. Ejecutar las migraciones en este orden:

   ```text
   supabase/migration_perfiles_self_update_rls.sql
   supabase/migration_competencia_2026.sql
   supabase/migration_historical_clubs.sql
   supabase/migration_fase2_stats_standings.sql
   supabase/migration_historical_leaders.sql
   supabase/migration_sponsors.sql
   supabase/migration_import_sync.sql
   supabase/migration_mvp_voting_security.sql
   supabase/migration_sheets_atomic_apply.sql
   supabase/migration_ballclubz_import.sql
   supabase/migration_normalize_club_slugs.sql
   ```

4. Ejecutar primero el mismo orden en una base de staging con una copia anonimizada de los datos.
5. Regenerar `src/lib/database.types.ts` desde la base resultante y revisar el diff.
6. Configurar en el hosting, sin copiarlas al repositorio:
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`
    - `GOOGLE_SHEETS_ID`
    - `MVP_VOTE_HASH_SECRET`
7. Compartir la planilla con el email de la cuenta de servicio y ejecutar el botón de verificación de cabeceras.
8. Resolver los diez conflictos históricos antes de pasar un lote a `listo`.

## Flujo seguro de Google Sheets

1. `VERIFICAR Y PREPARAR PLANILLA` sólo comprueba cabeceras y crea cabeceras si la pestaña está vacía.
2. `ANALIZAR CAMBIOS` lee las cuatro pestañas, valida claves, calcula hashes y crea un lote en estado `preview` o `bloqueado`.
3. Los cambios externos quedan en `/admin/sincronizacion` como conflictos pendientes. Esta etapa no modifica partidos ni estadísticas.
4. Resolver los conflictos individualmente. La aplicación de filas aprobadas debe habilitarse sólo después de validar el esquema real y los mapeos de clubes/jugadores.
5. `APLICAR LOTE APROBADO` exige cero conflictos pendientes, valida temporada, clubes, jugadores e IP antes de escribir, upsertea partidos/estadísticas y actualiza hashes. Ante un error de base, el lote queda `fallido` para revisión.
6. El apply compara la planilla contra la instantánea del preview. Si una fila fue agregada, borrada o modificada después de aprobar el lote, se bloquea y exige generar un preview nuevo.
7. Preview y apply se persisten mediante RPC transaccionales. Un reintento de un lote ya aplicado no vuelve a escribir y responde como idempotente.

La ausencia de una clave externa, las claves duplicadas y las cabeceras incompatibles bloquean el lote completo.

## Flujo seguro de BallClubz

1. El administrador carga el HTML de `Composite Box Score` desde `/admin/importaciones`; los archivos de totales acumulados no se importan como partidos.
2. El servidor procesa únicamente el texto de `<pre>`, limita el archivo a 2 MB y nunca renderiza ni ejecuta el HTML.
3. El preview identifica el partido por `t` + `boxscore`, muestra resultado y estadísticas, y exige mapear todos los clubes y jugadores desconocidos.
4. La temporada se determina por el año de la fecha del partido y los clubes deben estar inscriptos y visibles en esa temporada.
5. La aplicación reemplaza de forma transaccional las estadísticas del mismo box score, recalcula posiciones y admite reintentos sin duplicados.
6. Los acumulados de equipo se reservan para una futura conciliación; las métricas derivadas se calculan desde los datos base de LAB.

## Verificación posterior

- `npm test`
- `npx tsc --noEmit`
- `npm run lint` (sin errores; las advertencias existentes deben quedar registradas)
- `npm run build`
- `npx supabase db query --linked --file supabase/test_sheets_atomic.sql` en staging; la prueba finaliza con `ROLLBACK`.
- `npx supabase db query --linked --file supabase/test_ballclubz_atomic.sql` en staging; valida rollback, aplicación e idempotencia y finaliza con `ROLLBACK`.
- Login, RLS y permisos de `admin_liga`.
- Temporada 2026, fixture, standings, estadísticas, líderes, sponsors y CTA de YouTube.
- Confirmar que Arias y Falcons no se muestran en la operación 2026 y que sus datos históricos no fueron eliminados.

## Regla de rollback

No se deshacen migraciones destructivamente desde el dashboard. Ante un fallo, detener el despliegue, conservar los logs, revertir la aplicación al build anterior y restaurar desde el backup sólo después de evaluar el impacto.

Las importaciones iScore y la sincronización bidireccional no deben ejecutarse durante el despliegue. Se habilitan en una operación separada y auditable.
