// Create (idempotently) the local MinIO bucket for attachments.
//   bun run api:bucket
// CORS for browser presigned PUT/GET is handled globally by MinIO
// (MINIO_API_CORS_ALLOW_ORIGIN in docker-compose) — MinIO has no per-bucket
// PutBucketCors API. In AWS the bucket + its CORS are created by CDK (Phase 3),
// not this script — so it refuses to run unless S3_ENDPOINT is a local MinIO.

import { CreateBucketCommand } from '@aws-sdk/client-s3'
import { BUCKET, s3 } from '../src/storage'

async function main() {
  if (!process.env.S3_ENDPOINT) {
    console.warn(
      '⚠  S3_ENDPOINT not set — refusing to create a bucket against real AWS. ' +
        'Set it (e.g. http://localhost:9000) for local dev.',
    )
    process.exit(1)
  }

  try {
    await s3.send(new CreateBucketCommand({ Bucket: BUCKET }))
    console.log(`✓ created bucket ${BUCKET}`)
  } catch (err) {
    const name = (err as { name?: string }).name
    if (name === 'BucketAlreadyOwnedByYou' || name === 'BucketAlreadyExists') {
      console.log(`· bucket ${BUCKET} already exists`)
    } else {
      throw err
    }
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
