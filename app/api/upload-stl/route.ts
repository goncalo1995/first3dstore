import { NextRequest, NextResponse } from 'next/server'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { s3, BUCKET_NAME, PUBLIC_URL } from '@/lib/s3'
import { getAdminUserFromRequest } from '@/lib/server-auth'
import { id } from '@instantdb/admin'

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
    const { productId, fileName, fileType } = await req.json()
    const cleanProductId = cleanPathSegment(String(productId ?? ''))
    const cleanFileName = cleanPathSegment(String(fileName ?? ''))

    if (!cleanProductId) {
      return NextResponse.json({ error: 'Missing productId' }, { status: 400 })
    }

    const allowedExtensions = ['.stl', '.3mf']
    const fileExtension = cleanFileName.split('.').pop()?.toLowerCase()
    if (!fileExtension || !allowedExtensions.includes(`.${fileExtension}`)) {
      return NextResponse.json({ error: 'Only .stl and .3mf files are supported' }, { status: 400 })
    }

    const key = `products/${cleanProductId}/files/${id()}-${cleanFileName}`
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: fileType || 'model/stl',
    })

    const signedUrl = await getSignedUrl(s3, command, { expiresIn: 3600 })

    return NextResponse.json({
      signedUrl,
      key,
      publicUrl: `https://${PUBLIC_URL}/${key}`,
    })
  } catch (err) {
    console.error('STL upload pre-sign failed:', err)
    return NextResponse.json({ error: 'Failed to generate STL upload URL' }, { status: 500 })
  }
}
