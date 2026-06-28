// DynamoDB document client. Locally it points at DynamoDB Local
// (DYNAMODB_ENDPOINT=http://localhost:8000 with dummy creds); in AWS the
// endpoint is unset and the Lambda's IAM role supplies credentials.

import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'

const endpoint = process.env.DYNAMODB_ENDPOINT
const region = process.env.AWS_REGION ?? 'us-east-1'

export const rawClient = new DynamoDBClient({
  region,
  ...(endpoint
    ? {
        endpoint,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? 'local',
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? 'local',
        },
      }
    : {}),
})

export const ddb = DynamoDBDocumentClient.from(rawClient, {
  marshallOptions: { removeUndefinedValues: true },
})

export { TableNames } from './tables'
