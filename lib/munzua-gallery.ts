import 'server-only'

import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { id } from '@instantdb/admin'
import { s3, BUCKET_NAME, PUBLIC_URL } from '@/lib/s3'

export const MUNZUA_GALLERY_PREFIX = 'munzua/gallery/'

export function getMunzuaBucketName() {
  return BUCKET_NAME
}

export function getGalleryObjectUrl(key: string) {
  return `https://${PUBLIC_URL}/${key}`
}

export function extensionFromContentType(contentType: string) {
  if (contentType.includes('jpeg') || contentType.includes('jpg')) return 'jpg'
  if (contentType.includes('webp')) return 'webp'
  if (contentType.includes('gif')) return 'gif'
  return 'png'
}

export function sanitizeMunzuaGalleryFolder(folder?: string) {
  if (!folder) return ''

  return folder
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\\/g, '/')
    .split('/')
    .map((part) =>
      part
        .replace(/[^a-z0-9-_ ]/g, '')
        .trim()
        .replace(/\s+/g, '-'),
    )
    .filter((part) => part && part !== '.' && part !== '..')
    .join('/')
}

export function assertMunzuaGalleryKey(key: string) {
  if (!key.startsWith(MUNZUA_GALLERY_PREFIX)) {
    throw new Error('Chave de galeria inválida')
  }

  const relativeKey = key.slice(MUNZUA_GALLERY_PREFIX.length)
  if (!relativeKey || relativeKey.includes('..')) {
    throw new Error('Chave de galeria inválida')
  }
}

export function folderFromGalleryKey(key: string) {
  if (!key.startsWith(MUNZUA_GALLERY_PREFIX)) return ''
  const relativeKey = key.slice(MUNZUA_GALLERY_PREFIX.length)
  const parts = relativeKey.split('/')
  if (parts.length <= 1) return ''
  return parts.slice(0, -1).join('/')
}

export function fileNameFromGalleryKey(key: string) {
  return key.split('/').pop() ?? key
}

export async function uploadMunzuaGalleryImage(params: {
  bytes: Uint8Array
  contentType: string
  folder?: string
}) {
  const extension = extensionFromContentType(params.contentType)
  const folder = sanitizeMunzuaGalleryFolder(params.folder)
  const folderPrefix = folder ? `${folder}/` : ''
  const key = `${MUNZUA_GALLERY_PREFIX}${folderPrefix}${id()}.${extension}`

  await s3.send(
    new PutObjectCommand({
      Bucket: getMunzuaBucketName(),
      Key: key,
      Body: params.bytes,
      ContentType: params.contentType,
    }),
  )

  return {
    key,
    url: getGalleryObjectUrl(key),
    lastModified: new Date().toISOString(),
    folder,
  }
}

export async function listMunzuaGalleryImages(folder?: string) {
  const safeFolder = sanitizeMunzuaGalleryFolder(folder)
  const prefix = `${MUNZUA_GALLERY_PREFIX}${safeFolder ? `${safeFolder}/` : ''}`

  const { Contents } = await s3.send(
    new ListObjectsV2Command({
      Bucket: getMunzuaBucketName(),
      Prefix: prefix,
    }),
  )

  const allImages = (Contents ?? [])
    .filter((item) => item.Key)
    .sort((a, b) => (b.LastModified?.getTime() ?? 0) - (a.LastModified?.getTime() ?? 0))
    .map((item) => ({
      key: item.Key!,
      url: getGalleryObjectUrl(item.Key!),
      lastModified: item.LastModified?.toISOString() ?? null,
      folder: folderFromGalleryKey(item.Key!),
      fileName: fileNameFromGalleryKey(item.Key!),
    }))

  if (safeFolder) {
    const allFolders = await listMunzuaGalleryFolders()
    return { images: allImages, folders: allFolders, folder: safeFolder }
  }

  return {
    images: allImages,
    folders: Array.from(new Set(allImages.map((item) => item.folder).filter(Boolean))).sort(),
    folder: safeFolder,
  }
}

export async function listMunzuaGalleryFolders() {
  const { Contents } = await s3.send(
    new ListObjectsV2Command({
      Bucket: getMunzuaBucketName(),
      Prefix: MUNZUA_GALLERY_PREFIX,
    }),
  )

  return Array.from(
    new Set(
      (Contents ?? [])
        .map((item) => (item.Key ? folderFromGalleryKey(item.Key) : ''))
        .filter(Boolean),
    ),
  ).sort()
}

export async function deleteMunzuaGalleryImage(key: string) {
  assertMunzuaGalleryKey(key)

  await s3.send(
    new DeleteObjectCommand({
      Bucket: getMunzuaBucketName(),
      Key: key,
    }),
  )

  return { ok: true, key }
}

export async function getMunzuaGallerySignedUrl(key: string) {
  return getSignedUrl(
    s3,
    new GetObjectCommand({
      Bucket: getMunzuaBucketName(),
      Key: key,
    }),
    { expiresIn: 60 * 10 },
  )
}
