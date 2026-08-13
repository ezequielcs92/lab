-- Capacidades editoriales equivalentes al flujo de WordPress.
-- Ejecutar después de migration_blog_roles.sql.
DROP POLICY IF EXISTS "Periodista crea noticias" ON noticias;
DROP POLICY IF EXISTS "Periodista edita sus noticias" ON noticias;
DROP POLICY IF EXISTS "Redactores crean noticias" ON noticias;
DROP POLICY IF EXISTS "Redactores ven sus noticias" ON noticias;
DROP POLICY IF EXISTS "Redactores editan sus noticias" ON noticias;

CREATE POLICY "Redactores crean noticias" ON noticias FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM perfiles
      WHERE id = auth.uid() AND rol::text IN ('periodista', 'autor', 'editor_blog', 'colaborador', 'admin_liga')
    )
  );
CREATE POLICY "Redactores ven sus noticias" ON noticias FOR SELECT
  USING (
    publicada = true
    OR autor_id = auth.uid()
    OR EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol::text IN ('admin_liga', 'editor_blog'))
  );
CREATE POLICY "Redactores editan sus noticias" ON noticias FOR UPDATE
  USING (
    autor_id = auth.uid()
    OR EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol::text IN ('admin_liga', 'editor_blog'))
  )
  WITH CHECK (
    publicada = false
    OR EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol::text IN ('admin_liga', 'editor_blog', 'autor', 'periodista'))
  );
