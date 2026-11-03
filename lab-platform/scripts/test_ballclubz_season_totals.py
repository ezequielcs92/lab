import importlib.util
import unittest
from pathlib import Path


SCRIPT = Path(__file__).with_name('preview-ballclubz-season-totals.py')
SPEC = importlib.util.spec_from_file_location('ballclubz_season_totals', SCRIPT)
PREVIEW = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(PREVIEW)

BATTER = '10 Perez Juan            .333  3-3  12   3   4   1   0   0   2   5  .417   2   0   3   0  .429   0   0     1-1'
PITCHER = '10 Perez Juan           3.00  1-0  0  6.1  1  1  0   0   5   3   2   1   4  1  0  0  25  .200  0  0  0   0   0   0'
FIELDER = '10 Perez Juan             5    3    2    0    0   1.000    0    0     0    0    0'


def team_report(batting_total_ab='12'):
    return f"""<html><body><pre>            Overall Statistics for Club Cachorros (as of Oct 29, 2026)
            (All Games, Sorted by Batting Avg)

            Record:  Tournament: 14-50 / Opening Round: 7-25

             # PLAYER                  AVG GP-GS  AB   R   H  2B  3B  HR RBI  TB  SLG%  BB  HP  SO GDP   OB%  SF  SH  SB-ATT
            ----------------------------------------------------------------------------------------------------------------
            {BATTER}

               Totals                 .333       {batting_total_ab}   3   4   1   0   0   2   5  .417   2   0   3   0  .429   0   0     1-1

            (All Games, Sorted by Earned Run Avg)

             # PLAYER                  ERA  W-L SV   IP  G GS CG SHO   H   R  ER  BB  SO 2B 3B HR  AB B/Avg WP HP BK IBB SHA SFA
            --------------------------------------------------------------------------------------------------------------------
            {PITCHER}

            (All Games, Sorted by Fielding Pct)

             # PLAYER                   C   PO    A    E   DP    FLD%  CSB  SBA  SBA%   CI   PB
            -----------------------------------------------------------------------------------
            {FIELDER}

               Totals                   5    3    2    0    9   1.000    0    0     0    0    0

            </pre></body></html>"""


LEAGUE = """<html><body><pre>            TEAM                   AVG   G    AB   R   H  2B  3B  HR RBI  TB  SLG%  BB  HP  SO GDP   OB%  SF  SH  SB-ATT
            ------------------------------------------------------------------------------------------------------------
            Club Cachorros        .333   3    12   3   4   1   0   0   2   5  .417   2   0   3   0  .429   0   0   1-1

            TEAM                   ERA   W-L SV    IP GS CG SHO   H   R  ER  BB  SO  2B 3B HR    AB B/Avg  WP HP BKIBB SHA SFA
            ------------------------------------------------------------------------------------------------------------------
            Club Cachorros        3.00   1-0  0   6.1  1  0   0   5   3   2   1   4   1  0  0    25  .200   0  0  0   0   0   0

            TEAM                    C   PO    A    E   DP    FLD%  CSB  SBA  SBA%   CI   PB
            -------------------------------------------------------------------------------
            Club Cachorros          5    3    2    0    0   1.000    0    0     0    0    0
</pre></body></html>"""


class BallclubzSeasonTotalsTests(unittest.TestCase):
    def test_batting_row_keeps_truncated_name_and_maps_to_database_metrics(self):
        _, name, raw = PREVIEW.parse_stat_line(
            '4 Fernandez Cesar Ma     .220 15-15  50  15  11   3   0   1   6  17  .340  11   0  13   0  .361   0   0     6-8',
            PREVIEW.BATTING_COLUMNS,
        )
        stats = PREVIEW.batting_stats(raw)

        self.assertEqual(name, 'Fernandez Cesar Ma')
        self.assertEqual((stats['ab'], stats['h'], stats['doble'], stats['hr']), (50, 11, 3, 1))
        self.assertEqual((stats['sb'], stats['cs'], stats['hbp']), (6, 2, 0))

    def test_pitching_innings_use_baseball_notation(self):
        _, _, raw = PREVIEW.parse_stat_line(PITCHER, PREVIEW.PITCHING_COLUMNS)
        stats = PREVIEW.pitching_stats(raw)

        self.assertEqual((stats['ip_outs'], stats['ip']), (19, '6.1'))
        self.assertEqual((stats['w'], stats['l']), (1, 0))

    def test_glued_columns_are_rejected_instead_of_misread(self):
        with self.assertRaises(ValueError):
            PREVIEW.parse_stat_line('0 Cukierman Mariano  .000  1-1  2  0  0  0  0  0  0  0 .000  0  0  2  0 .158  0  0', PREVIEW.BATTING_COLUMNS)

    def test_record_line_and_totals_are_not_players(self):
        report = PREVIEW.parse_team_report(team_report(), '2023/Cachorros.html')

        self.assertEqual(report['errors'], [])
        self.assertEqual([len(report['players'][scope]) for scope in ('batting', 'pitching', 'fielding')], [1, 1, 1])
        self.assertEqual(report['splitLabels'], ['All Games'])

    def test_team_totals_mismatch_is_reported_but_double_plays_are_not_compared(self):
        clean = PREVIEW.parse_team_report(team_report(), '2023/Cachorros.html')
        off = PREVIEW.parse_team_report(team_report(batting_total_ab='13'), '2023/Cachorros.html')

        self.assertEqual(clean['warnings'], [])
        self.assertEqual(len(off['warnings']), 1)
        self.assertIn('AB: jugadores suman 12, Totals dice 13', off['warnings'][0])

    def test_league_report_is_matched_to_clubs_and_compared_with_players(self):
        report = PREVIEW.parse_team_report(team_report(), '2023/Cachorros.html')
        league = PREVIEW.parse_league_report(LEAGUE, '2023/Totales Equipos.html')

        self.assertEqual(league['errors'], [])
        self.assertEqual(PREVIEW.compare_with_league('cachorros', report, league), [])
        league['teams']['pitching']['cachorros']['SO'] = '5'
        self.assertEqual(len(PREVIEW.compare_with_league('cachorros', report, league)), 1)

    def test_possible_duplicates_find_shorter_and_truncated_spellings_only(self):
        pairs = PREVIEW.possible_duplicates([
            'Hainaer Reyes', 'Hainaer Jose Reyes', 'Alvarado Matias', 'ALVARADO Nicolas', 'Fernandez Cesar Ma', 'Fernandez Cesar Martin',
        ])

        self.assertIn(['Hainaer Reyes', 'Hainaer Jose Reyes'], pairs)
        self.assertIn(['Fernandez Cesar Ma', 'Fernandez Cesar Martin'], pairs)
        self.assertFalse(any('Alvarado Matias' in pair and 'ALVARADO Nicolas' in pair for pair in pairs))

    def test_club_and_year_detection(self):
        self.assertEqual(PREVIEW.club_key('Vélez Sársfield'), 'velez')
        self.assertEqual(PREVIEW.club_key('BA Patriots'), 'patriots')
        self.assertIsNone(PREVIEW.club_key('Equipo Desconocido'))
        self.assertEqual(PREVIEW.year_from_name('2024'), 2024)
        with self.assertRaises(ValueError):
            PREVIEW.year_from_name('historico')


if __name__ == '__main__':
    unittest.main()
