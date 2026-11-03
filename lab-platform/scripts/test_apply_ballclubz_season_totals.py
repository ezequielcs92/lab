import importlib.util
import unittest
from pathlib import Path


def load(name, file_name):
    spec = importlib.util.spec_from_file_location(name, Path(__file__).with_name(file_name))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


APPLY = load('apply_ballclubz_totals', 'apply-ballclubz-season-totals.py')
FIXTURES = load('ballclubz_totals_fixtures', 'test_ballclubz_season_totals.py')

CLUB_ID = '00000000-0000-0000-0000-0000000000c1'
OLD_ID = '11111111-1111-4111-8111-111111111111'


def snapshot(players=()):
    return {
        'host': 'example.supabase.co',
        'clubes': [{'id': CLUB_ID, 'nombre': 'Cachorros de Salta', 'nombre_corto': 'Cachorros', 'slug': 'cachorros'}],
        'temporadas': [{'id': 's25', 'anio': 2025, 'nombre': 'Temporada 2025'}],
        'jugadores': list(players),
    }


def analysis(year=2023):
    report = APPLY.PREVIEW.parse_team_report(FIXTURES.team_report(), f'{year}/Cachorros.html')
    item = {'club': 'cachorros', 'file': f'{year}/Cachorros.html', 'sha256': 'a' * 64, 'team': 'Club Cachorros', 'asOf': 'x', 'record': None, 'rows': {}}
    return {'year': year, 'files': [item], 'warnings': [], 'errors': [], '_reports': {'cachorros': report}}


class ApplyBallclubzSeasonTotalsTests(unittest.TestCase):
    def test_name_matching_handles_order_accents_and_cut_off_names(self):
        self.assertTrue(APPLY.source_matches('RIELLO Kevin', 'Kevin Riello'))
        self.assertTrue(APPLY.source_matches('FIGUERAS Pedro Agust', 'Pedro Agustín Figueras'))
        self.assertFalse(APPLY.source_matches('AMMA Pedro', 'Pedro Amma Lopez'))
        self.assertTrue(APPLY.same_player_in_sources('Rojas Eduardo', 'Eduardo Rojas'))
        self.assertTrue(APPLY.same_player_in_sources('Fernandez Cesar Ma', 'Fernandez Cesar Martin'))
        self.assertFalse(APPLY.same_player_in_sources('Alvarado Matias', 'Alvarado Nicolas'))

    def test_suggested_names_move_capitalized_surnames_only(self):
        self.assertEqual(APPLY.suggest_name('RHODES Charles Aaron'), 'Charles Aaron Rhodes')
        self.assertEqual(APPLY.suggest_name('Fernandez Cesar Ma'), 'Fernandez Cesar Ma')
        self.assertEqual(APPLY.suggest_name('MERA'), 'Mera')

    def test_spellings_of_one_player_are_summed_with_baseball_innings(self):
        pitching = APPLY.merge_stats('pitching', {'h': 1, 'ip_outs': 6, 'ip': '2.0', 'w': 0}, {'h': 2, 'ip_outs': 2, 'ip': '0.2', 'w': 1})
        self.assertEqual((pitching['h'], pitching['ip_outs'], pitching['ip'], pitching['w']), (3, 8, '2.2', 1))

    def test_unknown_players_become_new_identities_and_known_ones_reuse_theirs(self):
        known = [{'id': 'p1', 'nombre': 'Juan Perez', 'club_id': CLUB_ID, 'temporada_id': None, 'stable_id': OLD_ID, 'updated_at': '2026-01-01'}]
        plan = APPLY.build_plan([analysis()], snapshot(known))
        self.assertEqual(plan['issues'], [])
        self.assertEqual(plan['summary']['identitiesLinkedToExisting'], 1)
        self.assertEqual(plan['summary']['seasonsToCreate'], [2023])
        self.assertEqual({row['stable_id'] for row in plan['rows']}, {OLD_ID})
        fresh = APPLY.build_plan([analysis()], snapshot())
        self.assertEqual(fresh['summary']['newIdentities'], 1)
        self.assertEqual(fresh['rows'][0]['identity']['name'], 'Perez Juan')

    def test_names_that_match_two_identities_block_the_build_until_decided(self):
        twins = [
            {'id': 'p1', 'nombre': 'Juan Perez', 'club_id': CLUB_ID, 'temporada_id': None, 'stable_id': OLD_ID, 'updated_at': '2026-01-01'},
            {'id': 'p2', 'nombre': 'Juan Pérez', 'club_id': CLUB_ID, 'temporada_id': '2019', 'stable_id': '22222222-2222-4222-8222-222222222222', 'updated_at': '2026-01-01'},
        ]
        blocked = APPLY.build_plan([analysis()], snapshot(twins))
        self.assertEqual(len(blocked['ambiguous']), 1)
        with self.assertRaises(ValueError):
            APPLY.build_sql(blocked)
        decided = APPLY.build_plan([analysis()], snapshot(twins), {'cachorros|perez juan': OLD_ID})
        self.assertEqual(decided['issues'], [])

    def test_sql_is_idempotent_guarded_and_never_creates_games(self):
        sql = APPLY.build_sql(APPLY.build_plan([analysis()], snapshot()))
        for fragment in (
            'ON CONFLICT (temporada_id, club_id, jugador_id, fase, scope) DO UPDATE',
            'ON CONFLICT (source, season_year) DO UPDATE',
            'ON CONFLICT (anio) DO NOTHING',
            'RAISE EXCEPTION',
            "'regular'",
        ):
            self.assertIn(fragment, sql)
        self.assertNotIn('INSERT INTO public.partidos', sql)
        self.assertTrue(sql.rstrip().endswith('COMMIT;'))


if __name__ == '__main__':
    unittest.main()
