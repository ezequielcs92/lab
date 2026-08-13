-- Roles editoriales de blog, compatibles con el modelo de WordPress.
-- Ejecutar una vez en Supabase SQL Editor.
ALTER TYPE rol_usuario ADD VALUE IF NOT EXISTS 'editor_blog';
ALTER TYPE rol_usuario ADD VALUE IF NOT EXISTS 'autor';
ALTER TYPE rol_usuario ADD VALUE IF NOT EXISTS 'colaborador';
ALTER TYPE rol_usuario ADD VALUE IF NOT EXISTS 'suscriptor';
ALTER TYPE rol_usuario ADD VALUE IF NOT EXISTS 'fotografo';
