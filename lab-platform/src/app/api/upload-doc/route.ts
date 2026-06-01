import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { uploadToR2, generateR2Key } from '@/lib/r2/client'

const ALLOWED_MIME = 'application/pdf'
const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB

// PDF magic bytes: %PDF → 0x25 0x50 0x44 0x46
function isPdf(buffer: Uint8Array): boolean {
  return buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  // Only admins can upload documents
  const { data: perfil } = await supabase
    .from('perfiles')
    .select('rol')
    .eq('id', user.id)
    .single()

  if (perfil?.rol !== 'admin_liga') {
    return NextResponse.json({ error: 'Sin permisos suficientes' }, { status: 403 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const folder = (formData.get('folder') as string) || 'documentos'

    if (!file) {
      return NextResponse.json({ error: 'No se recibió ningún archivo' }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'Archivo demasiado grande. Máximo 20MB.' }, { status: 400 })
    }

    const buffer = await file.arrayBuffer()
    const uint8Array = new Uint8Array(buffer)

    if (!isPdf(uint8Array)) {
      return NextResponse.json({ error: 'Solo se permiten archivos PDF.' }, { status: 400 })
    }

    const key = generateR2Key(folder, file.name)
    const publicUrl = await uploadToR2(uint8Array, key, ALLOWED_MIME)

    return NextResponse.json({ url: publicUrl, key })
  } catch (error) {
    console.error('[upload-doc] Error:', error)
    return NextResponse.json({ error: 'Error al subir el archivo' }, { status: 500 })
  }
}
