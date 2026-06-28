// S3 object storage for leave-request attachments. Locally this points at MinIO
// (S3_ENDPOINT=http://localhost:9000, path-style addressing); in AWS the
// endpoint is unset and the Lambda's IAM role + regional S3 are used. Same
// single code path — mirrors db.ts.
//
// The browser never streams bytes through the API: it asks for a presigned PUT
// URL, uploads straight to S3, then we persist the returned object key on the
// Attachment. Downloads use a presigned GET URL.

import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { generateId } from '#shared/ids'
import type { AttachmentMime, PresignUploadInput } from '#shared/types'

const endpoint = process.env.S3_ENDPOINT
const region = process.env.S3_REGION ?? process.env.AWS_REGION ?? 'us-east-1'

export const BUCKET =
  process.env.S3_BUCKET ?? `atiom-leave-${process.env.STAGE ?? 'local'}-attachments`

// Presigned URLs expire quickly — long enough for an upload/download, short
// enough that a leaked URL is low-risk.
const PRESIGN_EXPIRY_SECONDS = 300

export const ATTACHMENT_MIME_OK: ReadonlySet<string> = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
])
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024 // 10 MB

export const s3 = new S3Client({
  region,
  ...(endpoint
    ? {
        endpoint,
        forcePathStyle: true, // MinIO needs path-style (bucket in the URL path)
        credentials: {
          accessKeyId:
            process.env.S3_ACCESS_KEY_ID ??
            process.env.AWS_ACCESS_KEY_ID ??
            'minioadmin',
          secretAccessKey:
            process.env.S3_SECRET_ACCESS_KEY ??
            process.env.AWS_SECRET_ACCESS_KEY ??
            'minioadmin',
        },
      }
    : {}),
})

/** Build an opaque, collision-free object key under the caller's namespace. */
export function buildAttachmentKey(ownerId: string, filename: string): string {
  // Strip path separators; keep a readable suffix for console/debugging.
  const safe = filename.replace(/[^\w.\-]+/g, '_').slice(-80)
  return `attachments/${ownerId}/${generateId('att')}/${safe}`
}

/** Presign a PUT so the browser can upload the file bytes directly to S3. */
export async function presignUpload(
  ownerId: string,
  input: PresignUploadInput,
): Promise<{ key: string; url: string }> {
  const key = buildAttachmentKey(ownerId, input.filename)
  const url = await getSignedUrl(
    s3,
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: input.mimeType,
    }),
    { expiresIn: PRESIGN_EXPIRY_SECONDS },
  )
  return { key, url }
}

/** Presign a GET so the browser can download/preview a stored attachment. */
export async function presignDownload(
  key: string,
  filename?: string,
): Promise<string> {
  return getSignedUrl(
    s3,
    new GetObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ...(filename
        ? {
            ResponseContentDisposition: `inline; filename="${filename.replace(
              /"/g,
              '',
            )}"`,
          }
        : {}),
    }),
    { expiresIn: PRESIGN_EXPIRY_SECONDS },
  )
}

export function isAllowedMime(mime: string): mime is AttachmentMime {
  return ATTACHMENT_MIME_OK.has(mime)
}
