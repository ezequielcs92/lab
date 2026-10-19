# Implementación de pendientes de Fase 2

Fecha: 2026-10-19. Sigue a `REVISION_PENDIENTES_FASE2_2026-10-19.md` y a la autorización de implementar y publicar los puntos pendientes. Migración aplicada y verificada en staging y producción; implementación incluida en esta tanda de publicación.

## Implementación incluida

- **Punto 2:** formateo explícito en `America/Argentina/Buenos_Aires` para fixture, detalle, carrusel, transmisión y listados administrativos de partidos/estadísticas. Sin cambio de timestamps existentes: un registro 13:00 UTC se presenta 10:00 Argentina. Las horas deportivas de registros anteriores mal cargados deben confirmarse antes de alterarlas.
- **Punto 3, consistencia adicional:** el banner de transmisión también muestra visitante antes que local y marcadores en ese mismo orden; antes invertía los lados respecto del fixture.
- **Punto 9:** vista `Tabla de estadísticas` en `/estadisticas?vista=tabla`, alternativa a Líderes. Bateo, pitcheo y fildeo; filtros por temporada/fase/club, métricas disponibles, orden configurable y páginas de 50. No aplica mínimos de clasificación de líderes. En históricos no se ofrece filtro por club de carrera: se aclara que el club mostrado es el de la ficha de referencia. No se inventaron G, PA, WAR, edad ni otras columnas de la captura sin una fuente aprobada.
- **Punto 10, explicación:** formulario de jugadores distingue slug (URL), stable_id (persona) e ID de inscripción (temporada/club). Se preservan filas históricas e identidades. Los 14 nombres multiclub siguen sin fusionarse hasta confirmación de Wilmer.
- **Punto 11:** normalizador de URL pública rechaza localhost, loopback, esquema no HTTPS o valores inválidos y usa el dominio oficial. Compartir/copiar noticias y metadataBase dejan de depender de una URL local mal configurada. Slugs de noticias se codifican como un único segmento.
- **Punto 12:** acumulados de carrera regulares y playoffs independientes en perfiles. Preparadas nuevas vistas históricas por fase para bateo/pitcheo/fildeo, usadas por rankings y tablas. Las vistas históricas anteriores se conservan sin cambios para compatibilidad durante despliegue.
- **Punto 13:** temporadas de perfiles y selectores de estadísticas desde la más antigua a la más nueva.
- **Punto 14:** correo público confirmado por el usuario: `info@ligaargentinabeisbol.com`. Reemplazado en el footer con enlace `mailto:`.

## Migración y verificación

`supabase/migrations/20261019160000_separate_historical_stats_by_phase.sql` agrega vistas `v_stats_*_historico_fase`, con `security_invoker` y los permisos públicos necesarios sobre vistas; no reescribe estadísticas, personas ni partidos.

La migración se aplicó primero en staging y después en producción, antes de desplegar frontend. El test compara cada identidad/fase contra sus filas fuente, convierte innings a outs y prueba acceso anónimo:

```powershell
node scripts/test-historical-phases.mjs
```

El script apunta explícitamente a staging y ejecuta migración + aserciones dentro de una transacción con ROLLBACK. No debe redirigirse a producción como atajo.

Los primeros intentos de prueba devolvieron error 544 al crear el rol temporal por timeout, con staging reportado INACTIVE. Después de que el usuario confirmó su activación, ambos proyectos figuran **ACTIVE_HEALTHY**. Se probó la migración con rollback y luego se aplicó persistentemente en ambos entornos. Las verificaciones posteriores de totales por identidad/fase y acceso anónimo pasaron en staging y producción. No se atribuye la causa anterior a una pausa automática ni se infiere necesidad de plan pago.

Verificación de sólo lectura de vistas ya migradas, con rol y transacción revertidos al terminar:

```powershell
node scripts/test-historical-phases.mjs --verify-only
node scripts/test-historical-phases.mjs --verify-only --project-ref fhyurtioqpfmiwdciylt
```

## Evidencia local

- 135 pruebas Vitest pasan: URL pública, fechas y cruce de medianoche, orden anual, acumulados independientes, paginación/columnas permitidas, consultas de tabla e históricos con fase.
- TypeScript y build de 49 rutas pasan.
- ESLint: cero errores, 25 warnings anteriores.
- Tests de página usan Supabase mockeado y render HTML server-side; no equivalen a una prueba visual interactiva.
- Verificación SQL real de vistas ya migradas en staging y producción: correcta. No se modificaron filas fuente.

## Dependencias de confirmación

1. Correo del footer ya confirmado e implementado localmente; no se verificó entrega del buzón ni se modificó su configuración de correo.
2. Identidad de los 14 grupos multiclub 2019: no fusionar automáticamente por nombre.
3. Comprobar el deployment y los smoke tests públicos de la publicación; evidencia de cierre en la ficha del proyecto.

El sitio sigue activo. La automatización diaria de staging se publicó separadamente y no se altera en esta tanda. El cuestionario raíz permanece intacto y fuera de Git.
