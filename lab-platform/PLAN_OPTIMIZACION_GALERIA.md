# Diagnóstico y plan reversible de galería

Fecha: 2026-10-01. Diagnóstico y piloto en memoria; no se movieron ni modificaron imágenes ni registros de producción.

## Inventario medido

- 152 archivos, **1.234.501.896 bytes** (~1,15 GiB).
- 133 JPG (1.210.922.021 bytes) y 19 JPEG (23.579.875 bytes).
- Las diez imágenes más pesadas, todas DAOM, rondan 19–25 MB y alcanzan 7008 px.
- Piloto: autoorientación EXIF, máximo 1920 px, WebP calidad 82. Cada salida en memoria pesa aproximadamente 0,20–0,49 MB. Es una muestra sesgada hacia los archivos más grandes; no extrapolar su ahorro a toda la galería ni asumir aprobación visual.
- Evidencia reproducible: `python -B scripts/audit-local-gallery.py`; salida `GALERIA_INVENTARIO.json`.

## Referencias que deben preservarse

`src/app/api/admin/clubes/import-local-gallery/route.ts` genera URLs `/clubes/galeria/<slug>/<archivo>` desde `localGalleryManifest`; escribe metadatos de galería, no transfiere archivos a R2. Cambiar nombres/extensiones sin actualizar registros y manifiesto produciría enlaces rotos. El modo `replace` borra metadatos antes de insertar: no usarlo como procedimiento de migración masiva/reversible.

## Estrategia recomendada

1. Inventariar y respaldar originales fuera del deploy, con SHA-256, ruta, tamaño, dimensión, permiso de uso y copia verificable.
2. Elegir muestra representativa por club, orientación y condiciones de luz; generar variantes 640/1280/1920 según uso. Mantener original para archivo, no para descarga pública por defecto.
3. Aprobar visualmente nitidez, color, logos y orientación; comprobar si hay metadatos sensibles y política de eliminación EXIF de derivados.
4. Subir derivados a un prefijo nuevo R2, sin sobrescribir objetos vigentes; mapear cada URL anterior a la nueva y conservar versión/hash.
5. Hacer HEAD/GET y validar dimensiones/tipo/caché y CORS; confirmar configuración Next Image para host/CDN.
6. Respaldar `galeria_clubes` y actualizar URLs transaccionalmente en staging; comprobar todas las galerías, administración y orden/títulos existentes.
7. Autorizar producción y cambiar referencias por lote, conservar originales/URLs previas durante período acordado. Rollback restaura el mapa anterior, no transforma archivos otra vez.
8. Recién tras validar deploy y recuperación decidir retirar archivos pesados del árbol actual. No reescribir historia Git ni borrar originales sin pedido específico.

## Aceptación y costos

Cero enlaces rotos; conteo de imágenes/títulos/orden preservado; prueba mobile/desktop y carga administrativa; bytes transferidos comparados con baseline; rollback probado. Definir presupuesto de storage/egress, dominio público, conservación y responsables. Los límites CLI de Vercel deben revisarse contra plan/documentación vigente antes de justificar un cambio contractual; el tamaño medido ya aconseja externalización.

## Próxima acción

Aprobar calidad/formato y destino R2, preparar respaldo/manifiesto completo y ensayo en staging. No ejecutar `replace` ni eliminar originales para ahorrar tamaño como primer paso.
