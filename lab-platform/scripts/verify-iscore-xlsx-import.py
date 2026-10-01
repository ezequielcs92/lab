"""Read-only comparison of imported 2019 records against the source workbooks."""

import argparse
import importlib.util
import json
import shutil
import subprocess
from pathlib import Path

SPEC = importlib.util.spec_from_file_location('iscore_import', Path(__file__).with_name('apply-iscore-xlsx-import.py'))
IMPORTER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(IMPORTER)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('root')
    parser.add_argument('--project-ref', default='wnribimpzdoebeqtqxbs', choices=['wnribimpzdoebeqtqxbs', 'fhyurtioqpfmiwdciylt'])
    args = parser.parse_args()
    plan = IMPORTER.collect_plan(Path(args.root).resolve())
    if plan['issues']:
        raise ValueError(plan['issues'])
    linked_ref = (IMPORTER.REPO_ROOT / 'supabase/.temp/project-ref').read_text().strip()
    if linked_ref != args.project_ref:
        raise ValueError('Linked project does not match requested verification target')
    node = shutil.which('node')
    npx_cli = Path(node).resolve().parent / 'node_modules/npm/bin/npx-cli.js'
    query = """
SELECT jsonb_build_object(
  'records', (SELECT jsonb_agg(jsonb_build_object(
    'name', j.nombre, 'clubSlug', c.slug, 'phase', s.fase, 'scope', s.scope,
    'sourceFile', s.source_file, 'sourceSha256', s.source_sha256,
    'stats', s.stats, 'rawStats', s.raw_stats
  )) FROM public.estadisticas_temporada_fuente s
    JOIN public.jugadores j ON j.id=s.jugador_id
    JOIN public.clubes c ON c.id=s.club_id
    JOIN public.temporadas t ON t.id=s.temporada_id WHERE t.anio=2019),
  'workbooks', (SELECT workbook_manifest FROM public.iscore_import_batches WHERE season_year=2019 AND source='iscore-xlsx'),
  'pdfs', (SELECT pdf_manifest FROM public.iscore_import_batches WHERE season_year=2019 AND source='iscore-xlsx')
) AS imported;
"""
    result = subprocess.run(
        [node, str(npx_cli), 'supabase', 'db', 'query', '--linked', ' '.join(query.split())],
        cwd=IMPORTER.REPO_ROOT, capture_output=True, text=True, encoding='utf-8', check=False,
    )
    if result.returncode:
        raise RuntimeError(result.stderr + result.stdout)
    data = json.loads(result.stdout)['rows'][0]['imported']

    def key(record):
        return record['clubSlug'], record['phase'], record['scope'], IMPORTER.normalize(record['name'])

    expected = {key(record): record for record in plan['records']}
    actual = {key(record): record for record in data['records']}
    if len(actual) != len(data['records']) or set(actual) != set(expected):
        raise ValueError('Imported row keys differ from source workbooks')
    for record_key, source in expected.items():
        for field in ('sourceFile', 'sourceSha256', 'stats', 'rawStats'):
            if actual[record_key][field] != source[field]:
                raise ValueError(f'Mismatch in {field}: {record_key}')
    if data['workbooks'] != plan['workbookManifest'] or data['pdfs'] != plan['pdfManifest']:
        raise ValueError('Workbook/PDF manifests differ from source files')
    print(json.dumps({'verifiedRows': len(actual), 'verifiedWorkbooks': len(data['workbooks']),
                      'verifiedPdfHashes': len(data['pdfs']), 'mismatches': 0}, indent=2))


if __name__ == '__main__':
    main()
