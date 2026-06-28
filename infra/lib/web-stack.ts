import * as path from 'node:path'
import { CfnOutput, RemovalPolicy, Stack, type StackProps } from 'aws-cdk-lib'
import type { Construct } from 'constructs'
import { Bucket, BlockPublicAccess } from 'aws-cdk-lib/aws-s3'
import {
  Distribution,
  ViewerProtocolPolicy,
} from 'aws-cdk-lib/aws-cloudfront'
import { S3BucketOrigin } from 'aws-cdk-lib/aws-cloudfront-origins'
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment'

export interface WebStackProps extends StackProps {
  stage: string
}

/**
 * Static SPA hosting: private S3 bucket behind CloudFront (Origin Access
 * Control), SPA fallback for client-side routing, and a deployment that uploads
 * the prebuilt `dist/client` and invalidates the distribution.
 * Deploy AFTER building the web app with the backend stack's outputs.
 */
export class WebStack extends Stack {
  constructor(scope: Construct, id: string, props: WebStackProps) {
    super(scope, id, props)
    const prefix = `atiom-leave-${props.stage}`

    const bucket = new Bucket(this, 'SpaBucket', {
      bucketName: `${prefix}-web`,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    })

    const distribution = new Distribution(this, 'Distribution', {
      defaultRootObject: 'index.html',
      defaultBehavior: {
        origin: S3BucketOrigin.withOriginAccessControl(bucket),
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      // SPA fallback: serve index.html for client routes.
      errorResponses: [
        { httpStatus: 403, responseHttpStatus: 200, responsePagePath: '/index.html' },
        { httpStatus: 404, responseHttpStatus: 200, responsePagePath: '/index.html' },
      ],
    })

    new BucketDeployment(this, 'DeploySpa', {
      sources: [Source.asset(path.join(__dirname, '../../dist/client'))],
      destinationBucket: bucket,
      distribution,
      distributionPaths: ['/*'],
    })

    new CfnOutput(this, 'WebUrl', {
      value: `https://${distribution.distributionDomainName}`,
    })
  }
}
