-- Las posiciones por zona ahora respetan los ajustes manuales de la tabla general.
-- Antes, un ajuste cargado en la tabla general no se reflejaba en las zonas.
-- Sólo se redefine la vista; no se modifican partidos, posiciones ni ajustes existentes.
CREATE OR REPLACE VIEW v_posiciones_efectivas AS
WITH scopes AS (
  SELECT tc.temporada_id, tc.club_id, NULL::UUID AS division_id
  FROM temporada_clubes tc WHERE tc.visible
  UNION ALL
  SELECT tc.temporada_id, tc.club_id, tc.division_id
  FROM temporada_clubes tc WHERE tc.visible
), effective AS (
  SELECT
    p.id,
    s.temporada_id,
    s.club_id,
    s.division_id,
    COALESCE(a.jj, p.jj) AS jj,
    COALESCE(a.jg, p.jg) AS jg,
    COALESCE(a.jp, p.jp) AS jp,
    COALESCE(a.pct, CASE WHEN COALESCE(a.jj, p.jj) > 0
      THEN ROUND(COALESCE(a.jg, p.jg)::numeric / COALESCE(a.jj, p.jj), 4) ELSE 0 END) AS pct,
    COALESCE(a.racha, p.racha) AS racha,
    CASE WHEN a.same_scope THEN a.gb END AS gb_override,
    CASE WHEN a.same_scope THEN a.orden_manual END AS orden_manual
  FROM scopes s
  JOIN posiciones p ON p.temporada_id = s.temporada_id AND p.club_id = s.club_id
  LEFT JOIN LATERAL (
    -- El récord de un club es el mismo en la tabla general y en su zona: una zona
    -- usa su propio ajuste y, si no tiene, el de la tabla general. GB y orden manual
    -- dependen de cada tabla y sólo se toman del ajuste de ese mismo ámbito.
    SELECT pa.jj, pa.jg, pa.jp, pa.pct, pa.gb, pa.racha, pa.orden_manual,
      (pa.division_id IS NOT DISTINCT FROM s.division_id) AS same_scope
    FROM posiciones_ajustes pa
    WHERE pa.temporada_id = s.temporada_id AND pa.club_id = s.club_id
      AND (pa.division_id IS NOT DISTINCT FROM s.division_id OR pa.division_id IS NULL)
    ORDER BY (pa.division_id IS NULL) ASC
    LIMIT 1
  ) a ON true
), tiebreaks AS (
  SELECT e.*,
    tie.serie_ganada,
    tie.tqb,
    tie.carreras_empatados
  FROM effective e
  LEFT JOIN LATERAL (
    SELECT
      COUNT(p.id) FILTER (WHERE
        (p.local_id = e.club_id AND p.marcador_local > p.marcador_visitante)
        OR (p.visitante_id = e.club_id AND p.marcador_visitante > p.marcador_local)
      )::integer AS serie_ganada,
      SUM(CASE WHEN p.local_id = e.club_id THEN p.marcador_local ELSE p.marcador_visitante END)::integer AS carreras_empatados,
      CASE WHEN COUNT(p.id) > 0 AND BOOL_AND(
        CASE WHEN p.local_id = e.club_id
          THEN p.outs_ofensivos_local IS NOT NULL AND p.outs_defensivos_local IS NOT NULL
          ELSE p.outs_ofensivos_visitante IS NOT NULL AND p.outs_defensivos_visitante IS NOT NULL
        END
      ) THEN
        3 * SUM(CASE WHEN p.local_id = e.club_id THEN p.marcador_local ELSE p.marcador_visitante END)::numeric
          / NULLIF(SUM(CASE WHEN p.local_id = e.club_id THEN p.outs_ofensivos_local ELSE p.outs_ofensivos_visitante END), 0)
        - 3 * SUM(CASE WHEN p.local_id = e.club_id THEN p.marcador_visitante ELSE p.marcador_local END)::numeric
          / NULLIF(SUM(CASE WHEN p.local_id = e.club_id THEN p.outs_defensivos_local ELSE p.outs_defensivos_visitante END), 0)
      END AS tqb
    FROM effective opponent
    JOIN partidos p ON p.temporada_id = e.temporada_id AND p.estado = 'finalizado'
      AND ((p.local_id = e.club_id AND p.visitante_id = opponent.club_id)
        OR (p.visitante_id = e.club_id AND p.local_id = opponent.club_id))
    WHERE opponent.temporada_id = e.temporada_id
      AND opponent.division_id IS NOT DISTINCT FROM e.division_id
      AND opponent.club_id <> e.club_id
      AND opponent.pct = e.pct
  ) tie ON true
), leaders AS (
  SELECT e.*,
    FIRST_VALUE(jg) OVER scope_order AS leader_jg,
    FIRST_VALUE(jp) OVER scope_order AS leader_jp
  FROM tiebreaks e
  WINDOW scope_order AS (
    PARTITION BY temporada_id, division_id
    ORDER BY pct DESC, jg DESC, jp ASC, club_id
  )
)
SELECT
  id, temporada_id, club_id, division_id, jj, jg, jp, pct,
  COALESCE(gb_override, GREATEST(0, ((leader_jg - jg) + (jp - leader_jp))::numeric / 2)) AS gb,
  racha, orden_manual, serie_ganada, tqb, carreras_empatados
FROM leaders;
