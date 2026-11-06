-- Visit statistics for the admin dashboard: one counter per day and page, no personal data.
-- Visitors never read this table; they only call registrar_visita() through the site's /api/track.
-- The admin reads the summary through resumen_visitas(), which only the league admin may call.

CREATE TABLE IF NOT EXISTS public.visitas_diarias (
  dia DATE NOT NULL,
  ruta TEXT NOT NULL CHECK (length(ruta) BETWEEN 1 AND 200 AND left(ruta, 1) = '/'),
  vistas INTEGER NOT NULL DEFAULT 0 CHECK (vistas >= 0),
  PRIMARY KEY (dia, ruta)
);

ALTER TABLE public.visitas_diarias ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.visitas_diarias FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.registrar_visita(p_ruta TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_ruta IS NULL OR length(p_ruta) NOT BETWEEN 1 AND 200 OR left(p_ruta, 1) <> '/' THEN
    RETURN;
  END IF;
  INSERT INTO visitas_diarias (dia, ruta, vistas)
  VALUES ((now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date, p_ruta, 1)
  ON CONFLICT (dia, ruta) DO UPDATE SET vistas = visitas_diarias.vistas + 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.resumen_visitas(p_dias INTEGER DEFAULT 30)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_desde DATE := (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date - (GREATEST(LEAST(COALESCE(p_dias, 30), 365), 1) - 1);
  v_result JSONB;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin_liga') THEN
    RAISE EXCEPTION 'Se requiere rol de administrador' USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object(
    'desde', v_desde,
    'total', COALESCE((SELECT SUM(vistas) FROM visitas_diarias WHERE dia >= v_desde), 0),
    'por_dia', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('dia', dia, 'vistas', total) ORDER BY dia)
      FROM (SELECT dia, SUM(vistas)::int AS total FROM visitas_diarias WHERE dia >= v_desde GROUP BY dia) d
    ), '[]'::jsonb),
    'top_rutas', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('ruta', ruta, 'vistas', total) ORDER BY total DESC)
      FROM (
        SELECT ruta, SUM(vistas)::int AS total FROM visitas_diarias
        WHERE dia >= v_desde AND ruta NOT LIKE '/noticias/%'
        GROUP BY ruta ORDER BY total DESC LIMIT 10
      ) r
    ), '[]'::jsonb),
    'top_noticias', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('titulo', titulo, 'slug', slug, 'vistas', total) ORDER BY total DESC)
      FROM (
        SELECT n.titulo, n.slug, SUM(v.vistas)::int AS total
        FROM visitas_diarias v
        JOIN noticias n ON v.ruta = '/noticias/' || n.slug
        WHERE v.dia >= v_desde
        GROUP BY n.titulo, n.slug ORDER BY total DESC LIMIT 10
      ) t
    ), '[]'::jsonb),
    'lecturas_noticias', COALESCE((SELECT SUM(vistas) FROM visitas_diarias WHERE dia >= v_desde AND ruta LIKE '/noticias/%'), 0)
  ) INTO v_result;
  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.registrar_visita(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.resumen_visitas(INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registrar_visita(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.resumen_visitas(INTEGER) TO authenticated, service_role;
