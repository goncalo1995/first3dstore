import { S3Client } from '@aws-sdk/client-s3'

export const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.eu.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

export const BUCKET_NAME = process.env.R2_PUBLIC_BUCKET_NAME!
export const PUBLIC_URL = process.env.R2_PUBLIC_URL || `${BUCKET_NAME}.r2.dev`
