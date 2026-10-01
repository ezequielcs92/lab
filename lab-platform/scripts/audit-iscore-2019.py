"""Read-only source audits: scorecards, multiclub names and gallery metadata."""
import argparse
import importlib.util
import json
import re
from collections import defaultdict, Counter
from pathlib import Path
from datetime import datetime
from pypdf import PdfReader

SPEC = importlib.util.spec_from_file_location('xlsx', Path(__file__).with_name('apply-iscore-xlsx-import.py'))
XLSX = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(XLSX)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('root')
    parser.add_argument('--sample', action='store_true')
    args = parser.parse_args()
    root = Path(args.root).resolve()
    files = sorted(root.rglob('*.pdf'))
    if args.sample:
        for page in PdfReader(files[0]).pages[:2]:
            for line in page.extract_text(extraction_mode='layout').splitlines():
                if re.search(r'Team:|Runs:|Hits:|Salta|2019|8/31|Aguil|Infern', line, re.I):
                    print(repr(line))
        return
    plan = XLSX.collect_plan(root)
    names = defaultdict(list)
    for record in plan['records']:
        names[record['normalizedName']].append(record)
    review = ['# Jugadores multiclub 2019 para revisar', '', 'Fecha: 2026-10-01. Nombre compartido no prueba identidad. Confirmar por Wilmer/Matias; no se fusionaron perfiles.', '', '| Nombre(s) fuente | Club / fase | AB / H / HR o alcance | Misma persona? |', '|---|---|---|---|']
    for name, records in sorted(names.items()):
        if len({record['clubSlug'] for record in records}) < 2:
            continue
        contexts = defaultdict(list)
        for record in records:
            contexts[(record['clubSlug'], record['phase'])].append(record)
        for (club, phase), group in sorted(contexts.items()):
            batting = next((record for record in group if record['scope'] == 'batting'), None)
            metrics = '/'.join(str(batting['stats'][key]) for key in ('ab', 'h', 'hr')) if batting else ', '.join(record['scope'] for record in group)
            review.append(f"| {', '.join(sorted({r['name'] for r in group}))} | {club} / {phase} | {metrics} | Pendiente |")
    review += ['', 'Origen: 10 XLSX (6 regulares, 4 semifinales); 14 nombres normalizados multiclub. Las fases pertenecen a reportes separados. No deducir que un cambio de club entre fases implica homonimia ni identidad confirmada.', '', 'Confirmar cada grupo con evidencia de roster/ID anterior; no solicitar fechas de nacimiento por canales abiertos.']
    Path('REVISION_IDENTIDADES_2019.md').write_text('\n'.join(review)+'\n', encoding='utf-8')
    results = []
    totals = defaultdict(lambda: {'runs':0,'hits':0,'games':0})
    def decode(text):
        # iScore PDF draws the same label twice; require exact repeated halves.
        if len(text)%2 or text[:len(text)//2] != text[len(text)//2:]:
            raise ValueError(f'Uncertain duplicated number {text}')
        return int(text[:len(text)//2])
    def club_name(text):
        normalized = XLSX.normalize(text)
        return next((slug for name,slug in XLSX.PREVIEW.TEAM_SLUGS.items() if normalized.startswith(name)), None)
    for file in files:
        reader = PdfReader(file)
        pages = [(page.extract_text(extraction_mode='layout') or '').replace('\x00','') for page in reader.pages[:2]]
        header = re.search(r'(\d{1,2}/\d{1,2}/\d{2,4})\s+(.+?)\s+at\s+([^\n]+)', pages[0])
        teams = []
        for index,page in enumerate(pages):
            after = page.split('Team:',1)[1] if 'Team:' in page else ''
            row = re.search(r'^\s*(.*?)\s{2,}(\d+)\s+(\d+)\s{2,}', after, re.M)
            if row:
                try:
                    teams.append({'page':index+1,'name':row[1].strip(),'club':club_name(row[1]),'runs':decode(row[2]),'hits':decode(row[3])})
                except ValueError:
                    pass
        date = datetime.strptime(header[1], '%m/%d/%y').date().isoformat() if header else None
        folder_date = re.search(r'(\d{1,2})-(\d{1,2})-(\d{4})',file.parent.name)
        expected_date = f'{folder_date[3]}-{int(folder_date[2]):02}-{int(folder_date[1]):02}' if folder_date else None
        folder_match = re.search(r'Juego\s+(\d+)\s+(.+?)\s+vs\.?\s+(.+?)\s+\d{1,2}-',file.parent.name,re.I)
        flags=[]
        if date != expected_date: flags.append('Fecha PDF distinta de carpeta')
        if len(teams)!=2 or not header: flags.append('Extraccion ambigua; revision visual pendiente')
        if folder_match and header and club_name(folder_match[2]) != club_name(header[2]): flags.append('Orden carpeta distinto de visitante/local PDF')
        for team in teams:
            if team['club']:
                totals[team['club']]['runs'] += team['runs']; totals[team['club']]['hits'] += team['hits']; totals[team['club']]['games'] += 1
        results.append({'game':int(folder_match[1]) if folder_match else None,'folder':file.parent.name,'file':str(file.relative_to(root)), 'date':date,'visitor':header[2].strip() if header else None,'home':header[3].strip() if header else None,'teams':teams,'flags':flags})
    results.sort(key=lambda item:item['game'] or 0)
    lines=['# Cotejo de scorecards PDF 2019','','Fecha: 2026-10-01. Lectura de los 27 PDF originales; no se crearon partidos en la base. Los resultados extraidos corresponden a evidencia documental, no a confirmacion de legalidad oficial de cada juego.','','El PDF superpone dos copias del texto numerico. El parser acepta solo mitades identicas (1010 → 10, 00 → 0); las filas no reconocidas quedan pendientes. Visitante/local se obtiene de la cabecera `at`, no del orden de la carpeta.','','| Juego | Fecha PDF | Visitante | Local | Carreras por equipo (paginas 1/2) | Observaciones |','|---|---|---|---|---|---|']
    for item in results:
        scores='; '.join(f"{t['name']}: {t['runs']} R / {t['hits']} H (p.{t['page']})" for t in item['teams'])
        lines.append(f"| {item['game']} | {item['date']} | {item['visitor']} | {item['home']} | {scores} | {'; '.join(item['flags']) or 'Sin diferencia de fecha; extraccion reconocida'} |")
    lines += ['', '## Totales de archivos recibidos versus XLSX regular', '', 'Los PDF recibidos no demuestran cobertura completa de la temporada. Una diferencia con XLSX no justifica corregir ni descartar el acumulado: puede reflejar juegos faltantes o alcance distinto.', '', '| Club | PDF participaciones | PDF R | XLSX R | PDF H | XLSX H |','|---|---:|---:|---:|---:|---:|']
    for club,total in sorted(totals.items()):
        batting=[r for r in plan['records'] if r['clubSlug']==club and r['phase']=='regular' and r['scope']=='batting']
        lines.append(f"| {club} | {total['games']} | {total['runs']} | {sum(r['stats']['r'] or 0 for r in batting)} | {total['hits']} | {sum(r['stats']['h'] or 0 for r in batting)} |")
    lines += ['', '## Evidencia y limites', '', '- Juego 21: conservar fecha documentada y discrepancia de carpeta para confirmacion de Wilmer.', '- No se compararon con filas de partidos 2019 en LAB: no existen por decision de importar solo agregados.', '- Para validacion visual humana final revisar las paginas 1/2 y asegurar juego finalizado/legal; el cotejo automatico no decide eso.', '- Reproducir: `python -B scripts/audit-iscore-2019.py <carpeta-2019>`. El JSON incluye rutas relativas, paginas de evidencia y observaciones.']
    Path('COTEJO_PDF_2019.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
    Path('COTEJO_PDF_2019.json').write_text(json.dumps(results, ensure_ascii=True, indent=2), encoding='utf-8')
    print(json.dumps({'pdfs':len(files), 'recognizedResults':sum(len(r['teams'])==2 for r in results),'dateDiscrepancies':sum(any('Fecha' in flag for flag in r['flags']) for r in results),'multiclubNames':sum(len({r['clubSlug'] for r in group})>1 for group in names.values())}))


if __name__ == '__main__':
    main()
