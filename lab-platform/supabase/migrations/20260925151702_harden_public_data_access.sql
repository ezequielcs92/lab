-- User profiles are internal authorization data, not a public directory.
DROP POLICY IF EXISTS "Perfiles visibles" ON public.perfiles;
DROP POLICY IF EXISTS "Usuario ve su perfil" ON public.perfiles;
CREATE POLICY "Usuario ve su perfil" ON public.perfiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Trivia answers are validated by the server API and must not be selectable
-- directly with public or user JWTs.
REVOKE SELECT ON public.trivias FROM anon, authenticated;
