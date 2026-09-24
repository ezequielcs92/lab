import { createHash } from 'node:crypto'

export interface BallclubzBattingLine {
  sourceKey: string
  name: string
  position: string | null
  ab: number
  r: number
  h: number
  rbi: number
  doble: number
  triple: number
  hr: number
  bb: number
  sb: number
  cs: number
  hbp: number
  sh: number
  sf: number
  so: number
  ibb: number
  kl: number
  gdp: number
  po: number
  a: number
  e: number
}

export interface BallclubzPitchingLine {
  sourceKey: string
  name: string
  ip: number
  h: number
  r: number
  er: number
  bb: number
  so: number
  wp: number
  hbp: number
  bk: number
  ibb: number
  sh: number
  sf: number
  doble: number
  triple: number
  hr: number
  ab: number
  bf: number
  fo: number
  go: number
  np: number
  w: boolean
  l: boolean
  sv: boolean
}

export interface BallclubzTeam {
  sourceKey: string
  name: string
  score: number
  hits: number
  errors: number
  innings: Array<number | null>
  batting: BallclubzBattingLine[]
  pitching: BallclubzPitchingLine[]
}

export interface BallclubzGame {
  externalKey: string
  sourceUrl: string | null
  tournamentId: string | null
  boxscoreId: string | null
  competition: string
  date: string
  startTime: string | null
  durationMinutes: number | null
  venue: string
  gameNumber: number | null
  visitor: BallclubzTeam
  home: BallclubzTeam
  warnings: string[]
}

const MONTHS: Record<string, string> = {
  Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
  Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
}
const POSITIONS = new Set(['p', 'c', '1b', '2b', '3b', 'ss', 'lf', 'cf', 'rf', 'of', 'dh', 'ph', 'pr'])
const BATTING_FIELDS = ['ab', 'r', 'h', 'rbi', 'doble', 'triple', 'hr', 'bb', 'sb', 'cs', 'hbp', 'sh', 'sf', 'so', 'ibb', 'kl', 'gdp', 'po', 'a', 'e'] as const
const PITCHING_FIELDS = ['ip', 'h', 'r', 'er', 'bb', 'so', 'wp', 'hbp', 'bk', 'ibb', 'sh', 'sf', 'doble', 'triple', 'hr', 'ab', 'bf', 'fo', 'go', 'np'] as const

export function normalizeBallclubzText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .toLowerCase()
}

function decodeHtml(value: string): string {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
}

function extractPre(html: string): string {
  const match = html.match(/<pre\b[^>]*>([\s\S]*?)<\/pre>/i)
  if (!match) throw new Error('El archivo no contiene un bloque <pre> de box score')
  return decodeHtml(match[1]).replace(/\r/g, '')
}

function sourceUrl(html: string): string | null {
  const match = html.match(/https?:\/\/[^\s)]+(?:&amp;|&)[^\s)]*/i) ?? html.match(/https?:\/\/[^\s)]+/i)
  return match ? decodeHtml(match[0]) : null
}

function sourceIdentity(html: string) {
  const value = sourceUrl(html)
  if (!value) return { sourceUrl: null, tournamentId: null, boxscoreId: null }
  try {
    const parsed = new URL(value)
    return {
      sourceUrl: value,
      tournamentId: parsed.searchParams.get('t'),
      boxscoreId: parsed.searchParams.get('boxscore'),
    }
  } catch {
    return { sourceUrl: value, tournamentId: null, boxscoreId: null }
  }
}

function parseDate(value: string): string {
  const match = value.match(/^([A-Z][a-z]{2})\s+(\d{1,2}),\s+(\d{4})$/)
  if (!match || !MONTHS[match[1]]) throw new Error(`Fecha BallClubz inválida: ${value}`)
  return `${match[3]}-${MONTHS[match[1]]}-${match[2].padStart(2, '0')}`
}

function numbersFromRight(line: string, count: number): { descriptor: string; values: string[] } | null {
  const tokens = line.trim().split(/\s+/)
  if (tokens.length <= count) return null
  const values = tokens.slice(-count)
  if (values.some((value) => !/^-?\d+(?:\.\d+)?$/.test(value))) return null
  return { descriptor: tokens.slice(0, -count).join(' '), values }
}

function sourcePlayerKey(teamKey: string, name: string): string {
  return `${teamKey}:${normalizeBallclubzText(name)}`
}

function isPositionToken(value: string): boolean {
  const positions = value.toLowerCase().split('/').filter(Boolean)
  return positions.length > 0 && positions.every((position) => POSITIONS.has(position))
}

function parseBattingLine(line: string, teamKey: string): BallclubzBattingLine | null {
  if (/^\s*Totals\b/i.test(line)) return null
  const split = numbersFromRight(line, BATTING_FIELDS.length)
  if (!split) return null
  const descriptor = split.descriptor.split(/\s+/)
  const maybePosition = descriptor.at(-1)?.toLowerCase() ?? ''
  const position = isPositionToken(maybePosition) ? maybePosition : null
  const name = (position ? descriptor.slice(0, -1) : descriptor).join(' ').trim()
  if (!name) return null
  const numeric = Object.fromEntries(BATTING_FIELDS.map((field, index) => [field, Number(split.values[index])])) as Record<typeof BATTING_FIELDS[number], number>
  return { sourceKey: sourcePlayerKey(teamKey, name), name, position, ...numeric }
}

function parsePitchingLine(line: string, teamKey: string): BallclubzPitchingLine | null {
  if (/^\s*Totals\b/i.test(line)) return null
  const split = numbersFromRight(line, PITCHING_FIELDS.length)
  if (!split) return null
  const decisions = [...split.descriptor.matchAll(/(?:^|\s)(W|L|S),\s*\d+-\d+/gi)].map((match) => match[1].toUpperCase())
  const name = split.descriptor.replace(/(?:^|\s)(?:W|L|S),\s*\d+-\d+/gi, ' ').replace(/\s+/g, ' ').trim()
  if (!name) return null
  const numeric = Object.fromEntries(PITCHING_FIELDS.map((field, index) => [field, Number(split.values[index])])) as Record<typeof PITCHING_FIELDS[number], number>
  return {
    sourceKey: sourcePlayerKey(teamKey, name),
    name,
    ...numeric,
    w: decisions.includes('W'),
    l: decisions.includes('L'),
    sv: decisions.includes('S'),
  }
}

function findSectionRows(lines: string[], headerIndex: number): string[] {
  let index = headerIndex + 1
  while (index < lines.length && /^\s*-{5,}\s*$/.test(lines[index])) index += 1
  const rows: string[] = []
  for (; index < lines.length; index += 1) {
    const line = lines[index]
    if (!line.trim()) {
      if (rows.length > 0) break
      continue
    }
    if (/^\s*Totals\b/i.test(line)) break
    rows.push(line)
  }
  return rows
}

function matchingTeam(name: string, teams: BallclubzTeam[]): BallclubzTeam | null {
  const normalized = normalizeBallclubzText(name.replace(/\s+\d+\s*$/, ''))
  return teams.find((team) => normalizeBallclubzText(team.name) === normalized) ?? null
}

function parseInnings(value: string): Array<number | null> {
  const compact = value.replace(/\s+/g, '')
  if (!/^[0-9xX]+$/.test(compact)) throw new Error(`Marcador por innings inválido: ${value.trim()}`)
  return [...compact].map((inning) => inning.toLowerCase() === 'x' ? null : Number(inning))
}

export function parseBallclubzBoxScore(html: string): BallclubzGame {
  if (Buffer.byteLength(html, 'utf8') > 2_000_000) throw new Error('El archivo supera el máximo permitido de 2 MB')
  const pre = extractPre(html)
  const lines = pre.split('\n')
  const nonEmpty = lines.map((line) => line.trim()).filter(Boolean)
  const identity = sourceIdentity(html)
  const titleIndex = lines.findIndex((line) => /\s+- Composite Box Score\s*$/.test(line))
  if (titleIndex < 0) throw new Error('No se encontró el encabezado Composite Box Score')
  const titleMatch = lines[titleIndex].trim().match(/^(.+?)\s+(\d+),\s+(.+?)\s+(\d+)\s+- Composite Box Score$/)
  if (!titleMatch) throw new Error('No se pudieron identificar los equipos y el resultado')
  const competition = nonEmpty[0]
  const dateLine = lines.slice(titleIndex + 1).find((line) => /^\s*[A-Z][a-z]{2}\s+\d{1,2},\s+\d{4}\s+at\s+/.test(line))
  if (!dateLine) throw new Error('No se encontró la fecha y sede del partido')
  const dateMatch = dateLine.trim().match(/^(.+?\d{4})\s+at\s+(.+)$/)
  if (!dateMatch) throw new Error('No se pudo interpretar la fecha y sede')

  const visitorName = titleMatch[1].trim()
  const homeName = titleMatch[3].trim()
  const scoreRows = lines.flatMap((line) => {
    const match = line.match(/^\s*(.+?)\.{3,}([0-9Xx ]+)\s+-\s+(\d+)\s+(\d+)\s+(\d+)\s*$/)
    return match ? [{ name: match[1].trim(), innings: parseInnings(match[2]), score: Number(match[3]), hits: Number(match[4]), errors: Number(match[5]) }] : []
  })
  const scoreFor = (name: string, fallback: number) => scoreRows.find((row) => normalizeBallclubzText(row.name) === normalizeBallclubzText(name)) ?? { innings: [], score: fallback, hits: 0, errors: 0 }
  const visitorScore = scoreFor(visitorName, Number(titleMatch[2]))
  const homeScore = scoreFor(homeName, Number(titleMatch[4]))
  const visitorKey = normalizeBallclubzText(visitorName)
  const homeKey = normalizeBallclubzText(homeName)
  const teams: BallclubzTeam[] = [
    { sourceKey: visitorKey, name: visitorName, ...visitorScore, batting: [], pitching: [] },
    { sourceKey: homeKey, name: homeName, ...homeScore, batting: [], pitching: [] },
  ]

  lines.forEach((line, index) => {
    if (/^\s*PLAYER\s+AB\s+R\s+H\s+BI\s+2B\s+3B\s+HR\s+BB/.test(line)) {
      const teamHeading = [...lines.slice(0, index)].reverse().find((candidate) => candidate.trim() && !/^-+$/.test(candidate.trim())) ?? ''
      const team = matchingTeam(teamHeading.trim(), teams)
      if (team) team.batting = findSectionRows(lines, index).flatMap((row) => parseBattingLine(row, team.sourceKey) ?? [])
    }
    const pitchingHeader = line.match(/^\s*(.+?)\s+IP\s+H\s+R\s+ER\s+BB\s+SO\s+WP\s+HP\s+BK/)
    if (pitchingHeader) {
      const team = matchingTeam(pitchingHeader[1].trim(), teams)
      if (team) team.pitching = findSectionRows(lines, index).flatMap((row) => parsePitchingLine(row, team.sourceKey) ?? [])
    }
  })

  const startMatch = pre.match(/\bStart:\s*(\d{1,2}:\d{2})\b/)
  const durationMatch = pre.match(/\bTime:\s*(\d+):(\d{2})\b/)
  const gameMatch = pre.match(/\bGame:\s*(\d+)\b/)
  const warnings: string[] = []
  for (const team of teams) {
    if (team.batting.length === 0) warnings.push(`No se encontraron líneas de bateo para ${team.name}`)
    if (team.pitching.length === 0) warnings.push(`No se encontraron líneas de pitcheo para ${team.name}`)
    const battingRuns = team.batting.reduce((sum, row) => sum + row.r, 0)
    if (battingRuns !== team.score) warnings.push(`Las carreras individuales de ${team.name} (${battingRuns}) no coinciden con el resultado (${team.score})`)
  }
  const date = parseDate(dateMatch[1])
  const fallbackIdentity = createHash('sha256')
    .update([competition, date, visitorKey, homeKey, gameMatch?.[1] ?? ''].join('|'))
    .digest('hex').slice(0, 24)
  const externalKey = identity.boxscoreId
    ? `ballclubz:${identity.tournamentId ?? 'unknown'}:boxscore:${identity.boxscoreId}`
    : `ballclubz:hash:${fallbackIdentity}`

  return {
    externalKey,
    ...identity,
    competition,
    date,
    startTime: startMatch?.[1] ?? null,
    durationMinutes: durationMatch ? Number(durationMatch[1]) * 60 + Number(durationMatch[2]) : null,
    venue: dateMatch[2].trim(),
    gameNumber: gameMatch ? Number(gameMatch[1]) : null,
    visitor: teams[0],
    home: teams[1],
    warnings,
  }
}
