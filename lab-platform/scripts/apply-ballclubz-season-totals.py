"""Builds the SQL that loads the BallClubz 2023-2025 team reports as season totals.

Nothing is written to the database: the script reads the ZIP files, reads the public player and
club lists, and writes an idempotent SQL file for someone with access to run. Totals go to
estadisticas_temporada_fuente (the table already used for the 2019 totals), one row per player,
club, season and scope. No games or per-game statistics are invented.
"""

import argparse
import hashlib
import importlib.util
import json
import re
import sys
import unicodedata
import urllib.request
import uuid
from collections import Counter, defaultdict
from pathlib import Path


SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent
SPEC = importlib.util.spec_from_file_location('preview_ballclubz_totals', SCRIPT_DIR / 'preview-ballclubz-season-totals.py')
PREVIEW = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(PREVIEW)

SOURCE = 'ballclubz-team-totals'
PHASE = 'regular'  # The reports mix the whole year; the client asked to load them as one block for now.
TRUNCATED_NAME_LENGTH = 17
PAGE_SIZE = 1000

# Same person under two spellings in one club (confirmed by the client on 2026-11-02).
# Keys are (club key, normalized spelling) -> normalized spelling to keep.
ALIASES = {
    ('cachorros', 'hainaer reyes'): 'hainaer jose reyes',
}
NEW_CLUBS = {'hawkers': ('Hawkers', 'hawkers')}


def normalize_text(value):
    text = unicodedata.normalize('NFD', str(value or ''))
    text = ''.join(char for char in text if unicodedata.category(char) != 'Mn')
    return re.sub(r'[^a-zA-Z0-9]+', ' ', text).strip().lower()


def sql(value):
    return "'" + str(value if value is not None else '').replace("'", "''") + "'"


def sql_json(value):
    return sql(json.dumps(value, ensure_ascii=True, separators=(',', ':'))) + '::jsonb'


def source_matches(source_name, candidate_name):
    """Surname-first, accent-less and cut-off BallClubz names against a stored name."""
    source = normalize_text(source_name).split()
    candidate = normalize_text(candidate_name).split()
    if not source or len(candidate) < len(source):
        return False
    truncated = len(source_name.strip()) >= TRUNCATED_NAME_LENGTH
    if not truncated and len(candidate) != len(source):
        return False
    remaining = list(candidate)
    for index, token in enumerate(source):
        prefix_ok = truncated and index == len(source) - 1
        hit = next((i for i, word in enumerate(remaining) if word == token or (prefix_ok and word.startswith(token))), None)
        if hit is None:
            return False
        remaining.pop(hit)
    return True


def same_player_in_sources(first, second):
    """Two report spellings of the same name, one possibly cut off at the column width."""
    a, b = normalize_text(first), normalize_text(second)
    if sorted(a.split()) == sorted(b.split()):
        return True
    short, long_ = (first, second) if len(a) <= len(b) else (second, first)
    return len(short.strip()) >= TRUNCATED_NAME_LENGTH and source_matches(short, long_)


def is_surname_token(token):
    letters = re.sub(r'[^A-Za-z]', '', token)
    if len(letters) < 2:
        return False
    return len(re.sub(r'[^A-Z]', '', letters)) >= -(-len(letters) * 6 // 10)


def suggest_name(source_name):
    """'RHODES Charles Aaron' -> 'Charles Aaron Rhodes'; mixed-case names are kept as written."""
    tokens = source_name.split()
    count = 0
    while count < len(tokens) and is_surname_token(tokens[count]):
        count += 1
    if count == 0 or count == len(tokens):
        return ' '.join(token.capitalize() if token.isupper() else token for token in tokens)
    return ' '.join(tokens[count:] + [token.capitalize() for token in tokens[:count]])


def stable_id_for(club_key, name):
    return str(uuid.uuid5(uuid.NAMESPACE_URL, f'lab:ballclubz-totals:{club_key}:{normalize_text(name)}'))


def inscription_slug(year, club_key, stable_id):
    digest = hashlib.sha256(f'{year}|{club_key}|{stable_id}'.encode('utf-8')).hexdigest()[:16]
    return f'historical-{year}-{club_key}-{digest}'


def merge_stats(scope, first, second):
    """Sums two spellings of the same player; innings are summed as outs."""
    merged = {}
    for key in first:
        a, b = first[key], second.get(key)
        if key == 'ip':
            continue
        merged[key] = (a or 0) + (b or 0) if isinstance(a, int) and not isinstance(a, bool) else a
    if scope == 'pitching':
        merged['ip'] = PREVIEW.baseball_ip(merged['ip_outs'])
    return merged


# ---------------------------------------------------------------------------------------------
# Database snapshot (public read access only)
# ---------------------------------------------------------------------------------------------


def read_env(path):
    values = {}
    for line in Path(path).read_text(encoding='utf-8').splitlines():
        if re.match(r'^[A-Z_]+=', line):
            key, _, value = line.partition('=')
            values[key] = value.strip().strip('"').strip("'")
    return values


def fetch_snapshot(env_file):
    env = read_env(env_file)
    base, key = env.get('NEXT_PUBLIC_SUPABASE_URL'), env.get('NEXT_PUBLIC_SUPABASE_ANON_KEY')
    if not base or not key:
        raise ValueError(f'Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY en {env_file}')

    def get(path):
        request = urllib.request.Request(f'{base}/rest/v1/{path}', headers={'apikey': key, 'Authorization': f'Bearer {key}'})
        with urllib.request.urlopen(request, timeout=30) as response:
            return json.loads(response.read().decode('utf-8'))

    players = []
    offset = 0
    while True:
        page = get(f'jugadores?select=id,nombre,club_id,temporada_id,stable_id,updated_at&order=id&limit={PAGE_SIZE}&offset={offset}')
        players.extend(page)
        if len(page) < PAGE_SIZE:
            break
        offset += PAGE_SIZE
    return {
        'host': re.sub(r'^https?://', '', base),
        'clubes': get('clubes?select=id,nombre,nombre_corto,slug'),
        'temporadas': get('temporadas?select=id,anio,nombre'),
        'jugadores': players,
    }


# ---------------------------------------------------------------------------------------------
# Plan
# ---------------------------------------------------------------------------------------------


def resolve_clubs(db_clubs, wanted):
    resolved, creating = {}, {}
    for key in sorted(wanted):
        matches = [
            club for club in db_clubs
            if key in {re.sub(r'^club ', '', normalize_text(value)) for value in (club['nombre'], club.get('nombre_corto') or '', club['slug'])}
        ]
        if len(matches) == 1:
            resolved[key] = matches[0]['slug']
        elif not matches and key in NEW_CLUBS:
            creating[key] = NEW_CLUBS[key]
            resolved[key] = NEW_CLUBS[key][1]
        else:
            raise ValueError(f'No se pudo mapear el club {key!r} ({len(matches)} coincidencias)')
    return resolved, creating


def collect_entries(analyses):
    """One entry per year, club, scope and player; spellings of the same player are summed."""
    entries = {}
    issues = []
    for analysis in analyses:
        for club, report in analysis['_reports'].items():
            file_info = next(item for item in analysis['files'] if item['club'] == club)
            for scope, rows in report['players'].items():
                for row in rows:
                    key = normalize_text(row['name'])
                    key = ALIASES.get((club, key), key)
                    slot = (analysis['year'], club, scope, key)
                    if slot in entries:
                        current = entries[slot]
                        current['stats'] = merge_stats(scope, current['stats'], row['stats'])
                        current['raw'] = {'merged': [*current['raw'].get('merged', [current['raw']]), row['rawStats']]}
                        if len(row['name']) > len(current['display']):
                            current['display'] = row['name']
                        current['merged'] = True
                        continue
                    entries[slot] = {
                        'year': analysis['year'], 'club': club, 'scope': scope, 'key': key,
                        'display': row['name'], 'stats': row['stats'], 'raw': row['rawStats'],
                        'file': file_info['file'], 'sha256': file_info['sha256'], 'merged': False,
                    }
    return entries, issues


def longest_spellings(entries):
    """club key -> normalized key -> longest spelling seen in any report."""
    names = defaultdict(dict)
    for entry in entries.values():
        known = names[entry['club']].get(entry['key'])
        if known is None or len(entry['display']) > len(known):
            names[entry['club']][entry['key']] = entry['display']
    return names


def build_plan(analyses, snapshot, decisions=None):
    decisions = decisions or {}
    club_keys = {item['club'] for analysis in analyses for item in analysis['files']}
    slugs, new_clubs = resolve_clubs(snapshot['clubes'], club_keys)
    club_id_by_slug = {club['slug']: club['id'] for club in snapshot['clubes']}

    entries, issues = collect_entries(analyses)
    names = longest_spellings(entries)
    by_club = defaultdict(lambda: defaultdict(list))
    for player in snapshot['jugadores']:
        by_club[player['club_id']][player['stable_id']].append(player)

    identities = {}  # (club, normalized key) -> {'stable_id', 'name', 'existing'}
    ambiguous, linked, created = [], 0, 0
    for club, club_names in sorted(names.items()):
        db_identities = by_club.get(club_id_by_slug.get(slugs[club]), {})
        pending = {}
        for key, display in sorted(club_names.items()):
            matches = [
                sid for sid, rows in db_identities.items()
                if any(normalize_text(row['nombre']) == key or source_matches(display, row['nombre']) for row in rows)
            ]
            decision = decisions.get(f'{club}|{key}')
            if decision and decision != 'new':
                if decision not in db_identities:
                    issues.append(f'{club}|{key}: la decisión apunta a una identidad que no existe: {decision}')
                    continue
                matches = [decision]
            elif decision == 'new':
                matches = []
            if len(matches) == 1:
                rows = sorted(db_identities[matches[0]], key=lambda row: row['updated_at'], reverse=True)
                identities[(club, key)] = {'stable_id': matches[0], 'name': rows[0]['nombre'], 'existing': True}
                linked += 1
            elif len(matches) > 1:
                ambiguous.append({'club': club, 'name': display, 'key': key, 'candidates': sorted(matches)})
            else:
                pending[key] = display

        # New names: cut-off and complete spellings of the same name share one identity.
        clusters = []
        for key, display in sorted(pending.items(), key=lambda item: -len(item[1])):
            home = next((cluster for cluster in clusters if same_player_in_sources(display, cluster['rep'])), None)
            if home:
                home['keys'].append(key)
            else:
                clusters.append({'rep': display, 'keys': [key]})
        for cluster in clusters:
            stable_id = stable_id_for(club, cluster['rep'])
            for key in cluster['keys']:
                identities[(club, key)] = {'stable_id': stable_id, 'name': suggest_name(cluster['rep']), 'existing': False}
            created += 1

    if ambiguous:
        issues.extend(
            f'{item["club"]}: "{item["name"]}" coincide con {len(item["candidates"])} identidades existentes; '
            f'decidir con --decisions ("{item["club"]}|{item["key"]}": identidad o "new")'
            for item in ambiguous
        )

    rows = []
    for slot, entry in sorted(entries.items(), key=lambda item: (item[0][0], item[0][1], item[0][2], item[0][3])):
        identity = identities.get((entry['club'], entry['key']))
        if identity is None:
            continue
        rows.append({**entry, 'stable_id': identity['stable_id'], 'identity': identity})

    # Two spellings that resolved to one identity in the same file would collide on the unique key.
    seen = set()
    for row in rows:
        unique = (row['year'], row['club'], row['scope'], row['stable_id'])
        if unique in seen:
            issues.append(f'{row["file"]}: dos nombres distintos resuelven al mismo jugador ({row["display"]}); agregar un alias')
        seen.add(unique)

    inscriptions = {}
    for row in rows:
        inscriptions.setdefault((row['year'], row['club'], row['stable_id']), row['identity'])

    existing_years = {season['anio'] for season in snapshot['temporadas']}
    years = sorted({row['year'] for row in rows})
    summary = {
        'seasons': years,
        'seasonsToCreate': [year for year in years if year not in existing_years],
        'clubsToCreate': sorted(new_clubs),
        'identitiesLinkedToExisting': linked,
        'newIdentities': created,
        'inscriptions': len(inscriptions),
        'statRows': len(rows),
        'statRowsByYearAndScope': {
            f'{year}.{scope}': sum(1 for row in rows if row['year'] == year and row['scope'] == scope)
            for year in years for scope in ('batting', 'pitching', 'fielding')
        },
        'mergedSpellings': sum(1 for entry in entries.values() if entry['merged']),
        'ambiguous': len(ambiguous),
        'blockingIssues': len(issues),
    }
    return {
        'summary': summary, 'issues': issues, 'rows': rows, 'inscriptions': inscriptions,
        'slugs': slugs, 'newClubs': new_clubs, 'analyses': analyses, 'snapshot': snapshot,
        'ambiguous': ambiguous,
    }


# ---------------------------------------------------------------------------------------------
# SQL
# ---------------------------------------------------------------------------------------------


def build_sql(plan):
    if plan['issues']:
        raise ValueError('No se genera SQL porque hay bloqueos')
    snapshot, slugs = plan['snapshot'], plan['slugs']
    existing_years = {season['anio']: season for season in snapshot['temporadas']}
    statements = [
        '-- BallClubz 2023-2025 season totals. Idempotent; run once per database.',
        f'-- Built against the player list of {snapshot["host"]}; the checks below stop the script on any other database.',
        'BEGIN;',
        "SET LOCAL lock_timeout = '30s';",
        'SET LOCAL search_path = public, extensions;',
    ]

    for year in plan['summary']['seasonsToCreate']:
        statements.append(
            f"INSERT INTO public.temporadas (anio, nombre, activa) VALUES ({year}, {sql(f'Temporada {year}')}, false) ON CONFLICT (anio) DO NOTHING;"
        )
    for key, (name, slug) in sorted(plan['newClubs'].items()):
        statements.append(
            f'INSERT INTO public.clubes (nombre, slug, nombre_corto, activo) VALUES ({sql(name)}, {sql(slug)}, {sql(name)}, false) ON CONFLICT (slug) DO NOTHING;'
        )

    existing_ids = sorted({value['stable_id'] for value in plan['inscriptions'].values() if value['existing']})
    club_slugs = sorted({slug for key, slug in slugs.items() if key not in plan['newClubs']})
    statements.append(f"""DO $$
BEGIN
  IF (SELECT COUNT(*) FROM public.clubes WHERE slug IN ({', '.join(sql(slug) for slug in club_slugs)})) <> {len(club_slugs)} THEN
    RAISE EXCEPTION 'Faltan clubes esperados en esta base';
  END IF;
  IF (SELECT COUNT(DISTINCT stable_id) FROM public.jugadores WHERE stable_id IN ({', '.join(sql(value) for value in existing_ids) or 'NULL'})) <> {len(existing_ids)} THEN
    RAISE EXCEPTION 'Esta base no tiene las identidades de jugadores con las que se armó el script';
  END IF;
END $$;""")

    for analysis in plan['analyses']:
        year = analysis['year']
        manifest = [{'file': item['file'], 'sha256': item['sha256'], 'club': item['club'], 'team': item['team'], 'asOf': item['asOf'], 'record': item['record'], 'rows': item['rows']} for item in analysis['files']]
        batch_summary = {
            'year': year, 'phase': PHASE, 'note': 'Season totals for the whole year (regular season and playoffs together); no games created.',
            'rowsByScope': {scope: sum(1 for row in plan['rows'] if row['year'] == year and row['scope'] == scope) for scope in ('batting', 'pitching', 'fielding')},
            'warnings': len(analysis['warnings']),
        }
        statements.append(
            'INSERT INTO public.iscore_import_batches (source, season_year, workbook_manifest, pdf_manifest, summary) VALUES '
            f'({sql(SOURCE)}, {year}, {sql_json(manifest)}, {sql_json([])}, {sql_json(batch_summary)}) '
            'ON CONFLICT (source, season_year) DO UPDATE SET workbook_manifest = EXCLUDED.workbook_manifest, '
            'summary = EXCLUDED.summary, imported_at = NOW();'
        )

    for (year, club, stable_id), identity in sorted(plan['inscriptions'].items()):
        slug = inscription_slug(year, club, stable_id)
        club_sql = f'(SELECT id FROM public.clubes WHERE slug = {sql(slugs[club])})'
        season_sql = f'(SELECT id FROM public.temporadas WHERE anio = {year})'
        statements.append(
            'INSERT INTO public.jugadores (nombre, slug, posicion, club_id, temporada_id, activo, stable_id, '
            'numero_camiseta, fecha_nacimiento, lugar_nacimiento, batea, lanza, foto_url, bio) '
            f"SELECT {sql(identity['name'])}, {sql(slug)}, COALESCE(src.posicion, 'utility'), {club_sql}, {season_sql}, false, {sql(stable_id)}::uuid, "
            'src.numero_camiseta, src.fecha_nacimiento, src.lugar_nacimiento, src.batea, src.lanza, src.foto_url, src.bio '
            'FROM (SELECT 1) base LEFT JOIN LATERAL ('
            f'SELECT * FROM public.jugadores WHERE stable_id = {sql(stable_id)}::uuid ORDER BY updated_at DESC LIMIT 1) src ON true '
            f'WHERE NOT EXISTS (SELECT 1 FROM public.jugadores WHERE stable_id = {sql(stable_id)}::uuid AND temporada_id = {season_sql} AND club_id = {club_sql}) '
            'ON CONFLICT (slug) DO NOTHING;'
        )

    batch_ids = {year: f'(SELECT id FROM public.iscore_import_batches WHERE source = {sql(SOURCE)} AND season_year = {year})' for year in {row["year"] for row in plan['rows']}}
    for row in plan['rows']:
        club_sql = f'(SELECT id FROM public.clubes WHERE slug = {sql(slugs[row["club"]])})'
        season_sql = f'(SELECT id FROM public.temporadas WHERE anio = {row["year"]})'
        statements.append(
            'INSERT INTO public.estadisticas_temporada_fuente '
            '(import_batch_id, temporada_id, club_id, jugador_id, fase, scope, source_file, source_sha256, stats, raw_stats) '
            f'SELECT {batch_ids[row["year"]]}, {season_sql}, {club_sql}, player.id, {sql(PHASE)}, {sql(row["scope"])}, '
            f'{sql(row["file"])}, {sql(row["sha256"])}, {sql_json(row["stats"])}, {sql_json(row["raw"])} '
            f'FROM public.jugadores player WHERE player.stable_id = {sql(row["stable_id"])}::uuid '
            f'AND player.temporada_id = {season_sql} AND player.club_id = {club_sql} '
            'ON CONFLICT (temporada_id, club_id, jugador_id, fase, scope) DO UPDATE SET '
            'import_batch_id = EXCLUDED.import_batch_id, source_file = EXCLUDED.source_file, '
            'source_sha256 = EXCLUDED.source_sha256, stats = EXCLUDED.stats, raw_stats = EXCLUDED.raw_stats, updated_at = NOW();'
        )

    for year in sorted(batch_ids):
        expected = sum(1 for row in plan['rows'] if row['year'] == year)
        statements.append(
            f"DO $$ BEGIN IF (SELECT COUNT(*) FROM public.estadisticas_temporada_fuente WHERE import_batch_id = {batch_ids[year]}) <> {expected} "
            f"THEN RAISE EXCEPTION 'Cantidad de filas {year} inesperada'; END IF; END $$;"
        )
    statements.append('COMMIT;')
    text = '\n'.join(statements) + '\n'
    if 'INSERT INTO public.partidos' in text:
        raise ValueError('El SQL de totales no debe crear partidos')
    return text


def main():
    parser = argparse.ArgumentParser(description='Build the SQL for the BallClubz 2023-2025 season totals.')
    parser.add_argument('paths', nargs='+', help='ZIP files (one per season) or a folder that contains them')
    parser.add_argument('--env-file', default=str(REPO_ROOT / '.env.local'), help='File with NEXT_PUBLIC_SUPABASE_URL and ANON_KEY (public read only)')
    parser.add_argument('--snapshot', help='JSON snapshot of clubes/temporadas/jugadores instead of reading the database')
    parser.add_argument('--decisions', help='JSON with decisions for ambiguous names: {"club|normalized name": "stable_id" | "new"}')
    parser.add_argument('--sql-out', help='Write the SQL to this file')
    parser.add_argument('--details', action='store_true', help='List identities and issues')
    args = parser.parse_args()

    try:
        analyses = [PREVIEW.preview_year(path) for path in PREVIEW.collect_archives(args.paths)]
        blocking = [message for item in analyses for message in item['errors']]
        if blocking:
            raise ValueError('Los archivos tienen errores de lectura: ' + '; '.join(blocking[:3]))
        snapshot = json.loads(Path(args.snapshot).read_text(encoding='utf-8')) if args.snapshot else fetch_snapshot(args.env_file)
        decisions = json.loads(Path(args.decisions).read_text(encoding='utf-8')) if args.decisions else {}
        plan = build_plan(analyses, snapshot, decisions)
    except (OSError, ValueError, KeyError) as error:
        print(json.dumps({'mode': 'read-only', 'error': str(error)}, ensure_ascii=False, indent=2))
        return 1

    report = {'mode': 'builds SQL only; no database writes', 'summary': plan['summary'], 'issues': plan['issues']}
    if args.details:
        report['ambiguous'] = plan['ambiguous']
        report['newIdentitiesByClub'] = dict(Counter(
            club for (_, club, _), value in plan['inscriptions'].items() if not value['existing']
        ))
    print(json.dumps(report, ensure_ascii=False, indent=2))
    if plan['issues']:
        return 1
    if args.sql_out:
        out = Path(args.sql_out).resolve()
        if not out.parent.is_dir():
            print(f'La carpeta de salida no existe: {out.parent}', file=sys.stderr)
            return 1
        out.write_text(build_sql(plan), encoding='utf-8')
        print(f'SQL generado: {out}')
    return 0


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.exit(main())
