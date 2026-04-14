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

-- Política: solo usuarios autenticados pueden subir
CREATE POLICY "Upload autenticado media"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'media');

-- Política: solo usuarios autenticados pueden actualizar/eliminar sus propios archivos
CREATE POLICY "Update autenticado media"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'media');

CREATE POLICY "Delete autenticado media"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'media');
