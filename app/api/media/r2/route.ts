import { NextRequest, NextResponse } from 'next/server'
import { ListObjectsV2Command, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { s3, BUCKET_NAME, PUBLIC_URL } from '@/lib/s3'

export async function GET(req: NextRequest) {
  try {
    const command = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
    })

    const { Contents } = await s3.send(command)

    const files = (Contents || []).map(file => ({
      id: file.ETag || file.Key!,
      key: file.Key!,
      path: file.Key!,
      url: `https://${PUBLIC_URL}/${file.Key}`,
      size: file.Size || 0,
      lastModified: file.LastModified,
    }))

    return NextResponse.json({ files })
  } catch (err) {
    console.error('R2 list failed:', err)
    return NextResponse.json({ error: 'Failed to list files' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { fileName, fileType } = await req.json()

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileName,
      ContentType: fileType,
    })

    const signedUrl = await getSignedUrl(s3, command, { expiresIn: 3600 })

    return NextResponse.json({ 
      signedUrl, 
      publicUrl: `https://${PUBLIC_URL}/${fileName}` 
    })
  } catch (err) {
    console.error('R2 pre-sign failed:', err)
    return NextResponse.json({ error: 'Failed to generate upload URL' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { key } = await req.json()

    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    })

    await s3.send(command)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('R2 delete failed:', err)
    return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 })
  }
}
