"""Read-only inventory and schema preview for the iScore 2019 XLSX exports."""

import argparse
import json
import re
import sys
import unicodedata
import zipfile
from pathlib import Path, PurePosixPath
from xml.etree import ElementTree as ET

NS = {
    'main': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main',
    'rel': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
    'pkg': 'http://schemas.openxmlformats.org/package/2006/relationships',
}
TEAM_SLUGS = {
    'aguilas': 'cachorros',
    'condores': 'arias',
    'falcons': 'falcons',
    'infernales': 'infernales',
    'pumas': 'pumas',
}
CLUB_ALIASES_REQUIRING_2019_CONFIRMATION = {'aguilas', 'condores'}
SCOPE_HEADERS = {
    'batting': {'AB'},
    'pitching': {'IP'},
    'fielding': {'PO'},
}
REQUIRED_HEADERS = {
    'batting': {'AB', 'R', 'H', 'HR', 'RBI'},
    'pitching': {'IP', 'R', 'H', 'ER', 'BB', 'HR', 'W', 'L'},
    'fielding': {'PO', 'A'},
}


def normalize(value):
    text = unicodedata.normalize('NFD', str(value or ''))
    text = ''.join(char for char in text if unicodedata.category(char) != 'Mn')
    return re.sub(r'\s+', ' ', text).strip().lower()


def column_index(reference):
    match = re.match(r'([A-Z]+)', reference.upper())
    if not match:
        return 0
    result = 0
    for char in match.group(1):
        result = result * 26 + ord(char) - ord('A') + 1
    return result - 1


def read_cell(cell, shared_strings):
    cell_type = cell.attrib.get('t')
    value = cell.find('main:v', NS)
    if cell_type == 'inlineStr':
        inline = cell.find('main:is', NS)
        return ''.join(item.text or '' for item in inline.findall('.//main:t', NS)) if inline is not None else ''
    if value is None or value.text is None:
        return ''
    if cell_type == 's':
        index = int(value.text)
        return shared_strings[index] if index < len(shared_strings) else ''
    return value.text


def read_workbook(path):
    with zipfile.ZipFile(path) as book:
        workbook = ET.fromstring(book.read('xl/workbook.xml'))
        relationships = ET.fromstring(book.read('xl/_rels/workbook.xml.rels'))
        targets = {item.attrib['Id']: item.attrib['Target'] for item in relationships.findall('pkg:Relationship', NS)}
        try:
            shared_root = ET.fromstring(book.read('xl/sharedStrings.xml'))
            shared_strings = [
                ''.join(part.text or '' for part in item.findall('.//main:t', NS))
                for item in shared_root.findall('main:si', NS)
            ]
        except KeyError:
            shared_strings = []

        sheets = []
        for sheet in workbook.findall('main:sheets/main:sheet', NS):
            target = targets[sheet.attrib[f"{{{NS['rel']}}}id"]]
            sheet_path = target.lstrip('/') if target.startswith('/') else str(PurePosixPath('xl') / target)
            worksheet = ET.fromstring(book.read(sheet_path))
            rows = []
            for row in worksheet.findall('main:sheetData/main:row', NS):
                values = {}
                for cell in row.findall('main:c', NS):
                    values[column_index(cell.attrib.get('r', ''))] = read_cell(cell, shared_strings)
                rows.append((int(row.attrib.get('r', len(rows) + 1)), values))
            sheets.append({'name': sheet.attrib['name'], 'rows': rows})
        return sheets


def find_header(rows, scope):
    for row_number, values in rows[:12]:
        headers = {normalize(value).upper(): index for index, value in values.items() if str(value).strip()}
        has_name = any(name in headers for name in ('NAME', 'PLAYER', 'PLAYER NAME'))
        if has_name and SCOPE_HEADERS[scope].intersection(headers):
            return row_number, headers
    return None, {}


def player_rows(rows, header_row, headers):
    name_col = next(headers[name] for name in ('NAME', 'PLAYER', 'PLAYER NAME') if name in headers)
    output = []
    for row_number, values in rows:
        if row_number <= header_row:
            continue
        name = str(values.get(name_col, '')).strip()
        if not name or normalize(name) in {'total', 'totals', 'team totals'}:
            continue
        output.append(name)
    return output


def determine_context(path, root):
    relative = path.relative_to(root)
    phase = 'playoffs' if any('postemporada' in normalize(part) or 'semifinal' in normalize(part) for part in relative.parts) else 'regular'
    team_name = path.stem if phase == 'playoffs' else path.parent.name
    normalized_team = normalize(team_name)
    mapped_slug = TEAM_SLUGS.get(normalized_team)
    mapping_status = (
        'unmapped' if mapped_slug is None
        else 'confirm-2019-alias' if normalized_team in CLUB_ALIASES_REQUIRING_2019_CONFIRMATION
        else 'mapped-exact'
    )
    return phase, team_name, mapped_slug, mapping_status


def inspect_file(path, root):
    phase, team_name, mapped_slug, mapping_status = determine_context(path, root)
    sheet_reports = []
    player_names = set()
    duplicate_names = []

    for sheet in read_workbook(path):
        scope = normalize(sheet['name'])
        if scope not in {'batting', 'pitching', 'fielding'}:
            continue
        header_row, headers = find_header(sheet['rows'], scope)
        if header_row is None:
            sheet_reports.append({
                'scope': scope,
                'playerRows': 0,
                'missingRequiredHeaders': sorted(REQUIRED_HEADERS[scope]),
                'error': 'Could not find a recognized Name/statistics header row',
            })
            continue

        actual_headers = set(headers)
        names = player_rows(sheet['rows'], header_row, headers)
        seen = set()
        duplicates = set()
        for name in names:
            normalized = normalize(name)
            if normalized in seen:
                duplicates.add(normalized)
            seen.add(normalized)
            player_names.add(normalized)
        duplicate_names.extend(sorted(duplicates))
        sheet_reports.append({
            'scope': scope,
            'headerRow': header_row,
            'playerRows': len(names),
            'headers': sorted(actual_headers),
            'missingRequiredHeaders': sorted(REQUIRED_HEADERS[scope] - actual_headers),
            'duplicateNamesWithinSheet': sorted(duplicates),
        })

    return {
        'file': str(path.relative_to(root)),
        'phase': phase,
        'team': team_name,
        'candidateClubSlug': mapped_slug,
        'clubMappingStatus': mapping_status,
        'clubMappingRequired': mapping_status != 'mapped-exact',
        'sheets': sheet_reports,
        'distinctPlayersAcrossSheets': len(player_names),
        'duplicateNamesAcrossSheets': sorted(set(duplicate_names)),
    }


def main():
    parser = argparse.ArgumentParser(description='Preview iScore 2019 Excel season summaries without writing data.')
    parser.add_argument('root', help='Root folder containing the extracted 2019 iScore files')
    parser.add_argument('--details', action='store_true', help='Include per-workbook sheets, headers and row counts')
    args = parser.parse_args()
    root = Path(args.root).resolve()
    if not root.is_dir():
        parser.error(f'Folder not found: {root}')

    files = sorted(root.rglob('*.xlsx'))
    if not files:
        parser.error(f'No XLSX workbooks found under {root}')
    reports = [inspect_file(path, root) for path in files]
    mapping_reviews = sorted({
        (report['team'], report['candidateClubSlug'], report['clubMappingStatus'])
        for report in reports if report['clubMappingRequired']
    })
    summary = {
        'mode': 'read-only preview; no database writes',
        'workbooks': len(reports),
        'regularSeasonWorkbooks': sum(report['phase'] == 'regular' for report in reports),
        'playoffWorkbooks': sum(report['phase'] == 'playoffs' for report in reports),
        'clubMappingReviews': [
            {'team': team, 'candidateClubSlug': slug, 'status': status}
            for team, slug, status in mapping_reviews
        ],
        'playerRowsAcrossSheets': sum(sheet['playerRows'] for report in reports for sheet in report['sheets']),
        'missingRequiredHeaderSheets': sum(bool(sheet.get('missingRequiredHeaders')) for report in reports for sheet in report['sheets']),
        'duplicatePlayerNamesInSheets': sum(len(sheet.get('duplicateNamesWithinSheet', [])) for report in reports for sheet in report['sheets']),
    }
    result = {**summary, 'reports': reports} if args.details else summary
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    try:
        main()
    except (OSError, zipfile.BadZipFile, ET.ParseError) as error:
        print(f'Could not inspect iScore workbooks: {error}', file=sys.stderr)
        sys.exit(1)
