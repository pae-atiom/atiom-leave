// AWS Lambda entrypoint for API Gateway HTTP API. CDK bundles this file.
import { handle } from 'hono/aws-lambda'
import { app } from './handler'

export const handler = handle(app)
