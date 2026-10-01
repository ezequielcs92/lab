import { collectGames, normalizeText, isTotalsRow, CLUB_SLUGS } from './preview-iscore-import.mjs'
import { canonicalGames } from './apply-iscore-import.mjs'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { writeFile } from 'node:fs/promises'

const root = process.argv[2]
if (!root) throw new Error('Provide the extracted 2017/2018 root folder')
const { games } = await collectGames(root)
const expected = new Map()
for (const game of canonicalGames(games)) {
  for (const side of ['Home', 'Visitor']) {
    const club = CLUB_SLUGS.get(normalizeText(side === 'Home' ? game.home : game.visitor))
    for (const row of game.csv[`stats${side}Pitching.csv`].rows.filter((item) => !isTotalsRow(item))) {
      if (!row.Name?.trim()) continue
      const strikeouts = row.K ?? row.SO
      if (!/^\d+$/.test(strikeouts ?? '')) throw new Error(`Invalid strikeouts: ${row.Name}`)
      const key = `${game.externalKey}|${club}|${normalizeText(row.Name)}`
      if (expected.has(key)) throw new Error(`Duplicate source row ${key}`)
      expected.set(key, Number(strikeouts))
    }
  }
}
const query = "SELECT s.id,s.so,s.extras,p.external_key,c.slug,t.anio FROM estadisticas_pitcheo s JOIN partidos p ON p.id=s.partido_id JOIN clubes c ON c.id=s.club_id JOIN temporadas t ON t.id=s.temporada_id WHERE p.external_source='iscore' AND t.anio IN (2017,2018) ORDER BY s.id"
const npx = path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npx-cli.js')
const response = spawnSync(process.execPath, [npx, 'supabase', 'db', 'query', '--linked', '--project-ref', 'fhyurtioqpfmiwdciylt', query], { encoding: 'utf8' })
if (response.status) throw new Error(response.stderr + response.stdout)
const rows = JSON.parse(response.stdout).rows
const totals = new Map()
for (const row of rows) {
  const key = `${row.external_key}|${row.slug}|${normalizeText(row.extras.Name)}`
  if (!expected.has(key) || expected.get(key) !== Number(row.extras.K ?? row.extras.SO)) throw new Error(`CSV/database mismatch ${key}`)
  const total = totals.get(row.anio) ?? { rows: 0, imported: 0, source: 0 }
  total.rows++; total.imported += row.so; total.source += expected.get(key)
  totals.set(row.anio, total)
  expected.delete(key)
}
if (expected.size || rows.length !== 667) throw new Error('Incomplete reconciliation')
const report = `# Conciliacion de ponches 2017/2018\n\nFecha: 2026-10-01. Solo lectura de produccion; no se aplico correccion.\n\nCausa: el importador leia SO, pero los CSV de pitcheo usan K. Los valores quedaron preservados en extras.K. Se cotejaron las 667 filas contra CSV originales, deduplicando partidos y vinculando por clave externa, club y nombre fuente. Cero diferencias.\n\n| Anio | Filas | SO importado | K fuente |\n|---|---:|---:|---:|\n${[...totals].sort().map(([year, t]) => `| ${year} | ${t.rows} | ${t.imported} | ${t.source} |`).join('\n')}\n\nCorreccion preparada: supabase/correct_iscore_strikeouts_review.sql. Transaccion con backup auditable, precondiciones de cobertura y valores actuales; cambia solo so/updated_at. Ejecutar primero en staging, revisar y luego autorizar produccion. No reimportar jugadores/partidos ni las otras metricas. El codigo local reconoce K/SO para nuevas importaciones. El perfil sigue ocultando SO 2017/2018 hasta aplicar y verificar la correccion.\n\nComando: node scripts/reconcile-iscore-strikeouts.mjs <raiz-extraida>\n`
const finalReport = report
  .replace('Solo lectura de produccion; no se aplico correccion.', 'Solo consulta de produccion en esta ejecucion; las columnas SO importado muestran el estado actual de la base.')
  .replace('El perfil sigue ocultando SO 2017/2018 hasta aplicar y verificar la correccion.', 'Los valores de perfiles deben verificarse despues de aplicar y publicar la correccion.')
await writeFile('CONCILIACION_PONCHES_2017_2018.md', finalReport)
const quote = (text) => `'${text.replaceAll("'", "''")}'`
const values = rows.map((row) => `(${quote(row.external_key)},${quote(row.slug)},${quote(row.extras.Name)},${row.so},${Number(row.extras.K ?? row.extras.SO)})`).join(',\n')
const sql = `-- Reviewed CSV-backed correction; NOT automatically applied. Portable keys for staging/production.
BEGIN;
SET LOCAL lock_timeout='30s';
CREATE TEMP TABLE source_strikeouts(external_key text,club_slug text,source_name text,old_so integer,new_so integer,PRIMARY KEY(external_key,club_slug,source_name)) ON COMMIT DROP;
INSERT INTO source_strikeouts VALUES ${values};
CREATE TEMP TABLE expected_strikeouts ON COMMIT DROP AS
SELECT s.id,e.old_so,e.new_so FROM estadisticas_pitcheo s
JOIN partidos p ON p.id=s.partido_id JOIN clubes c ON c.id=s.club_id
JOIN source_strikeouts e ON p.external_key=e.external_key AND c.slug=e.club_slug AND s.extras->>'Name'=e.source_name
WHERE p.external_source='iscore';
DO $$ BEGIN PERFORM s.id FROM estadisticas_pitcheo s JOIN expected_strikeouts e ON e.id=s.id FOR UPDATE OF s; END $$;
DO $$ BEGIN
IF (SELECT count(*) FROM expected_strikeouts)<>667 OR (SELECT count(DISTINCT id) FROM expected_strikeouts)<>667 THEN RAISE EXCEPTION 'Incomplete/ambiguous matching'; END IF;
IF (SELECT count(*) FROM estadisticas_pitcheo s JOIN expected_strikeouts e ON e.id=s.id WHERE s.so IN(e.old_so,e.new_so) AND s.extras->>'K'=e.new_so::text)<>667 THEN RAISE EXCEPTION 'Preflight mismatch'; END IF;
END $$;
CREATE TABLE IF NOT EXISTS public.iscore_strikeouts_correction_audit(id uuid PRIMARY KEY,old_so integer NOT NULL,new_so integer NOT NULL,corrected_at timestamptz DEFAULT now());
ALTER TABLE public.iscore_strikeouts_correction_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.iscore_strikeouts_correction_audit FROM anon,authenticated;
INSERT INTO public.iscore_strikeouts_correction_audit(id,old_so,new_so) SELECT s.id,s.so,e.new_so FROM estadisticas_pitcheo s JOIN expected_strikeouts e ON e.id=s.id ON CONFLICT(id) DO NOTHING;
UPDATE estadisticas_pitcheo s SET so=e.new_so,updated_at=now() FROM expected_strikeouts e WHERE s.id=e.id AND s.so IS DISTINCT FROM e.new_so;
DO $$ BEGIN
IF EXISTS(SELECT 1 FROM estadisticas_pitcheo s JOIN expected_strikeouts e ON e.id=s.id WHERE s.so<>e.new_so) THEN RAISE EXCEPTION 'Postflight mismatch'; END IF;
IF EXISTS(SELECT 1 FROM expected_strikeouts e JOIN estadisticas_pitcheo s ON s.id=e.id WHERE s.so IS DISTINCT FROM e.new_so) THEN RAISE EXCEPTION 'Reapply would change rows'; END IF;
END $$;
COMMIT;
`
await writeFile('supabase/correct_iscore_strikeouts_review.sql', sql)
await writeFile('supabase/test_iscore_strikeouts_rollback.sql', sql.replace(/COMMIT;\s*$/, 'ROLLBACK;\n'))
console.log(JSON.stringify({ verifiedRows: rows.length, mismatches: 0, totals: Object.fromEntries(totals), databaseWrites: false }, null, 2))
