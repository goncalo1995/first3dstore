import { NextRequest, NextResponse } from 'next/server'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { id } from '@instantdb/admin'
import { s3, BUCKET_NAME, PUBLIC_URL } from '@/lib/s3'
import { getAdminUserFromRequest } from '@/lib/server-auth'

function cleanPathSegment(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export async function POST(req: NextRequest) {
  const auth = await getAdminUserFromRequest(req)
  if ('response' in auth) return auth.response

  try {
    const { productSlug, fileName, fileType } = await req.json()
    const cleanSlug = cleanPathSegment(String(productSlug ?? ''))
    const cleanFileName = cleanPathSegment(String(fileName ?? ''))
    const contentType = String(fileType ?? '')

    if (!cleanSlug) {
      return NextResponse.json({ error: 'Missing productSlug' }, { status: 400 })
    }
    if (!cleanFileName) {
      return NextResponse.json({ error: 'Missing fileName' }, { status: 400 })
    }
    const allowedMimeTypes = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/avif'])
    if (!allowedMimeTypes.has(contentType)) {
      return NextResponse.json({ error: 'Only PNG/JPEG/WebP/AVIF uploads are supported' }, { status: 400 })
    }

    const fileExtension = cleanFileName.split('.').pop()?.toLowerCase() || 'png'
    const key = `products/${cleanSlug}/images/${id()}.${fileExtension}`
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    })
    const signedUrl = await getSignedUrl(s3, command, { expiresIn: 3600 })

    return NextResponse.json({
      signedUrl,
      key,
      publicUrl: `https://${PUBLIC_URL}/${key}`,
    })
  } catch (err) {
    console.error('Product image upload pre-sign failed:', err)
    return NextResponse.json({ error: 'Failed to generate product image upload URL' }, { status: 500 })
  }
}
