-- Media uploads are handled by the server through Cloudflare R2. Supabase
-- Storage remains read-only so authenticated clients cannot overwrite or
-- delete arbitrary objects, or use the project as an unrestricted file host.
DROP POLICY IF EXISTS "Upload autenticado media" ON storage.objects;
DROP POLICY IF EXISTS "Update autenticado media" ON storage.objects;
DROP POLICY IF EXISTS "Delete autenticado media" ON storage.objects;
