import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { readSheet, SHEET_HEADERS, type SheetName } from '@/lib/google-sheets'
import { classifySheetRows, parseSheetRows } from '@/lib/sheets-sync'
import type { SyncRegistro } from '@/lib/database.types'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase.from('perfiles').select('rol').eq('id', user.id).single()
  if (profile?.rol !== 'admin_liga') {
    return NextResponse.json({ error: 'Se requiere rol de administrador' }, { status: 403 })
  }

  try {
    const sheets = Object.keys(SHEET_HEADERS) as SheetName[]
    const [{ data: previous, error: previousError }, ...values] = await Promise.all([
      supabase.from('sync_registros').select('*'),
      ...sheets.map((sheet) => readSheet(sheet)),
    ])
    if (previousError) throw previousError

    const previousByKey = new Map(
      ((previous ?? []) as Pick<SyncRegistro, 'pestaña' | 'clave_externa' | 'sheet_hash'>[])
        .map((row) => [`${row.pestaña}:${row.clave_externa}`, { sheet_hash: row.sheet_hash }])
    )
    const details: Record<string, { rows: number; nuevos: number; cambios: number; sinCambios: number; errores: string[] }> = {}
    const conflicts: { fuente: 'google_sheets'; tipo: string; entidad: string; clave_externa: string; external_payload: Record<string, string> }[] = []

    sheets.forEach((sheet, index) => {
      const parsed = parseSheetRows(sheet, values[index])
      const classified = classifySheetRows(parsed.rows, previousByKey)
      details[sheet] = {
        rows: parsed.rows.length,
        nuevos: classified.new.length,
        cambios: classified.changed_external.length,
        sinCambios: classified.unchanged.length,
        errores: parsed.errors,
      }
      classified.changed_external.forEach((row) => {
        conflicts.push({
          fuente: 'google_sheets',
          tipo: 'cambio_externo_pendiente',
          entidad: sheet,
          clave_externa: row.key,
          external_payload: row.payload,
        })
      })
    })

    const hasErrors = Object.values(details).some((detail) => detail.errores.length > 0)
    const { data: lote, error: loteError } = await supabase
      .from('import_lotes')
      .insert({
        fuente: 'google_sheets',
        estado: hasErrors ? 'bloqueado' : 'preview',
        resumen: { sheets: details, conflicts: conflicts.length },
        conflictos: conflicts,
      })
      .select('id, estado, created_at')
      .single()
    if (loteError) throw loteError

    if (conflicts.length > 0) {
      const { error: conflictsError } = await supabase.from('sync_conflictos').insert(
        conflicts.map((conflict) => ({ ...conflict, lote_id: lote.id, lab_payload: null }))
      )
      if (conflictsError) throw conflictsError
    }

    return NextResponse.json({ lote, sheets: details, applied: false })
  } catch (error) {
    console.error('[sheets/preview]', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'No se pudo analizar Google Sheets',
    }, { status: 500 })
  }
}
