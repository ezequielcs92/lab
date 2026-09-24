import 'server-only'
import { createSign } from 'node:crypto'

const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets'

export const SHEET_HEADERS = {
  Partidos: [
    'external_key', 'fecha_numero', 'fecha_hora', 'fase', 'local_slug', 'visitante_slug',
    'estadio', 'estado', 'marcador_local', 'marcador_visitante', 'marcador_innings_json', 'streaming_url', 'updated_at',
  ],
  Bateo: [
    'partido_external_key', 'jugador_stable_id', 'jugador_nombre', 'club_slug', 'orden_bateo',
    'ab', 'r', 'h', 'doble', 'triple', 'hr', 'rbi', 'bb', 'so', 'sb', 'cs', 'sf', 'hbp',
    'extras_json', 'updated_at',
  ],
  Pitcheo: [
    'partido_external_key', 'jugador_stable_id', 'jugador_nombre', 'club_slug', 'ip', 'h', 'r',
    'er', 'bb', 'so', 'hr', 'w', 'l', 'sv', 'hld', 'wp', 'bk', 'bf', 'extras_json', 'updated_at',
  ],
  Fildeo: [
    'partido_external_key', 'jugador_stable_id', 'jugador_nombre', 'club_slug', 'po', 'a', 'e',
    'dp', 'extras_json', 'updated_at',
  ],
} as const

export type SheetName = keyof typeof SHEET_HEADERS

let tokenCache: { value: string; expiresAt: number } | null = null

function base64Url(value: string): string {
  return Buffer.from(value).toString('base64url')
}

function getConfig() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n')
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID
  if (!email || !privateKey || !spreadsheetId) {
    throw new Error('Faltan GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY o GOOGLE_SHEETS_ID')
  }
  return { email, privateKey, spreadsheetId }
}

async function getAccessToken(): Promise<string> {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) return tokenCache.value

  const { email, privateKey } = getConfig()
  const now = Math.floor(Date.now() / 1000)
  const encodedHeader = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const encodedPayload = base64Url(JSON.stringify({
    iss: email,
    scope: SHEETS_SCOPE,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
  }))
  const unsignedToken = `${encodedHeader}.${encodedPayload}`
  const signature = createSign('RSA-SHA256').update(unsignedToken).sign(privateKey, 'base64url')

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${unsignedToken}.${signature}`,
    }),
    cache: 'no-store',
  })
  if (!response.ok) throw new Error(`Google OAuth respondió ${response.status}`)

  const data = await response.json() as { access_token?: string; expires_in?: number }
  if (!data.access_token) throw new Error('Google OAuth no devolvió un access token')
  tokenCache = {
    value: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  }
  return tokenCache.value
}

function rangeFor(sheet: SheetName, range: string): string {
  return encodeURIComponent(`'${sheet}'!${range}`)
}

export async function readSheet(sheet: SheetName, range = 'A:ZZ'): Promise<string[][]> {
  const { spreadsheetId } = getConfig()
  const token = await getAccessToken()
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${rangeFor(sheet, range)}`,
    { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }
  )
  if (!response.ok) throw new Error(`Google Sheets respondió ${response.status} al leer ${sheet}`)
  const data = await response.json() as { values?: unknown[][] }
  return (data.values ?? []).map((row) => row.map((value) => String(value ?? '')))
}

export async function writeSheet(sheet: SheetName, values: (string | number | boolean | null)[][]): Promise<void> {
  const { spreadsheetId } = getConfig()
  const token = await getAccessToken()
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${rangeFor(sheet, 'A1')}?valueInputOption=RAW`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ range: `'${sheet}'!A1`, majorDimension: 'ROWS', values }),
      cache: 'no-store',
    }
  )
  if (!response.ok) throw new Error(`Google Sheets respondió ${response.status} al escribir ${sheet}`)
}
