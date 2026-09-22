-- Refuerza RLS en perfiles para que un usuario solo pueda editar su nombre propio.
-- El trigger evita consultar perfiles desde una politica de la misma tabla, lo
-- que provocaria recursion infinita en PostgreSQL.

ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuario edita su perfil" ON perfiles;
DROP POLICY IF EXISTS "Usuario crea su perfil" ON perfiles;

CREATE POLICY "Usuario edita su perfil" ON perfiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Usuario crea su perfil" ON perfiles FOR INSERT
  WITH CHECK (
    id = auth.uid()
    AND rol = 'usuario'
    AND club_id IS NULL
    AND avatar_url IS NULL
  );

CREATE OR REPLACE FUNCTION protect_profile_privileged_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF auth.uid() = OLD.id AND (
    NEW.id IS DISTINCT FROM OLD.id
    OR NEW.rol IS DISTINCT FROM OLD.rol
    OR NEW.club_id IS DISTINCT FROM OLD.club_id
    OR NEW.avatar_url IS DISTINCT FROM OLD.avatar_url
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
  ) THEN
    RAISE EXCEPTION 'Solo se puede modificar el nombre desde el perfil propio';
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS tr_protect_profile_privileged_fields ON perfiles;
CREATE TRIGGER tr_protect_profile_privileged_fields
  BEFORE UPDATE ON perfiles
  FOR EACH ROW EXECUTE FUNCTION protect_profile_privileged_fields();
