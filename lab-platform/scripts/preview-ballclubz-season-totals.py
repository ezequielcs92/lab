"""Read-only preview of BallClubz season team reports (2023-2025).

Each ZIP holds one "Overall Statistics" HTML per club plus a league-wide team
totals page. Nothing is written to the database or extracted to disk: the
preview parses the HTML in memory, cross-checks every figure it can and lists
the name problems that need a human decision before an import.
"""

import argparse
import html
import json
import re
import sys
import unicodedata
import zipfile
from collections import Counter, defaultdict
from decimal import Decimal
from pathlib import Path


MAX_MEMBER_BYTES = 2 * 1024 * 1024
TRUNCATED_NAME_LENGTH = 17

# Normalized file stem or report title -> club key. Mapping to LAB club slugs
# happens when the import is applied, not here.
CLUB_ALIASES = {
    'arias': 'arias', 'club arias': 'arias',
    'cachorros': 'cachorros', 'club cachorros': 'cachorros',
    'daom': 'daom', 'club daom': 'daom',
    'falcons': 'falcons',
    'hawkers': 'hawkers',
    'patriots': 'patriots', 'ba patriots': 'patriots', 'buenos aires patriots': 'patriots',
    'popeye': 'popeye', 'club popeye': 'popeye',
    'velez': 'velez', 'velez sarsfield': 'velez',
}

INT = 'int'
RATE = 'rate'
PAIR = 'pair'
IP = 'ip'

BATTING_COLUMNS = [
    ('AVG', RATE), ('GP-GS', PAIR), ('AB', INT), ('R', INT), ('H', INT), ('2B', INT), ('3B', INT),
    ('HR', INT), ('RBI', INT), ('TB', INT), ('SLG%', RATE), ('BB', INT), ('HP', INT), ('SO', INT),
    ('GDP', INT), ('OB%', RATE), ('SF', INT), ('SH', INT), ('SB-ATT', PAIR),
]
PITCHING_COLUMNS = [
    ('ERA', RATE), ('W-L', PAIR), ('SV', INT), ('IP', IP), ('G', INT), ('GS', INT), ('CG', INT),
    ('SHO', INT), ('H', INT), ('R', INT), ('ER', INT), ('BB', INT), ('SO', INT), ('2B', INT),
    ('3B', INT), ('HR', INT), ('AB', INT), ('B/Avg', RATE), ('WP', INT), ('HP', INT), ('BK', INT),
    ('IBB', INT), ('SHA', INT), ('SFA', INT),
]
FIELDING_COLUMNS = [
    ('C', INT), ('PO', INT), ('A', INT), ('E', INT), ('DP', INT), ('FLD%', RATE), ('CSB', INT),
    ('SBA', INT), ('SBA%', RATE), ('CI', INT), ('PB', INT),
]
COLUMNS = {'batting': BATTING_COLUMNS, 'pitching': PITCHING_COLUMNS, 'fielding': FIELDING_COLUMNS}
SECTION_SCOPES = (('batting', 'batting avg'), ('pitching', 'earned run'), ('fielding', 'fielding pct'))

# The league page has no player rows: one line per club, and no G column in pitching.
LEAGUE_COLUMNS = {
    'batting': [('AVG', RATE), ('G', INT)] + [column for column in BATTING_COLUMNS[2:]],
    'pitching': [column for column in PITCHING_COLUMNS if column[0] not in ('G',)],
    'fielding': FIELDING_COLUMNS,
}

TOKEN_PATTERNS = {
    INT: re.compile(r'^\d+$'),
    RATE: re.compile(r'^(\d+)?\.\d+$|^\d+(\.\d+)?$'),
    PAIR: re.compile(r'^\d+-\d+$'),
    IP: re.compile(r'^\d+\.[012]$'),
}

# Fields compared between the sum of the player rows and the team totals. Fielding
# DP is left out on purpose: each player is credited with every double play he took
# part in, while the team total counts each play once.
RECONCILE = {
    'batting': ['AB', 'R', 'H', '2B', '3B', 'HR', 'RBI', 'BB', 'HP', 'SO', 'SF', 'SH', 'GDP'],
    'pitching': ['H', 'R', 'ER', 'BB', 'SO', 'HR', 'SV', 'WP', 'HP', 'BK'],
    'fielding': ['C', 'PO', 'A', 'E'],
}
# The team "Totals" row of the batting table omits the GP-GS column.
TOTALS_COLUMNS = {
    'batting': [column for column in BATTING_COLUMNS if column[0] != 'GP-GS'],
    'pitching': PITCHING_COLUMNS,
    'fielding': FIELDING_COLUMNS,
}


def normalize(value):
    text = unicodedata.normalize('NFD', str(value or ''))
    text = ''.join(char for char in text if unicodedata.category(char) != 'Mn')
    return re.sub(r'\s+', ' ', text).strip().lower()


def name_tokens(value):
    return re.sub(r'[^a-z ]', ' ', normalize(value)).split()


def club_key(value):
    return CLUB_ALIASES.get(normalize(value))


def clean_name(value):
    return re.sub(r'\s+', ' ', value).strip()


def innings_to_outs(value):
    whole, fraction = value.split('.')
    return int(whole) * 3 + int(fraction)


def baseball_ip(outs):
    return f'{outs // 3}.{outs % 3}'


def extract_pre(text):
    match = re.search(r'<pre[^>]*>(.*?)</pre>', text, re.DOTALL | re.IGNORECASE)
    if not match:
        raise ValueError('No se encontró el bloque <pre> con las estadísticas')
    return html.unescape(match.group(1)).replace('\r\n', '\n')


def parse_stat_line(line, columns):
    """Return (jersey, name, {header: raw}) or raise ValueError for a malformed row."""
    tokens = line.split()
    count = len(columns)
    if len(tokens) < count + 2 or not tokens[0].isdigit():
        raise ValueError(f'Fila con formato inesperado: {line.strip()!r}')
    name = clean_name(' '.join(tokens[1:-count]))
    raw = dict(zip((header for header, _ in columns), tokens[-count:]))
    for header, kind in columns:
        if not TOKEN_PATTERNS[kind].match(raw[header]):
            raise ValueError(f'Valor inválido en {header} ({raw[header]!r}): {line.strip()!r}')
    return tokens[0], name, raw


def try_totals(line, columns, label_pattern):
    """Parse a Totals/Opponents row; glued columns make it unparseable, which is not an error."""
    tokens = line.split()
    count = len(columns)
    if not tokens or not re.match(label_pattern, tokens[0], re.IGNORECASE) or len(tokens) != count + 1:
        return None
    raw = dict(zip((header for header, _ in columns), tokens[-count:]))
    if not all(TOKEN_PATTERNS[kind].match(raw[header]) for header, kind in columns):
        return None
    return raw


def to_int(raw, header):
    return int(raw[header])


def batting_stats(raw):
    stolen, attempts = (int(part) for part in raw['SB-ATT'].split('-'))
    return {
        'ab': to_int(raw, 'AB'), 'r': to_int(raw, 'R'), 'h': to_int(raw, 'H'),
        'doble': to_int(raw, '2B'), 'triple': to_int(raw, '3B'), 'hr': to_int(raw, 'HR'),
        'rbi': to_int(raw, 'RBI'), 'bb': to_int(raw, 'BB'), 'so': to_int(raw, 'SO'),
        'sb': stolen, 'cs': max(attempts - stolen, 0), 'sf': to_int(raw, 'SF'), 'hbp': to_int(raw, 'HP'),
    }


def pitching_stats(raw):
    wins, losses = (int(part) for part in raw['W-L'].split('-'))
    outs = innings_to_outs(raw['IP'])
    return {
        'h': to_int(raw, 'H'), 'r': to_int(raw, 'R'), 'er': to_int(raw, 'ER'), 'bb': to_int(raw, 'BB'),
        'so': to_int(raw, 'SO'), 'hr': to_int(raw, 'HR'), 'w': wins, 'l': losses, 'sv': to_int(raw, 'SV'),
        'wp': to_int(raw, 'WP'), 'bk': to_int(raw, 'BK'), 'ip_outs': outs, 'ip': baseball_ip(outs),
    }


def fielding_stats(raw):
    return {'po': to_int(raw, 'PO'), 'a': to_int(raw, 'A'), 'e': to_int(raw, 'E'), 'dp': to_int(raw, 'DP')}


STATS_BUILDERS = {'batting': batting_stats, 'pitching': pitching_stats, 'fielding': fielding_stats}


def row_warnings(scope, name, raw):
    found = []
    if scope == 'batting':
        h, ab = int(raw['H']), int(raw['AB'])
        doubles, triples, homers = int(raw['2B']), int(raw['3B']), int(raw['HR'])
        if h > ab or doubles + triples + homers > h:
            found.append(f'{name}: bateo inconsistente (H/AB/2B/3B/HR)')
        elif int(raw['TB']) != h + doubles + 2 * triples + 3 * homers:
            found.append(f'{name}: TB {raw["TB"]} no coincide con H/2B/3B/HR')
        if ab and abs(Decimal(raw['AVG']) - Decimal(h) / Decimal(ab)) > Decimal('0.0015'):
            found.append(f'{name}: AVG {raw["AVG"]} no coincide con H/AB')
    elif scope == 'pitching':
        if int(raw['ER']) > int(raw['R']):
            found.append(f'{name}: ER mayor que R')
    elif scope == 'fielding':
        if int(raw['C']) != int(raw['PO']) + int(raw['A']) + int(raw['E']):
            found.append(f'{name}: C no coincide con PO+A+E')
    return found


def split_sections(pre):
    sections = {}
    split_labels = set()
    pattern = re.compile(r'^\s*\(([^,)]+), Sorted by ([^)]+)\)\s*$', re.MULTILINE)
    matches = list(pattern.finditer(pre))
    for index, match in enumerate(matches):
        end = matches[index + 1].start() if index + 1 < len(matches) else len(pre)
        sort_key = normalize(match.group(2))
        for scope, marker in SECTION_SCOPES:
            if marker in sort_key:
                sections[scope] = pre[match.end():end]
                split_labels.add(match.group(1).strip())
    return sections, split_labels


def parse_team_report(text, source):
    pre = extract_pre(text)
    errors, warnings = [], []
    title = re.search(r'Overall Statistics for (.+?) \(as of ([^)]+)\)', pre)
    if not title:
        raise ValueError('No se encontró el encabezado "Overall Statistics for"')
    sections, split_labels = split_sections(pre)
    missing = [scope for scope, _ in SECTION_SCOPES if scope not in sections]
    if missing:
        raise ValueError(f'Faltan secciones: {", ".join(missing)}')

    record = re.search(r'Record:\s*(.+)', pre)
    players = {scope: [] for scope in COLUMNS}
    totals = {}
    for scope, body in sections.items():
        columns = COLUMNS[scope]
        in_table = False
        for line in body.splitlines():
            stripped = line.strip()
            if stripped and set(stripped) <= {'-'}:
                in_table = True
                continue
            if not in_table or not stripped:
                continue
            if re.match(r'^(Totals|Opponents)\b', stripped, re.IGNORECASE):
                if stripped.lower().startswith('totals'):
                    totals[scope] = try_totals(line, TOTALS_COLUMNS[scope], r'^Totals$')
                continue
            try:
                jersey, name, raw = parse_stat_line(line, columns)
            except ValueError as error:
                errors.append(f'{source} [{scope}]: {error}')
                continue
            try:
                stats = STATS_BUILDERS[scope](raw)
            except ValueError as error:
                errors.append(f'{source} [{scope}] {name}: {error}')
                continue
            warnings.extend(f'{source} [{scope}] {message}' for message in row_warnings(scope, name, raw))
            players[scope].append({'jersey': jersey, 'name': name, 'stats': stats, 'rawStats': raw})

    for scope, rows in players.items():
        seen = Counter(normalize(row['name']) for row in rows)
        for name, count in seen.items():
            if count > 1:
                errors.append(f'{source} [{scope}]: nombre repetido en el mismo club: {name}')

    reconciliation = reconcile_totals(players, totals, source)
    return {
        'team': clean_name(title.group(1)),
        'asOf': title.group(2),
        'record': clean_name(record.group(1)) if record else None,
        'splitLabels': sorted(split_labels),
        'players': players,
        'totals': totals,
        'errors': errors,
        'warnings': warnings + reconciliation,
    }


def raw_sum(rows, header):
    return sum(int(row['rawStats'][header]) for row in rows)


def reconcile_totals(players, totals, source):
    found = []
    for scope, headers in RECONCILE.items():
        total = totals.get(scope)
        if total is None:
            continue  # glued columns (pitching); the league page covers this comparison
        for header in headers:
            expected, actual = int(total[header]), raw_sum(players[scope], header)
            if expected != actual:
                found.append(f'{source} [{scope}] {header}: jugadores suman {actual}, Totals dice {expected}')
    return found


def parse_league_report(text, source):
    pre = extract_pre(text)
    teams = {scope: {} for scope in LEAGUE_COLUMNS}
    errors = []
    blocks = re.split(r'\n\s*\n', pre)
    scope = None
    for block in blocks:
        head = next((line for line in block.splitlines() if line.strip()), '')
        header = normalize(head)
        if not header.startswith('team'):
            continue
        if 'fld%' in header:
            scope = 'fielding'
        elif ' era ' in f' {header} ':
            scope = 'pitching'
        elif ' avg ' in f' {header} ':
            scope = 'batting'
        else:
            continue
        columns = LEAGUE_COLUMNS[scope]
        for line in block.splitlines():
            stripped = line.strip()
            if not stripped or set(stripped) <= {'-'} or normalize(stripped).startswith('team '):
                continue
            if stripped.upper().startswith('TOTALS'):
                continue
            tokens = line.split()
            count = len(columns)
            if len(tokens) < count + 1:
                errors.append(f'{source} [{scope}]: fila de club ilegible: {stripped!r}')
                continue
            raw = dict(zip((name for name, _ in columns), tokens[-count:]))
            if not all(TOKEN_PATTERNS[kind].match(raw[name]) for name, kind in columns):
                errors.append(f'{source} [{scope}]: valores inválidos en fila de club: {stripped!r}')
                continue
            key = club_key(clean_name(' '.join(tokens[:-count])))
            if key is None:
                errors.append(f'{source} [{scope}]: club desconocido en acumulados de liga: {" ".join(tokens[:-count])!r}')
                continue
            teams[scope][key] = raw
    return {'teams': teams, 'errors': errors}


def compare_with_league(club, report, league):
    found = []
    for scope, headers in RECONCILE.items():
        row = league['teams'][scope].get(club)
        if row is None:
            found.append(f'{club} [{scope}]: no aparece en los acumulados de liga')
            continue
        for header in headers:
            if header not in row:
                continue
            expected, actual = int(row[header]), raw_sum(report['players'][scope], header)
            if expected != actual:
                found.append(f'{club} [{scope}] {header}: jugadores suman {actual}, la liga dice {expected}')
    return found


def token_match(short, long, short_is_truncated):
    return short == long or (long.startswith(short) and (len(short) == 1 or short_is_truncated))


def possible_duplicates(names):
    """Same-club names where one looks like a shorter or truncated spelling of another."""
    found = []
    unique = sorted(set(names))
    for first in unique:
        for second in unique:
            if first == second:
                continue
            first_tokens, second_tokens = name_tokens(first), name_tokens(second)
            if not first_tokens or len(first_tokens) > len(second_tokens):
                continue
            if len(first_tokens) == len(second_tokens) and first > second:
                continue
            truncated = len(first) >= TRUNCATED_NAME_LENGTH
            remaining = list(second_tokens)
            matched = True
            for token in first_tokens:
                hit = next((other for other in remaining if token_match(token, other, truncated)), None)
                if hit is None:
                    matched = False
                    break
                remaining.remove(hit)
            if matched:
                found.append([first, second])
    return found


def player_review(parsed_by_club):
    """Name problems per club that need a decision before import."""
    review = {}
    club_by_name = defaultdict(set)
    for club, report in parsed_by_club.items():
        names = {}
        for rows in report['players'].values():
            for row in rows:
                names.setdefault(normalize(row['name']), row['name'])
        batting_names = {normalize(row['name']) for row in report['players']['batting']}
        other_names = {
            normalize(row['name']) for scope in ('pitching', 'fielding') for row in report['players'][scope]
        }
        for key in names:
            club_by_name[key].add(club)
        review[club] = {
            'players': len(names),
            'truncatedNames': sorted(name for name in names.values() if len(name) >= TRUNCATED_NAME_LENGTH),
            'possibleDuplicates': possible_duplicates(names.values()),
            'notInBatting': sorted(names[key] for key in other_names - batting_names),
        }
    cross_club = sorted(
        ({'name': name, 'clubs': sorted(clubs)} for name, clubs in club_by_name.items() if len(clubs) > 1),
        key=lambda item: item['name'],
    )
    return review, cross_club


def year_from_name(name):
    match = re.search(r'(?<!\d)(20\d{2})(?!\d)', name)
    if not match:
        raise ValueError(f'No se pudo deducir el año del nombre {name!r}')
    return int(match.group(1))


def read_archive(path):
    members = {}
    with zipfile.ZipFile(path) as archive:
        for info in archive.infolist():
            if info.is_dir() or not info.filename.lower().endswith('.html'):
                continue
            if info.file_size > MAX_MEMBER_BYTES:
                raise ValueError(f'{path.name}: {info.filename} supera {MAX_MEMBER_BYTES} bytes')
            raw = archive.read(info)
            try:
                members[Path(info.filename).name] = raw.decode('utf-8')
            except UnicodeDecodeError as error:
                raise ValueError(f'{path.name}: {info.filename} no es UTF-8 válido') from error
    return members


def collect_archives(arguments):
    archives = []
    for argument in arguments:
        path = Path(argument).resolve()
        if path.is_dir():
            archives.extend(sorted(path.glob('*.zip')))
        elif path.is_file():
            archives.append(path)
        else:
            raise ValueError(f'No existe: {path}')
    if not archives:
        raise ValueError('No se encontraron ZIP')
    return archives


def preview_year(path):
    year = year_from_name(path.stem)
    members = read_archive(path)
    errors, warnings = [], []
    league_name = next((name for name in members if normalize(name).startswith('totales')), None)
    league = None
    if league_name is None:
        errors.append(f'{year}: falta el archivo de acumulados de liga')
    else:
        league = parse_league_report(members[league_name], f'{year}/{league_name}')
        errors.extend(league['errors'])

    parsed = {}
    manifest = []
    for file_name in sorted(members):
        if file_name == league_name:
            continue
        source = f'{year}/{file_name}'
        key = club_key(Path(file_name).stem)
        if key is None:
            errors.append(f'{source}: club sin mapeo')
            continue
        try:
            report = parse_team_report(members[file_name], source)
        except ValueError as error:
            errors.append(f'{source}: {error}')
            continue
        if club_key(report['team']) != key:
            warnings.append(f'{source}: el encabezado dice "{report["team"]}" pero el archivo es de {key}')
        if report['splitLabels'] != ['All Games']:
            warnings.append(f'{source}: el alcance no es "All Games": {report["splitLabels"]}')
        errors.extend(report['errors'])
        warnings.extend(report['warnings'])
        if league is not None:
            warnings.extend(f'{year}: {message}' for message in compare_with_league(key, report, league))
        parsed[key] = report
        manifest.append({
            'file': source,
            'club': key,
            'team': report['team'],
            'asOf': report['asOf'],
            'record': report['record'],
            'rows': {scope: len(rows) for scope, rows in report['players'].items()},
        })

    if league is not None:
        for scope in LEAGUE_COLUMNS:
            for key in league['teams'][scope]:
                if key not in parsed:
                    errors.append(f'{year}: {key} figura en los acumulados de liga pero no tiene archivo propio')

    review, cross_club = player_review(parsed)
    return {
        'year': year,
        'archive': path.name,
        'clubs': sorted(parsed),
        'files': manifest,
        'playerScopeRows': sum(len(rows) for report in parsed.values() for rows in report['players'].values()),
        'playerReview': review,
        'crossClubNames': cross_club,
        'errors': errors,
        'warnings': warnings,
    }


def main():
    parser = argparse.ArgumentParser(description='Read-only preview of BallClubz season team reports.')
    parser.add_argument('paths', nargs='+', help='ZIP files (one per season) or a folder that contains them')
    parser.add_argument('--details', action='store_true', help='List every warning and name review')
    args = parser.parse_args()

    try:
        years = [preview_year(path) for path in collect_archives(args.paths)]
    except (OSError, ValueError, zipfile.BadZipFile) as error:
        print(json.dumps({'mode': 'read-only preview', 'error': str(error)}, ensure_ascii=False, indent=2))
        return 1

    summary = []
    for item in years:
        review = item['playerReview']
        summary.append({
            'year': item['year'],
            'clubs': item['clubs'],
            'playerScopeRows': item['playerScopeRows'],
            'playersByClub': {club: data['players'] for club, data in review.items()},
            'truncatedNames': sum(len(data['truncatedNames']) for data in review.values()),
            'possibleDuplicates': sum(len(data['possibleDuplicates']) for data in review.values()),
            'crossClubNames': len(item['crossClubNames']),
            'warnings': len(item['warnings']),
            'errors': len(item['errors']),
        })
    report = {'mode': 'read-only preview; no database writes', 'seasons': summary}
    if args.details:
        report['details'] = years
    else:
        report['errors'] = [message for item in years for message in item['errors']]
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 1 if any(item['errors'] for item in years) else 0


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    try:
        sys.exit(main())
    except (OSError, ValueError) as error:
        print(json.dumps({'error': str(error)}, ensure_ascii=False, indent=2), file=sys.stderr)
        sys.exit(1)
