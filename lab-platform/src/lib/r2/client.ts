import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'

const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

export async function uploadToR2(
  file: Buffer | Uint8Array,
  key: string,
  contentType: string
): Promise<string> {
  try {
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
      Body: file,
      ContentType: contentType,
    })

    await s3Client.send(command)

    // Retornar URL pública de la imagen
    const publicUrl = `${process.env.R2_PUBLIC_URL}/${key}`
    return publicUrl
  } catch (error) {
    console.error('Error uploading to R2:', error)
    throw new Error(`Error subiendo imagen a R2: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export async function deleteFromR2(key: string): Promise<void> {
  try {
    const command = new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
    })

    await s3Client.send(command)
  } catch (error) {
    console.error('Error deleting from R2:', error)
    throw new Error(`Error eliminando imagen de R2: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

const EXTENSION_BY_MIME: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/gif': 'gif',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

export function generateR2Key(folder: string, contentType: string): string {
  const ext = EXTENSION_BY_MIME[contentType]
  if (!ext) throw new Error('Tipo de archivo no soportado')
  const timestamp = Date.now()
  const random = Math.random().toString(36).slice(2)
  return `${folder}/${timestamp}-${random}.${ext}`
}
