-- Crear bucket público "media" para imágenes del sitio
-- Ejecutar en el SQL Editor de Supabase

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media',
  'media',
  true,
  5242880, -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Política: cualquiera puede leer (bucket público)
CREATE POLICY "Lectura pública media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'media');

-- Las escrituras se realizan exclusivamente desde el servidor en Cloudflare R2.
-- No crear políticas INSERT/UPDATE/DELETE para clientes de Supabase Storage.
