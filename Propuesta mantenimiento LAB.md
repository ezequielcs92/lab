# Propuesta de mantenimiento de temporada — LAB

**Borrador para revisión comercial · 1 de octubre de 2026**

## Objetivo y período

Acompañar la operación de la plataforma durante los cuatro meses de temporada, con foco en continuidad del sitio y soporte a quienes cargan información deportiva. Inicio previsto de competencia: 31 de octubre de 2026. Confirmar fechas de contratación y cierre antes de emitir la propuesta definitiva.

El servicio no está contratado actualmente. Esta propuesta no modifica el alcance ya entregado ni constituye un compromiso de disponibilidad hasta su aprobación.

## Alcance propuesto

- Diagnóstico y corrección de errores reproducibles de funcionalidades existentes.
- Soporte para carga de fixture, resultados y estadísticas desde el panel.
- Asistencia con importación de HTML BallClubz y sincronización manual de Google Sheets; revisión de conflictos, sin sobreescribir datos sin autorización.
- Soporte al flujo de enlaces de YouTube, cuenta regresiva y grabaciones. No incluye producción de video ni administración del canal.
- Asistencia para actualización de sponsors con los materiales provistos por LAB.
- Revisión preventiva de despliegues, disponibilidad y errores de servicios.
- Actualizaciones de dependencias priorizadas por riesgo, probadas antes de publicar.
- Registro de incidentes, acciones y pendientes; resumen mensual de servicio.

La carga y la validación oficial de los datos deportivos siguen siendo responsabilidad de LAB. El soporte técnico no reemplaza al anotador ni al responsable del torneo.

## Operación y canales

Condiciones solicitadas por LAB: Wilmer Castellano y Matías Ochoa como solicitantes autorizados; WhatsApp; atención diurna en días hábiles; prioridad los lunes para incidentes del fin de semana. En fines de semana, cobertura únicamente de partidos importantes coordinados previamente.

**A cerrar comercialmente:** horario y zona horaria, cupo mensual, cantidad de partidos especiales, anticipación necesaria, tiempos objetivo de primera respuesta y resolución, responsable de guardia y costo de excedentes. No se promete atención 24/7 ni resolución inmediata.

| Prioridad | Ejemplo | Tratamiento propuesto |
|---|---|---|
| Crítica | Sitio caído, imposibilidad general de operar | Diagnóstico prioritario dentro de cobertura acordada; comunicar alternativa y estado |
| Alta | Importación o cálculo deportivo bloqueado | Reproducir con archivo/lote, corregir en staging y validar antes de producción |
| Normal | Ayuda de carga, sponsor, detalle visual | Agrupar y programar dentro del cupo |
| Evolutiva | Funcionalidad nueva o cambio de reglas | Evaluar y cotizar por separado |

## Exclusiones

- Nuevo módulo de anotación en vivo, integraciones nuevas o rediseños.
- Carga editorial/deportiva masiva, traducciones y producción audiovisual.
- Reconstrucción de histórico no incluido o corrección de fuentes oficiales por cuenta del soporte.
- Tarifas y fallas propias de Vercel, Supabase, Cloudflare, Google o YouTube.
- Compra/administración de hardware, conectividad de estadios y viajes.
- Guardias fuera del horario pactado no coordinadas previamente.

## Entregables y aceptación

Registro de incidentes con evidencia, versión publicada y prueba de resolución; resumen mensual; listado priorizado de mejoras fuera de alcance. Para cambios de datos: evidencia fuente, respaldo de valores previos y autorización del responsable deportivo.

## Inversión pendiente de cotización

Definir abono mensual, cupo de horas o incidentes, valor de excedente, cobertura de partidos especiales, moneda, impuestos, facturación y forma de pago. Los servicios de infraestructura se presupuestan o pagan por separado según titularidad. **No hay importes ni descuento comprometidos en este borrador.**

## Próximo paso

Aprobar alcance y cobertura; completar cuadro económico; acordar calendario de partidos especiales y circuito de autorización; formalizar el servicio antes del comienzo de temporada.

Fuentes: reunión LAB del 03/09/2026, definiciones finales del 20/09/2026 (sección Mantenimiento) y ficha del cliente en la bóveda. Se toman las condiciones posteriores a la reunión como vigentes.
