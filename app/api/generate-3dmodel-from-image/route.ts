import { NextRequest, NextResponse } from 'next/server'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { s3, BUCKET_NAME, PUBLIC_URL } from '@/lib/s3'
import { getAdminUserFromRequest } from '@/lib/server-auth'
import { id } from '@instantdb/admin'

const TRIPO_API_KEY = process.env.TRIPO_API_KEY
const TRIPO_BASE_URL = 'https://api.tripo3d.ai/v2/openapi'

function cleanPathSegment(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

async function createTripoTask(imageUrl: string): Promise<string> {
  const response = await fetch(`${TRIPO_BASE_URL}/task`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TRIPO_API_KEY}`,
    },
    body: JSON.stringify({
      type: 'image_to_model',
      file: {
        type: 'jpg',
        url: imageUrl,
      },
    }),
  })

  const result = await response.json()
  if (result.code !== 0) {
    // Forward specific Tripo error messages (e.g., credit issues)
    throw new Error(result.message || 'Tripo3D API error')
  }
  return result.data.task_id
}

async function pollTripoTask(taskId: string): Promise<{ status: string; modelUrl?: string }> {
  const maxAttempts = 100
  let attempt = 0
  let delay = 3000 // Start with 3 seconds

  while (attempt < maxAttempts) {
    const response = await fetch(`${TRIPO_BASE_URL}/task/${taskId}`, {
      headers: {
        'Authorization': `Bearer ${TRIPO_API_KEY}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to check task status: ${response.status}`)
    }

    const result = await response.json()
    if (result.code !== 0) {
      throw new Error(`Tripo API error: ${result.message || 'Unknown error'}`)
    }

    const taskData = result.data
    const status = taskData.status

    if (status === 'success') {
      return { status: 'success', modelUrl: taskData.output?.model }
    }

    if (status === 'failed' || status === 'banned' || status === 'expired' || status === 'cancelled') {
      throw new Error(`Tripo generation ${status}: Task could not be completed`)
    }

    // Exponential backoff: 3s → 5s → 8s → 10s (cap)
    await new Promise(resolve => setTimeout(resolve, delay))
    delay = Math.min(delay * 1.5 + 500, 10000)
    attempt++
  }

  throw new Error('Polling timeout: Task did not complete within 5 minutes')
}

export async function POST(req: NextRequest) {
  const auth = await getAdminUserFromRequest(req)
  if ('response' in auth) return auth.response

  if (!TRIPO_API_KEY) {
    return NextResponse.json(
      { error: 'Tripo3D API key not configured' },
      { status: 500 }
    )
  }

  try {
    const { imageUrl, productId, variantId } = await req.json()

    if (!imageUrl || !isValidUrl(imageUrl)) {
      return NextResponse.json(
        { error: 'Invalid image URL' },
        { status: 400 }
      )
    }

    if (!productId) {
      return NextResponse.json(
        { error: 'Missing productId' },
        { status: 400 }
      )
    }

    // Step 1: Create Tripo task
    const taskId = await createTripoTask(imageUrl)

    // Step 2: Poll for completion
    const result = await pollTripoTask(taskId)

    if (!result.modelUrl) {
      return NextResponse.json(
        { error: 'No model URL in Tripo response' },
        { status: 500 }
      )
    }

    // Step 3: Download the model
    const modelResponse = await fetch(result.modelUrl)
    if (!modelResponse.ok) {
      throw new Error('Failed to download generated model')
    }

    const modelBuffer = await modelResponse.arrayBuffer()

    // Step 4: Upload to S3
    const cleanProductId = cleanPathSegment(String(productId))
    const fileId = id()
    const key = `products/${cleanProductId}/files/${fileId}-tripo.glb`

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: 'model/gltf-binary',
    })

    const signedUrl = await getSignedUrl(s3, command, { expiresIn: 3600 })

    const uploadResponse = await fetch(signedUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'model/gltf-binary' },
      body: modelBuffer,
    })

    if (!uploadResponse.ok) {
      throw new Error('Failed to upload model to S3')
    }

    const publicUrl = `https://${PUBLIC_URL}/${key}`

    // Step 5: Return file info (metadata left empty for manual entry)
    return NextResponse.json({
      success: true,
      file: {
        url: publicUrl,
        name: 'Generated from image',
        source: 'tripo3d',
        variantId: variantId || undefined,
      },
    })
  } catch (err) {
    console.error('STL generation failed:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Tripo3D generation failed. Please try again.' },
      { status: 500 }
    )
  }
}
