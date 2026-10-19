# Consulta diaria de staging

Workflow: `.github/workflows/supabase-staging-check.yml`.

- Horario: diariamente a las **07:17 UTC / 04:17 Argentina** (`17 7 * * *`).
- Proyecto permitido: únicamente staging `wnribimpzdoebeqtqxbs`. El script rechaza producción y otros hosts.
- Operación: GET a `/rest/v1/temporadas?select=id&limit=1`, sin caché. No modifica filas, ejecuta migraciones, crea usuarios ni usa un PAT o clave administradora.
- Credenciales: secretos GitHub `LAB_STAGING_SUPABASE_URL` y `LAB_STAGING_SUPABASE_PUBLISHABLE_KEY`. Acepta publishable o un JWT anon del proyecto; rechaza service_role/secret.
- Máximo tres intentos para errores transitorios, 15 segundos de timeout por petición. No registra claves ni filas consultadas.
- Si falla se abre una única incidencia pública con enlace al run (sin detalles sensibles). Revisar las preferencias de notificaciones de GitHub; no se garantiza entrega por email/WhatsApp.
- Permite ejecución manual mediante Actions → Supabase staging daily check → Run workflow.

## Límites

Es un control de disponibilidad con actividad mínima: **no garantiza** que Supabase no pause un proyecto gratuito ni revive uno ya pausado. No se confirmó la causa original del estado INACTIVE.

GitHub puede demorar o descartar ejecuciones programadas y deshabilitarlas en repositorios públicos después de 60 días sin actividad del repositorio. No se agrega actividad ficticia a Git para evitarlo: comprobar periódicamente que la tarea siga habilitada. No equivale a un SLA de disponibilidad.

Fuentes: https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule y https://supabase.com/docs/guides/platform/going-into-prod#availability.

Prueba local sin credenciales: `node --test scripts/test-supabase-staging.mjs`.
