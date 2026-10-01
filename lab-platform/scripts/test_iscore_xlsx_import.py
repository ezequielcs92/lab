import importlib.util
import unittest
from decimal import Decimal
from pathlib import Path


SCRIPT = Path(__file__).with_name('apply-iscore-xlsx-import.py')
SPEC = importlib.util.spec_from_file_location('iscore_xlsx_import', SCRIPT)
IMPORTER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(IMPORTER)


class IscoreXlsxImportTests(unittest.TestCase):
    def test_confirmed_2019_club_mappings(self):
        root = Path('source')
        condors = root / 'POSTEMPORADA 2019' / 'SEMIFINALES' / 'CÓNDORES.xlsx'
        eagles = root / 'TEMPORADA REGULAR 2019' / 'ÁGUILAS' / 'teamstats.xlsx'
        vikings = root / 'TEMPORADA REGULAR 2019' / 'VIKINGOS' / 'teamstats2.xlsx'

        self.assertEqual(IMPORTER.PREVIEW.determine_context(condors, root)[2:], ('arias', 'confirmed-2019-alias'))
        self.assertEqual(IMPORTER.PREVIEW.determine_context(eagles, root)[2:], ('cachorros', 'confirmed-2019-alias'))
        self.assertEqual(IMPORTER.PREVIEW.determine_context(vikings, root)[2:], ('vikingos', 'mapped-exact'))

    def test_pitching_parser_maps_strikeouts_and_baseball_innings(self):
        sheet = {
            'name': 'Pitching',
            'rows': [
                (1, {0: 'Name', 1: 'IP', 2: 'R', 3: 'H', 4: 'ER', 5: 'BB', 6: 'HR', 7: 'W', 8: 'L', 9: 'K'}),
                (2, {0: 'Pitcher One', 1: '5.67', 2: '2', 3: '4', 4: '1', 5: '3', 6: '0', 7: '1', 8: '0', 9: '8'}),
            ],
        }

        records = IMPORTER.parse_sheet_rows(Path('team.xlsx'), sheet, 'regular', 'vikingos', 'a' * 64)

        self.assertEqual(len(records), 1)
        self.assertEqual(records[0]['stats']['ip_outs'], 17)
        self.assertEqual(records[0]['stats']['ip'], '5.2')
        self.assertEqual(records[0]['stats']['so'], 8)
        self.assertEqual(records[0]['rawStats']['K'], '8')

    def test_innings_conversion_handles_iscore_thirds_and_rejects_invalid_fraction(self):
        self.assertEqual(IMPORTER.innings_to_outs('6.33', 'IP'), 19)
        self.assertEqual(IMPORTER.innings_to_outs('6.67', 'IP'), 20)
        self.assertEqual(IMPORTER.innings_to_outs('6.2', 'IP'), 20)
        with self.assertRaises(ValueError):
            IMPORTER.innings_to_outs('6.4', 'IP')

    def test_sql_import_is_idempotent_and_does_not_create_games(self):
        record = {
            'name': 'Pitcher One',
            'normalizedName': 'pitcher one',
            'clubSlug': 'vikingos',
            'phase': 'regular',
            'scope': 'pitching',
            'sourceFile': 'TEMPORADA REGULAR 2019/VIKINGOS/teamstats2.xlsx',
            'sourceSha256': 'a' * 64,
            'stats': {'ip_outs': 17, 'ip': '5.2', 'so': 8},
            'rawStats': {'NAME': 'Pitcher One', 'IP': '5.67', 'K': '8'},
        }
        plan = {
            'issues': [],
            'players': [('vikingos', 'pitcher one')],
            'records': [record],
            'workbookManifest': [],
            'pdfManifest': [],
            'summary': {'year': 2019, 'playerScopeRows': 1},
        }

        sql = IMPORTER.build_sql(plan)

        self.assertIn('ON CONFLICT (source, season_year) DO UPDATE', sql)
        self.assertIn('ON CONFLICT (temporada_id, club_id, jugador_id, fase, scope) DO UPDATE', sql)
        self.assertIn('INSERT INTO public.iscore_import_batches', sql)
        self.assertNotIn('INSERT INTO public.partidos', sql)
        self.assertIn("uuid_generate_v5(uuid_ns_url(), 'lab:iscore:2019:vikingos:pitcher one')", sql)

    def test_decimal_comma_is_parsed_without_loss(self):
        self.assertEqual(IMPORTER.decimal_value('1,25', 'test'), Decimal('1.25'))


if __name__ == '__main__':
    unittest.main()
