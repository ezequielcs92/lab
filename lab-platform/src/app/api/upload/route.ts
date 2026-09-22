import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { uploadToR2, generateR2Key } from '@/lib/r2/client'

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB
const FOLDER_PATTERN = /^(clubes\/(logos|galeria\/[a-z0-9-]+)|jugadores\/fotos|staff\/fotos|noticias\/(contenido|portadas)|sponsors)$/

function canUploadToFolder(role: string | undefined, folder: string): boolean {
  if (!role || !FOLDER_PATTERN.test(folder)) return false
  if (role === 'admin_liga') return true
  if (role === 'editor_club') {
    return folder === 'jugadores/fotos' || folder === 'staff/fotos' || folder.startsWith('clubes/galeria/')
  }
  if (['editor_blog', 'autor', 'periodista', 'colaborador', 'fotografo'].includes(role)) {
    return folder.startsWith('noticias/')
  }
  return false
}

// Magic bytes for supported image formats
const MAGIC_BYTES: Record<string, number[][]> = {
  'image/jpeg': [[0xFF, 0xD8, 0xFF]],
  'image/png':  [[0x89, 0x50, 0x4E, 0x47]],
  'image/webp': [[0x52, 0x49, 0x46, 0x46]], // RIFF....WEBP
  'image/gif':  [[0x47, 0x49, 0x46, 0x38]],
}

function detectMime(buffer: Uint8Array): string | null {
  for (const [mime, signatures] of Object.entries(MAGIC_BYTES)) {
    for (const sig of signatures) {
      if (!sig.every((byte, i) => buffer[i] === byte)) continue

      // WEBP also needs the WEBP marker at bytes 8-11.
      if (mime === 'image/webp') {
        const hasWebpMarker =
          buffer[8] === 0x57 && // W
          buffer[9] === 0x45 && // E
          buffer[10] === 0x42 && // B
          buffer[11] === 0x50 // P

        if (!hasWebpMarker) continue
      }

      return mime
    }
  }
  return null
}

export async function POST(request: NextRequest) {
  // Auth check — only logged-in users can upload
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('perfiles')
    .select('rol, club_id')
    .eq('id', user.id)
    .single()

  try {
    const formData = await request.formData()
    const file = formData.get('file')
    const folder = (formData.get('folder') as string) || 'general'

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }
    if (!canUploadToFolder(profile?.rol, folder)) {
      return NextResponse.json({ error: 'No tenés permisos para subir archivos en esa ubicación' }, { status: 403 })
    }

    let uploadFolder = folder
    if (profile?.rol === 'editor_club') {
      if (!profile.club_id) {
        return NextResponse.json({ error: 'El perfil no tiene un club asignado' }, { status: 403 })
      }
      if (folder.startsWith('clubes/galeria/')) {
        const slug = folder.slice('clubes/galeria/'.length)
        const { data: club } = await supabase.from('clubes').select('id').eq('slug', slug).single()
        if (club?.id !== profile.club_id) {
          return NextResponse.json({ error: 'No tenés permisos para subir archivos para ese club' }, { status: 403 })
        }
      } else {
        uploadFolder = `clubes/${profile.club_id}/${folder === 'jugadores/fotos' ? 'jugadores' : 'staff'}`
      }
    }

    // Validate size first (before reading full buffer)
    if (file.size === 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'Archivo demasiado grande. Máximo 20MB.' }, { status: 400 })
    }

    // Read buffer and validate via magic bytes (not client-controlled file.type)
    const buffer = await file.arrayBuffer()
    const uint8Array = new Uint8Array(buffer)
    const detectedMime = detectMime(uint8Array)

    if (!detectedMime || !ALLOWED_MIME_TYPES.includes(detectedMime)) {
      return NextResponse.json({ error: 'Tipo de archivo no permitido. Solo imágenes JPG, PNG, WebP o GIF.' }, { status: 400 })
    }

    // Generate key and upload
    const key = generateR2Key(uploadFolder, detectedMime)
    const publicUrl = await uploadToR2(uint8Array, key, detectedMime)

    return NextResponse.json({ url: publicUrl, key })
  } catch (error) {
    // Log server-side only, never expose internal errors to client
    console.error('[upload] Error:', error)
    return NextResponse.json({ error: 'Error al subir el archivo' }, { status: 500 })
  }
}
