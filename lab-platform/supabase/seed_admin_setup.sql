-- ============================================================
-- SETUP INICIAL: Admin User + Temporada Activa
-- Ejecutar en Supabase SQL Editor DESPUÉS del schema principal
-- ============================================================

-- PASO 1: Crear la temporada activa 2025
-- (Si ya existe una, omitir o cambiar el año)
INSERT INTO temporadas (anio, nombre, fecha_inicio, fecha_fin, activa)
VALUES (2025, 'Temporada 2025', '2025-03-01', '2025-11-30', true)
ON CONFLICT (anio) DO UPDATE SET activa = true, nombre = EXCLUDED.nombre;

-- Desactivar cualquier otra temporada si la de 2025 existe
UPDATE temporadas SET activa = false WHERE anio != 2025;

-- ============================================================
-- PASO 2: Crear usuario administrador
-- ============================================================
-- INSTRUCCIONES:
-- 1. Ve a Supabase Dashboard → Authentication → Users → Add user
-- 2. Ingresa el email y contraseña del admin (ej: admin@lab.org.ar)
-- 3. Copia el UUID del usuario creado
-- 4. Reemplaza '<UUID-DEL-USUARIO>' en la query de abajo y ejecútala

-- REEMPLAZA '<UUID-DEL-USUARIO>' con el UUID real del usuario de Auth:
/*
INSERT INTO perfiles (id, nombre, rol)
VALUES (
  '<UUID-DEL-USUARIO>',
  'Administrador LAB',
  'admin_liga'
)
ON CONFLICT (id) DO UPDATE SET rol = 'admin_liga';
*/

-- ============================================================
-- VERIFICACIÓN
-- ============================================================
SELECT 'Temporadas activas:' as info, COUNT(*) as cantidad FROM temporadas WHERE activa = true;
SELECT 'Admins:' as info, COUNT(*) as cantidad FROM perfiles WHERE rol = 'admin_liga';
