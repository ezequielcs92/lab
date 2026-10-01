"""Preview or stage-import iScore season summary workbooks without inventing games."""

import argparse
import hashlib
import importlib.util
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import uuid
from collections import Counter, defaultdict
from decimal import Decimal, InvalidOperation
from pathlib import Path


SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent
PREVIEW_PATH = SCRIPT_DIR / 'preview-iscore-xlsx.py'
SPEC = importlib.util.spec_from_file_location('preview_iscore_xlsx', PREVIEW_PATH)
PREVIEW = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(PREVIEW)

YEAR = 2019
SOURCE = 'iscore-xlsx'
CLUB_NAMES = {
    'cachorros': ('Cachorros', 'Cachorros'),
    'arias': ('Arias', 'Arias'),
    'falcons': ('Falcons', 'Falcons'),
    'infernales': ('Infernales', 'Infernales'),
    'pumas': ('Pumas', 'Pumas'),
    'vikingos': ('Vikingos', 'Vikingos'),
}
SCOPES = {'batting', 'pitching', 'fielding'}
REQUIRED_HEADERS = {
    'batting': {'AB', 'R', 'H', 'HR', 'RBI'},
    'pitching': {'IP', 'R', 'H', 'ER', 'BB', 'HR', 'W', 'L'},
    'fielding': {'PO', 'A'},
}
METRICS = {
    'batting': {
        'ab': ('AB',), 'r': ('R',), 'h': ('H',), 'doble': ('2B',),
        'triple': ('3B',), 'hr': ('HR',), 'rbi': ('RBI',), 'bb': ('BB',),
        'so': ('SO',), 'sb': ('SB',), 'cs': ('CS',), 'sf': ('SF',), 'hbp': ('HBP', 'HB'),
    },
    'pitching': {
        'h': ('H',), 'r': ('R',), 'er': ('ER',), 'bb': ('BB',),
        'so': ('K', 'SO'), 'hr': ('HR',), 'w': ('W',), 'l': ('L',),
        'sv': ('SV',), 'hld': ('HLD',), 'wp': ('WP',), 'bk': ('BK',), 'bf': ('BF',),
    },
    'fielding': {'po': ('PO',), 'a': ('A',), 'e': ('ERR', 'E'), 'dp': ('DP',)},
}
INTEGER_METRICS = {
    'ab', 'r', 'h', 'doble', 'triple', 'hr', 'rbi', 'bb', 'so', 'sb', 'cs', 'sf', 'hbp',
    'er', 'w', 'l', 'sv', 'hld', 'wp', 'bk', 'bf', 'po', 'a', 'e', 'dp',
}


def normalize(value):
    return PREVIEW.normalize(value)


def sql(value):
    return "'" + str(value if value is not None else '').replace("'", "''") + "'"


def sql_json(value):
    return sql(json.dumps(value, ensure_ascii=True, separators=(',', ':'))) + '::jsonb'


def sha256(path):
    digest = hashlib.sha256()
    with path.open('rb') as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()


def decimal_value(value, label, integer=False):
    text = str(value or '').strip()
    if not text or text in {'-', '—', '–', 'N/A'}:
        return None
    if ',' in text and '.' not in text:
        text = text.replace(',', '.')
    try:
        result = Decimal(text)
    except InvalidOperation as error:
        raise ValueError(f'{label}: valor numérico inválido {value!r}') from error
    if not result.is_finite() or result < 0:
        raise ValueError(f'{label}: se esperaba un número finito no negativo, llegó {value!r}')
    if integer and result != result.to_integral_value():
        raise ValueError(f'{label}: se esperaba un entero, llegó {value!r}')
    return int(result) if integer else result


def innings_to_outs(value, label):
    innings = decimal_value(value, label)
    if innings is None:
        return None
    whole = int(innings)
    fraction = innings - whole
    outs_by_fraction = {
        Decimal('0'): 0,
        Decimal('0.1'): 1,
        Decimal('0.2'): 2,
        Decimal('0.33'): 1,
        Decimal('0.67'): 2,
    }
    if fraction not in outs_by_fraction:
        raise ValueError(f'{label}: notación de innings inválida {value!r}')
    return whole * 3 + outs_by_fraction[fraction]


def baseball_ip(outs):
    if outs is None:
        return None
    return f'{outs // 3}.{outs % 3}'


def headers_for(rows, scope):
    header_row, headers = PREVIEW.find_header(rows, scope)
    if header_row is None:
        raise ValueError(f'No se encontró la fila de encabezados de {scope}')
    actual = set(headers)
    missing = REQUIRED_HEADERS[scope] - actual
    if scope == 'pitching' and not {'K', 'SO'}.intersection(actual):
        missing.add('K/SO')
    if missing:
        raise ValueError(f'Faltan encabezados {scope}: {", ".join(sorted(missing))}')
    return header_row, headers


def player_name_column(headers):
    for name in ('NAME', 'PLAYER', 'PLAYER NAME'):
        if name in headers:
            return headers[name]
    raise ValueError('No se encontró la columna de nombre del jugador')


def parse_sheet_rows(path, sheet, phase, club_slug, file_hash):
    scope = normalize(sheet['name'])
    if scope not in SCOPES:
        return []
    header_row, headers = headers_for(sheet['rows'], scope)
    name_column = player_name_column(headers)
    names_seen = set()
    records = []

    for row_number, values in sheet['rows']:
        if row_number <= header_row:
            continue
        name = str(values.get(name_column, '')).strip()
        if not name or normalize(name) in {'total', 'totals', 'team totals'}:
            continue
        normalized_name = normalize(name)
        if normalized_name in names_seen:
            raise ValueError(f'{path}: jugador duplicado en {scope}: {name}')
        names_seen.add(normalized_name)

        raw_stats = {
            header: str(values.get(index, '')).strip()
            for header, index in headers.items()
        }
        stats = {}
        for canonical, aliases in METRICS[scope].items():
            source_header = next((alias for alias in aliases if alias in headers), None)
            raw_value = values.get(headers[source_header], '') if source_header else ''
            stats[canonical] = decimal_value(raw_value, f'{path}:{name}:{canonical}', canonical in INTEGER_METRICS)

        if scope == 'pitching':
            raw_ip = values.get(headers['IP'], '')
            stats['ip_outs'] = innings_to_outs(raw_ip, f'{path}:{name}:IP')
            stats['ip'] = baseball_ip(stats['ip_outs'])
        if scope == 'batting':
            hits = stats.get('h') or 0
            at_bats = stats.get('ab') or 0
            total_extra_base_hits = sum(stats.get(metric) or 0 for metric in ('doble', 'triple', 'hr'))
            if hits > at_bats or total_extra_base_hits > hits:
                raise ValueError(f'{path}:{name}: bateo inconsistente (H/AB/2B/3B/HR)')

        records.append({
            'name': name,
            'normalizedName': normalized_name,
            'clubSlug': club_slug,
            'phase': phase,
            'scope': scope,
            'sourceFile': path.as_posix(),
            'sourceSha256': file_hash,
            'stats': stats,
            'rawStats': raw_stats,
        })
    return records


def collect_plan(root):
    workbooks = sorted(root.rglob('*.xlsx'))
    pdfs = sorted(root.rglob('*.pdf'))
    if not workbooks:
        raise ValueError(f'No se encontraron XLSX en {root}')
    if not pdfs:
        raise ValueError('No se encontraron PDF para conservar como evidencia de resultados')

    records = []
    workbook_manifest = []
    issues = []
    for path in workbooks:
        phase, team, club_slug, mapping_status = PREVIEW.determine_context(path, root)
        if club_slug is None:
            issues.append(f'Club sin mapeo: {team} ({path.relative_to(root)})')
            continue
        file_hash = sha256(path)
        file_records = []
        try:
            sheets = PREVIEW.read_workbook(path)
            recognized_scopes = set()
            for sheet in sheets:
                scope = normalize(sheet['name'])
                if scope in SCOPES:
                    recognized_scopes.add(scope)
                    file_records.extend(parse_sheet_rows(path.relative_to(root), sheet, phase, club_slug, file_hash))
            if recognized_scopes != SCOPES:
                issues.append(f'{path.relative_to(root)}: pestañas faltantes {", ".join(sorted(SCOPES - recognized_scopes))}')
        except (KeyError, ValueError, OSError) as error:
            issues.append(str(error))
            continue

        records.extend(file_records)
        workbook_manifest.append({
            'file': path.relative_to(root).as_posix(),
            'sha256': file_hash,
            'phase': phase,
            'team': team,
            'clubSlug': club_slug,
            'mappingStatus': mapping_status,
            'rows': dict(Counter(record['scope'] for record in file_records)),
        })

    player_names_by_club = defaultdict(set)
    clubs_by_player_name = defaultdict(set)
    for record in records:
        player_names_by_club[(record['clubSlug'], record['normalizedName'])].add(record['name'])
        clubs_by_player_name[record['normalizedName']].add(record['clubSlug'])
    cross_club_identities = [
        {'normalizedName': name, 'clubs': sorted(clubs)}
        for name, clubs in sorted(clubs_by_player_name.items()) if len(clubs) > 1
    ]

    pdf_manifest = [
        {
            'file': path.relative_to(root).as_posix(),
            'sha256': sha256(path),
            'sizeBytes': path.stat().st_size,
        }
        for path in pdfs
    ]
    unique_players = sorted({(record['clubSlug'], record['normalizedName']) for record in records})
    summary = {
        'year': YEAR,
        'mode': 'read-only preview; no database writes',
        'workbooks': len(workbooks),
        'regularSeasonWorkbooks': sum(item['phase'] == 'regular' for item in workbook_manifest),
        'playoffWorkbooks': sum(item['phase'] == 'playoffs' for item in workbook_manifest),
        'pdfScorecards': len(pdfs),
        'playerScopeRows': len(records),
        'uniquePlayerClubRows': len(unique_players),
        'clubs': sorted({record['clubSlug'] for record in records}),
        'rowsByPhaseAndScope': {
            f'{phase}.{scope}': sum(record['phase'] == phase and record['scope'] == scope for record in records)
            for phase in ('regular', 'playoffs') for scope in sorted(SCOPES)
        },
        'crossClubIdentityReviews': len(cross_club_identities),
        'blockingIssues': len(issues),
    }
    return {
        'summary': summary,
        'records': records,
        'players': unique_players,
        'workbookManifest': workbook_manifest,
        'pdfManifest': pdf_manifest,
        'crossClubIdentityReviews': cross_club_identities,
        'issues': issues,
    }


def player_slug(club_slug, normalized_name):
    digest = hashlib.sha256(f'{YEAR}|{club_slug}|{normalized_name}'.encode('utf-8')).hexdigest()[:16]
    return f'historical-{YEAR}-{club_slug}-{digest}'


def identity_sql(club_slug, normalized_name):
    historical_name = "lower(regexp_replace(extensions.unaccent(btrim(candidate.nombre)), '\\s+', ' ', 'g'))"
    return (
        'COALESCE(('
        'SELECT MIN(candidate.stable_id::text)::uuid '
        'FROM public.jugadores candidate '
        'JOIN public.temporadas historical_season ON historical_season.id = candidate.temporada_id '
        f'WHERE candidate.club_id = (SELECT id FROM public.clubes WHERE slug = {sql(club_slug)}) '
        'AND historical_season.anio IN (2017, 2018) '
        f'AND {historical_name} = {sql(normalized_name)} '
        'HAVING COUNT(DISTINCT candidate.stable_id) = 1'
        '), '
        f"uuid_generate_v5(uuid_ns_url(), {sql(f'lab:iscore:2019:{club_slug}:{normalized_name}')})"
        ')'
    )


def identity_preflight(players):
    values = ', '.join(f'({sql(club_slug)}, {sql(normalized_name)})' for club_slug, normalized_name in sorted(players))
    historical_name = "lower(regexp_replace(extensions.unaccent(btrim(candidate.nombre)), '\\s+', ' ', 'g'))"
    return f"""DO $$
DECLARE
  ambiguous_count INTEGER;
  identity_collision_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO ambiguous_count
  FROM (
    SELECT incoming.club_slug, incoming.normalized_name
    FROM (VALUES {values}) AS incoming(club_slug, normalized_name)
    JOIN public.clubes club ON club.slug = incoming.club_slug
    JOIN public.jugadores candidate ON candidate.club_id = club.id
    JOIN public.temporadas historical_season ON historical_season.id = candidate.temporada_id
    WHERE historical_season.anio IN (2017, 2018)
      AND {historical_name} = incoming.normalized_name
    GROUP BY incoming.club_slug, incoming.normalized_name
    HAVING COUNT(DISTINCT candidate.stable_id) > 1
  ) ambiguous;
  IF ambiguous_count > 0 THEN
    RAISE EXCEPTION 'Hay nombres 2019 con más de una identidad histórica candidata en el mismo club';
  END IF;

  WITH incoming AS (
    SELECT incoming.club_slug, incoming.normalized_name,
      COALESCE((
        SELECT MIN(candidate.stable_id::text)::uuid
        FROM public.jugadores candidate
        JOIN public.temporadas historical_season ON historical_season.id = candidate.temporada_id
        WHERE candidate.club_id = club.id
          AND historical_season.anio IN (2017, 2018)
          AND {historical_name} = incoming.normalized_name
        HAVING COUNT(DISTINCT candidate.stable_id) = 1
      ), uuid_generate_v5(uuid_ns_url(), 'lab:iscore:2019:' || incoming.club_slug || ':' || incoming.normalized_name)) AS stable_id
    FROM (VALUES {values}) AS incoming(club_slug, normalized_name)
    JOIN public.clubes club ON club.slug = incoming.club_slug
  )
  SELECT COUNT(*) INTO identity_collision_count
  FROM (
    SELECT club_slug, stable_id
    FROM incoming
    GROUP BY club_slug, stable_id
    HAVING COUNT(DISTINCT normalized_name) > 1
  ) collisions;
  IF identity_collision_count > 0 THEN
    RAISE EXCEPTION 'La importación asignaría más de un nombre al mismo stable_id dentro de club/temporada';
  END IF;
END $$;"""


def build_sql(plan):
    if plan['issues']:
        raise ValueError('No se genera SQL porque hay bloqueos en el preview')

    statements = [
        'BEGIN;',
        "SET LOCAL lock_timeout = '30s';",
        'SET LOCAL search_path = public, extensions;',
        "INSERT INTO public.temporadas (anio, nombre, activa) "
        "VALUES (2019, 'Temporada 2019', false) "
        'ON CONFLICT (anio) DO NOTHING;',
    ]
    for slug, (name, short_name) in sorted(CLUB_NAMES.items()):
        statements.append(
            'INSERT INTO public.clubes (nombre, slug, nombre_corto, activo) VALUES '
            f'({sql(name)}, {sql(slug)}, {sql(short_name)}, false) ON CONFLICT (slug) DO NOTHING;'
        )
    statements.append(identity_preflight(plan['players']))

    manifest = {
        'workbooks': plan['workbookManifest'],
        'scorecards': plan['pdfManifest'],
    }
    import_summary = {**plan['summary'], 'mode': 'staging season-summary import'}
    statements.append(
        'INSERT INTO public.iscore_import_batches '
        '(source, season_year, workbook_manifest, pdf_manifest, summary) VALUES '
        f'({sql(SOURCE)}, {YEAR}, {sql_json(manifest["workbooks"])}, '
        f'{sql_json(manifest["scorecards"])}, {sql_json(import_summary)}) '
        'ON CONFLICT (source, season_year) DO UPDATE SET '
        'workbook_manifest = EXCLUDED.workbook_manifest, '
        'pdf_manifest = EXCLUDED.pdf_manifest, summary = EXCLUDED.summary, imported_at = NOW();'
    )

    players = {}
    for record in plan['records']:
        key = (record['clubSlug'], record['normalizedName'])
        players.setdefault(key, record['name'])
    for (club_slug, normalized_name), name in sorted(players.items()):
        statements.append(
            'INSERT INTO public.jugadores '
            '(nombre, slug, posicion, club_id, temporada_id, activo, stable_id) VALUES '
            f'({sql(name)}, {sql(player_slug(club_slug, normalized_name))}, '
            "'utility', "
            f'(SELECT id FROM public.clubes WHERE slug = {sql(club_slug)}), '
            f'(SELECT id FROM public.temporadas WHERE anio = {YEAR}), false, {identity_sql(club_slug, normalized_name)}) '
            'ON CONFLICT (slug) DO UPDATE SET nombre = EXCLUDED.nombre, '
            'club_id = EXCLUDED.club_id, temporada_id = EXCLUDED.temporada_id, '
            'activo = false, updated_at = NOW();'
        )

    for record in plan['records']:
        player_id = (
            '(SELECT id FROM public.jugadores WHERE slug = '
            f'{sql(player_slug(record["clubSlug"], record["normalizedName"]))})'
        )
        club_id = f'(SELECT id FROM public.clubes WHERE slug = {sql(record["clubSlug"])})'
        season_id = f'(SELECT id FROM public.temporadas WHERE anio = {YEAR})'
        batch_id = f'(SELECT id FROM public.iscore_import_batches WHERE source = {sql(SOURCE)} AND season_year = {YEAR})'
        statements.append(
            'INSERT INTO public.estadisticas_temporada_fuente '
            '(import_batch_id, temporada_id, club_id, jugador_id, fase, scope, source_file, source_sha256, stats, raw_stats) '
            f'VALUES ({batch_id}, {season_id}, {club_id}, {player_id}, {sql(record["phase"])}, '
            f'{sql(record["scope"])}, {sql(record["sourceFile"])}, {sql(record["sourceSha256"])}, '
            f'{sql_json(record["stats"])}, {sql_json(record["rawStats"])}) '
            'ON CONFLICT (temporada_id, club_id, jugador_id, fase, scope) DO UPDATE SET '
            'import_batch_id = EXCLUDED.import_batch_id, source_file = EXCLUDED.source_file, '
            'source_sha256 = EXCLUDED.source_sha256, stats = EXCLUDED.stats, '
            'raw_stats = EXCLUDED.raw_stats, updated_at = NOW();'
        )

    statements.extend([
        "DO $$ BEGIN IF (SELECT COUNT(*) FROM public.estadisticas_temporada_fuente WHERE import_batch_id = "
        f'(SELECT id FROM public.iscore_import_batches WHERE source = {sql(SOURCE)} AND season_year = {YEAR})) <> '
        f'{len(plan["records"])} THEN RAISE EXCEPTION \'Cantidad de filas iScore 2019 inesperada\'; END IF; END $$;',
        'COMMIT;',
    ])
    sql_text = '\n'.join(statements) + '\n'
    if 'INSERT INTO public.partidos' in sql_text:
        raise ValueError('El SQL de estadísticas estacionales no debe crear partidos')
    return sql_text


def execute_import(sql_text, project_ref):
    linked_ref_file = REPO_ROOT / 'supabase' / '.temp' / 'project-ref'
    if not linked_ref_file.is_file():
        raise ValueError('No hay proyecto Supabase vinculado localmente')
    linked_ref = linked_ref_file.read_text(encoding='utf-8').strip()
    if linked_ref != project_ref:
        raise ValueError(f'El proyecto vinculado ({linked_ref}) no coincide con la referencia solicitada')
    node = shutil.which('node')
    if not node:
        raise ValueError('No se encontró Node.js para ejecutar Supabase CLI')
    npx_cli = Path(node).resolve().parent / 'node_modules' / 'npm' / 'bin' / 'npx-cli.js'
    if not npx_cli.is_file():
        raise ValueError(f'No se encontró el lanzador de Supabase CLI: {npx_cli}')

    with tempfile.NamedTemporaryFile('w', encoding='utf-8', suffix='.sql', delete=False) as temporary:
        temporary.write(sql_text)
        sql_path = Path(temporary.name)
    try:
        return subprocess.run(
            [node, str(npx_cli), 'supabase', 'db', 'query', '--linked', '--file', str(sql_path)],
            cwd=REPO_ROOT,
            check=False,
        ).returncode
    finally:
        sql_path.unlink(missing_ok=True)


def main():
    parser = argparse.ArgumentParser(description='Preview or apply the confirmed iScore 2019 season summaries.')
    parser.add_argument('root', help='Folder containing the 2019 XLSX workbooks and PDF scorecards')
    parser.add_argument('--details', action='store_true', help='Include workbook and identity-review details')
    parser.add_argument('--sql-out', help='Write the validated staging SQL to this existing directory')
    parser.add_argument('--execute', action='store_true', help='Apply to the explicitly linked staging project')
    parser.add_argument('--staging-ref', help='Required project ref; production refs are rejected')
    parser.add_argument('--production-ref', help='Explicit LAB production ref for an authorized production import')
    args = parser.parse_args()
    root = Path(args.root).resolve()
    if not root.is_dir():
        parser.error(f'Folder not found: {root}')
    if args.staging_ref and args.production_ref:
        parser.error('Usar una sola referencia de proyecto')
    if args.execute and not (args.staging_ref or args.production_ref):
        parser.error('--staging-ref o --production-ref es obligatorio para ejecutar')
    if args.production_ref and args.production_ref != 'fhyurtioqpfmiwdciylt':
        parser.error('--production-ref debe corresponder a produccion LAB')
    if args.execute and args.staging_ref == 'fhyurtioqpfmiwdciylt':
        parser.error('No se permite aplicar este importador directamente a producción')

    try:
        plan = collect_plan(root)
    except (OSError, ValueError, KeyError) as error:
        print(json.dumps({'mode': 'read-only preview', 'error': str(error)}, ensure_ascii=True, indent=2))
        return 1

    report = {
        'summary': {**plan['summary'], 'mode': 'import requested' if args.execute else plan['summary']['mode']},
        'issues': plan['issues'],
        'identityPolicy': 'No crea fusiones entre clubes por nombre. Reutiliza una identidad histórica única del mismo club; si no existe, deriva un stable_id por club. Los nombres repetidos entre clubes quedan para revisión.',
    }
    if args.details:
        report['workbooks'] = plan['workbookManifest']
        report['crossClubIdentityReviews'] = plan['crossClubIdentityReviews']
        report['pdfScorecards'] = plan['pdfManifest']

    print(json.dumps(report, ensure_ascii=True, indent=2))
    if plan['issues']:
        return 1

    sql_text = build_sql(plan)
    if args.production_ref:
        sql_text = sql_text.replace('staging season-summary import', 'production season-summary import')
    if args.sql_out:
        sql_path = Path(args.sql_out).resolve()
        if not sql_path.parent.is_dir():
            parser.error(f'La carpeta de salida no existe: {sql_path.parent}')
        sql_path.write_text(sql_text, encoding='utf-8')
        print(f'SQL generado: {sql_path}')
    if args.execute:
        status = execute_import(sql_text, args.production_ref or args.staging_ref)
        if status == 0:
            print(f'Importacion aplicada en {args.production_ref or args.staging_ref}: {len(plan["records"])} filas.')
        return status
    print(f'Filas preparadas: {len(plan["records"])}. Ejecución no solicitada; no hubo escrituras en Supabase.')
    return 0


if __name__ == '__main__':
    try:
        sys.exit(main())
    except (OSError, ValueError) as error:
        print(json.dumps({'error': str(error)}, ensure_ascii=True, indent=2), file=sys.stderr)
        sys.exit(1)
