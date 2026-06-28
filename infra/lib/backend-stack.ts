import * as path from 'node:path'
import { CfnOutput, Duration, Stack, type StackProps } from 'aws-cdk-lib'
import type { Construct } from 'constructs'
import {
  AccountRecovery,
  OAuthScope,
  UserPool,
  UserPoolClient,
} from 'aws-cdk-lib/aws-cognito'
import { HttpApi, CorsHttpMethod } from 'aws-cdk-lib/aws-apigatewayv2'
import { HttpUserPoolAuthorizer } from 'aws-cdk-lib/aws-apigatewayv2-authorizers'
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations'
import { Runtime } from 'aws-cdk-lib/aws-lambda'
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs'
import { createTables } from './tables'

export interface BackendStackProps extends StackProps {
  stage: string
  /** Allowed browser origin (the CloudFront URL); '*' for first bring-up. */
  corsOrigin?: string
}

export class BackendStack extends Stack {
  public readonly apiUrl: string

  constructor(scope: Construct, id: string, props: BackendStackProps) {
    super(scope, id, props)
    const prefix = `atiom-leave-${props.stage}`

    // ── DynamoDB ────────────────────────────────────────────────────────────
    const tables = createTables(this, prefix)

    // ── Cognito ─────────────────────────────────────────────────────────────
    const userPool = new UserPool(this, 'UserPool', {
      userPoolName: `${prefix}-users`,
      signInAliases: { email: true },
      selfSignUpEnabled: false, // users are created by HR / seed script
      accountRecovery: AccountRecovery.EMAIL_ONLY,
      standardAttributes: { email: { required: true, mutable: false } },
      passwordPolicy: { minLength: 8, requireDigits: true, requireLowercase: true },
    })
    const userPoolClient = new UserPoolClient(this, 'UserPoolClient', {
      userPool,
      authFlows: { userPassword: true, userSrp: true },
      generateSecret: false, // public SPA client
      oAuth: { scopes: [OAuthScope.EMAIL, OAuthScope.OPENID, OAuthScope.PROFILE] },
    })

    // ── Lambda (single Hono handler) ──────────────────────────────────────────
    const fn = new NodejsFunction(this, 'ApiFn', {
      functionName: `${prefix}-api`,
      runtime: Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../api/src/lambda.ts'),
      handler: 'handler',
      timeout: Duration.seconds(15),
      memorySize: 256,
      bundling: { format: undefined, externalModules: ['@aws-sdk/*'] },
      environment: {
        STAGE: props.stage,
        AUTH_MODE: 'cognito',
        TABLE_PREFIX: prefix,
        COGNITO_USER_POOL_ID: userPool.userPoolId,
        COGNITO_CLIENT_ID: userPoolClient.userPoolClientId,
        CORS_ORIGIN: props.corsOrigin ?? '*',
      },
    })

    // DynamoDB permissions (incl. TransactWrite) on every table + its indexes.
    for (const table of Object.values(tables)) table.grantReadWriteData(fn)

    // ── HTTP API with the Cognito JWT authorizer as default ───────────────────
    const authorizer = new HttpUserPoolAuthorizer('Authorizer', userPool, {
      userPoolClients: [userPoolClient],
    })
    const httpApi = new HttpApi(this, 'HttpApi', {
      apiName: `${prefix}-api`,
      defaultAuthorizer: authorizer,
      defaultIntegration: new HttpLambdaIntegration('ApiIntegration', fn),
      corsPreflight: {
        allowOrigins: [props.corsOrigin ?? '*'],
        allowMethods: [
          CorsHttpMethod.GET,
          CorsHttpMethod.POST,
          CorsHttpMethod.PATCH,
          CorsHttpMethod.OPTIONS,
        ],
        allowHeaders: ['Authorization', 'Content-Type'],
      },
    })

    this.apiUrl = httpApi.apiEndpoint

    new CfnOutput(this, 'UserPoolId', { value: userPool.userPoolId })
    new CfnOutput(this, 'ClientId', { value: userPoolClient.userPoolClientId })
    new CfnOutput(this, 'ApiUrl', { value: httpApi.apiEndpoint })
  }
}
