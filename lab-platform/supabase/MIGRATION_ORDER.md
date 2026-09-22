# Orden de migraciones de fase 2

Estas migraciones todavía no fueron aplicadas en Supabase. Ejecutarlas en una transacción o entorno de prueba respetando este orden:

1. `migration_perfiles_self_update_rls.sql`
2. `migration_competencia_2026.sql`
3. `migration_historical_clubs.sql`
4. `migration_fase2_stats_standings.sql`
5. `migration_historical_leaders.sql`
6. `migration_sponsors.sql`
7. `migration_import_sync.sql`

Antes de producción hay que ejecutar los preflight de datos, regenerar `database.types.ts` desde la base resultante y probar RLS con usuarios anónimo, autenticado y administrador.
