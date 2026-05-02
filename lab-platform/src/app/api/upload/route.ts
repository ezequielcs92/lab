import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { uploadToR2, generateR2Key } from '@/lib/r2/client'

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

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
      if (sig.every((byte, i) => buffer[i] === byte)) return mime
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

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const folder = (formData.get('folder') as string) || 'general'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate size first (before reading full buffer)
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'Archivo demasiado grande. Máximo 5MB.' }, { status: 400 })
    }

    // Read buffer and validate via magic bytes (not client-controlled file.type)
    const buffer = await file.arrayBuffer()
    const uint8Array = new Uint8Array(buffer)
    const detectedMime = detectMime(uint8Array)

    if (!detectedMime || !ALLOWED_MIME_TYPES.includes(detectedMime)) {
      return NextResponse.json({ error: 'Tipo de archivo no permitido. Solo imágenes JPG, PNG, WebP o GIF.' }, { status: 400 })
    }

    // Generate key and upload
    const key = generateR2Key(folder, file.name)
    const publicUrl = await uploadToR2(uint8Array, key, detectedMime)

    return NextResponse.json({ url: publicUrl, key })
  } catch (error) {
    // Log server-side only, never expose internal errors to client
    console.error('[upload] Error:', error)
    return NextResponse.json({ error: 'Error al subir el archivo' }, { status: 500 })
  }
}
