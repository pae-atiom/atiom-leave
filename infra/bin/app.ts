#!/usr/bin/env node
import { App } from 'aws-cdk-lib'
import { BackendStack } from '../lib/backend-stack'
import { WebStack } from '../lib/web-stack'

const app = new App()
const stage = app.node.tryGetContext('stage') ?? 'dev'
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION ?? 'us-east-1',
}
const corsOrigin = app.node.tryGetContext('corsOrigin') // CloudFront URL, set on 2nd deploy

new BackendStack(app, `AtiomLeave-Backend-${stage}`, { stage, env, corsOrigin })
new WebStack(app, `AtiomLeave-Web-${stage}`, { stage, env })
