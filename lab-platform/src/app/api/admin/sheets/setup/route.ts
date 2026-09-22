import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { readSheet, SHEET_HEADERS, writeSheet, type SheetName } from '@/lib/google-sheets'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase.from('perfiles').select('rol').eq('id', user.id).single()
  if (profile?.rol !== 'admin_liga') {
    return NextResponse.json({ error: 'Se requiere rol de administrador' }, { status: 403 })
  }

  try {
    const result: Record<string, { rows: number; status: string }> = {}
    for (const sheet of Object.keys(SHEET_HEADERS) as SheetName[]) {
      const values = await readSheet(sheet)
      const expected = [...SHEET_HEADERS[sheet]]
      if (values.length === 0) {
        await writeSheet(sheet, [expected])
        result[sheet] = { rows: 0, status: 'created' }
        continue
      }
      const actual = values[0] ?? []
      if (actual.length !== expected.length || expected.some((header, index) => actual[index] !== header)) {
        return NextResponse.json({ error: `La cabecera de ${sheet} no coincide con la plantilla LAB`, sheet, expected, actual }, { status: 409 })
      }
      result[sheet] = { rows: Math.max(0, values.length - 1), status: 'ready' }
    }
    return NextResponse.json({ sheets: result })
  } catch (error) {
    console.error('[sheets/setup]', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo verificar Google Sheets' }, { status: 500 })
  }
}
