# Propuesta de anotación en vivo — LAB

**Borrador de inversión y alcance · 1 de octubre de 2026**

## Objetivo

Permitir que un operador autorizado registre información durante el partido desde un dispositivo móvil y que LAB publique un marcador actualizado, con trazabilidad y una versión oficial al cerrar el juego.

No presupone una API de BallClubz: la operación actual entrega HTML después de cada partido. No se propone scraping no autorizado ni reemplazar al proveedor de manera inmediata.

## Alternativa A — Piloto de marcador en vivo

- Seleccionar partido existente y planteles validados.
- Registrar marcador por entradas, estado, entrada actual y notas operativas.
- Un operador con escritura por partido; relevos explícitos y bloqueo/versionado para evitar colisiones.
- Publicación de marcador con actualización periódica; tiempo de actualización y concurrencia a dimensionar.
- Correcciones auditables y cierre por revisor autorizado.
- Vincular posteriormente el HTML BallClubz para estadísticas finales, con detección de diferencias respecto del resultado registrado durante el partido.

**No incluye** estadísticas completas generadas jugada a jugada. Es la opción recomendada como primer piloto por menor complejidad y dependencia de entrenamiento.

## Alternativa B — Anotación jugada a jugada

Incluye lo anterior y un motor de eventos: turnos al bate, hits, bases por bolas, ponches, outs, errores, avances, carreras, sustituciones y cambios de lanzador. Genera box score y métricas desde eventos, con deshacer/corregir y reconstrucción verificable.

Requiere definir reglas deportivas y casos especiales: bateador designado, reemplazos, corredores de cortesía, carreras limpias, jugadas múltiples, errores, suspendidos legales/cancelados y reaperturas. No se puede estimar correctamente sin cerrar esas reglas y ejemplos con los anotadores.

## Condiciones técnicas comunes

- Identidades estables, roster por temporada/club y correspondencia explícita con fuentes externas.
- Permisos por función; separar anotador, revisor y administrador.
- Event ID único para reintentos idempotentes; secuencia/versionado y auditoría.
- Probar dos dispositivos intentando editar el mismo juego antes de habilitar concurrencia.
- Modo sin conectividad: distinguir borrador local de información publicada; cola de eventos, indicador de sincronización y resolución de conflictos. Alcance offline a cotizar; no prometerlo como parte implícita del piloto A.
- Recuperación de sesión y respaldo de eventos; evitar dependencia exclusiva del almacenamiento del teléfono.
- Conservar resultado oficial y posibilidad de conciliación con HTML final sin doble cómputo de estadísticas.
- Cerrar la votación MVP y actualizar posiciones/líderes solamente según las reglas vigentes y el cierre oficial, no por eventos parciales.

## Fases propuestas

1. Descubrimiento: roles, conectividad, dispositivos, roster, categorías y reglas.
2. Prototipo con datos de prueba y escenarios deportivos conocidos.
3. Piloto en un partido acordado, sin sustituir la anotación oficial.
4. Conciliación con la planilla/HTML oficial y ajustes.
5. Despliegue gradual, capacitación y manual de operación/reversión.

Duraciones y fecha de piloto pendientes de estimar tras descubrimiento. No se compromete entrega antes del 31 de octubre en este documento.

## Criterios de aceptación

- El marcador y la secuencia de entradas coinciden con un juego de referencia.
- Reenviar un evento no duplica carreras ni estadísticas.
- Usuario sin permiso no anota ni cierra el juego.
- Corte y recuperación de conexión no pierde eventos dentro del alcance offline contratado.
- Corrección deja historial y recalcula la vista sin doble contabilización.
- Partido cerrado coincide con fuente oficial y revisión de Wilmer/Matías.
- Se documentan tiempos de publicación medidos, límites y pasos de contingencia.

## Inversión y dependencias

Cotizar por separado descubrimiento, piloto A, evolución B, offline, capacitación, soporte especial y costos de infraestructura. Completar moneda, impuestos, forma de pago e hitos; no hay precios definidos.

LAB debe aportar ejemplos oficiales, roster actualizado, operador/revisor del piloto, reglas especiales y acceso autorizado a exportaciones. Hardware, internet, producción audiovisual y permisos del proveedor quedan fuera salvo acuerdo expreso.

## Recomendación

Empezar con A y mantener BallClubz/HTML como fuente estadística final. Evaluar B después de un piloto exitoso y una conciliación deportiva documentada. La inversión en vivo es un evolutivo independiente del mantenimiento de la web existente.

Fuentes: flujo BallClubz implementado, modelo de partidos/estadísticas de LAB, acuerdos de Google Sheets y requerimiento de anotación móvil registrado en ficha del proyecto. Las alternativas son propuestas, no decisiones aprobadas por el cliente.
