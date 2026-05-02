/**
 * Sube los logos de los clubes a Cloudflare R2
 * Uso: node scripts/upload-logos.mjs
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const R2_ACCOUNT_ID = 'cb4c43d5dffeca6bf82b94d4297caff6'
const R2_ACCESS_KEY_ID = '312fed7c67d4bc19177f0674c043414d'
const R2_SECRET_ACCESS_KEY = 'bc6ac143634da1741dd916d69cd1f5c363ed66cc8d03010d267d56b4bf1e8c13'
const R2_BUCKET_NAME = 'lab-media'
const R2_ENDPOINT = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
const R2_PUBLIC_URL = 'https://pub-5b07d2936dcb48edb78f689a4c9ac3b9.r2.dev'

const s3 = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
})

const INFO_BASE = 'F:\\Desarrollos\\LAB\\INFO CLUBES Y LAB'

const logos = [
  { slug: 'arias',      file: `${INFO_BASE}\\Info y fotos Arias\\Logo Arias.png` },
  { slug: 'cachorros',  file: `${INFO_BASE}\\Info y fotos Cachorros\\Logo Cachorros.png` },
  { slug: 'infernales', file: `${INFO_BASE}\\Info y fotos Club Popeye\\Logo Popeye.png` },
  { slug: 'daom',       file: `${INFO_BASE}\\Info y fotos DAOM\\Daom logo.png` },
  { slug: 'falcons',    file: `${INFO_BASE}\\Info y fotos Falcons\\falcons logo.png` },
  { slug: 'patriots',   file: `${INFO_BASE}\\Info y fotos Patriots\\Logo Patriots.png` },
]

async function uploadLogo(slug, filePath) {
  const key = `clubes/logos/${slug}.png`
  let buffer
  try {
    buffer = readFileSync(resolve(filePath))
  } catch {
    console.warn(`⚠️  No se encontró el archivo para ${slug}: ${filePath}`)
    return null
  }

  await s3.send(new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: 'image/png',
  }))

  const url = `${R2_PUBLIC_URL}/${key}`
  console.log(`✅ ${slug}: ${url}`)
  return { slug, url, key }
}

async function main() {
  console.log('Subiendo logos a Cloudflare R2...\n')
  const results = []

  for (const { slug, file } of logos) {
    const result = await uploadLogo(slug, file)
    if (result) results.push(result)
  }

  console.log('\n--- SQL para actualizar logo_url en Supabase ---\n')
  for (const { slug, url } of results) {
    console.log(`UPDATE clubes SET logo_url = '${url}', updated_at = NOW() WHERE slug = '${slug}';`)
  }
  console.log('\n---')
}

main().catch(console.error)
