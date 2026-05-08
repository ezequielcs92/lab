import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { localGalleryManifest } from '@/lib/local-gallery-manifest'

function toPublicUrl(slug: string, fileName: string) {
  const encoded = fileName
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/')
  return `/clubes/galeria/${encodeURIComponent(slug)}/${encoded}`
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { clubId, slug, replace } = (await request.json()) as {
      clubId?: string
      slug?: string
      replace?: boolean
    }

    if (!clubId || !slug) {
      return NextResponse.json({ error: 'clubId y slug son requeridos' }, { status: 400 })
    }

    const fileNames = localGalleryManifest[slug as keyof typeof localGalleryManifest]

    if (!fileNames) {
      return NextResponse.json({ error: `No existe galería local registrada para ${slug}` }, { status: 404 })
    }

    if (fileNames.length === 0) {
      return NextResponse.json({ inserted: [], message: 'No hay imágenes compatibles para importar.' })
    }

    const { data: existingRows, error: existingErr } = await supabase
      .from('galeria_clubes')
      .select('*')
      .eq('club_id', clubId)
      .order('orden')

    if (existingErr) {
      return NextResponse.json({ error: existingErr.message }, { status: 400 })
    }

    const existing = existingRows ?? []

    if (replace && existing.length > 0) {
      const { error: deleteErr } = await supabase
        .from('galeria_clubes')
        .delete()
        .eq('club_id', clubId)

      if (deleteErr) {
        return NextResponse.json({ error: deleteErr.message }, { status: 400 })
      }
    }

    const existingUrls = new Set((replace ? [] : existing).map((row) => row.imagen_url))
    const baseOrder = replace
      ? 1
      : existing.reduce((max, row) => Math.max(max, row.orden), 0) + 1

    const rowsToInsert = fileNames
      .map((name, index) => ({
        club_id: clubId,
        imagen_url: toPublicUrl(slug, name),
        titulo: null as string | null,
        descripcion: null as string | null,
        orden: baseOrder + index,
      }))
      .filter((row) => !existingUrls.has(row.imagen_url))

    if (rowsToInsert.length === 0) {
      return NextResponse.json({ inserted: [], message: 'Las fotos locales ya estaban cargadas en la galería.' })
    }

    const { data: inserted, error: insertErr } = await supabase
      .from('galeria_clubes')
      .insert(rowsToInsert)
      .select('*')

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 400 })
    }

    return NextResponse.json({
      inserted: inserted ?? [],
      message: `Importadas ${inserted?.length ?? 0} fotos locales para ${slug}`,
    })
  } catch (error) {
    console.error('[import-local-gallery] Error:', error)
    return NextResponse.json({ error: 'Error importando galería local' }, { status: 500 })
  }
}
