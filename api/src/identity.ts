// Identity provisioning for HR "Add employee". Chosen by AUTH_MODE (the same
// switch that drives request authentication):
//   - local: no-op. There is no local Cognito emulator, so we only write the
//     Users profile; sign-in works via the dev token (any known email).
//   - cognito: AdminCreateUser in the pool (suppressed invite, temp password),
//     returning the Cognito `sub` to store on the profile. Lazy-loaded so the
//     local build never pulls the Cognito SDK.
//
// Phase 3 wires the Lambda's IAM role with cognito-idp:AdminCreateUser.
//
// AUTH_MODE is resolved from env here (not imported from auth.ts) to avoid an
// import cycle: users → identity → auth → users. Same resolution as auth.ts.

const AUTH_MODE =
  process.env.AUTH_MODE ?? (process.env.STAGE === 'prod' ? 'cognito' : 'local')

/** Create the sign-in identity for a new user. Returns the Cognito `sub`
 *  (undefined in local mode). Throws if the email already exists in the pool. */
export async function provisionIdentity(
  email: string,
  name: string,
): Promise<string | undefined> {
  if (AUTH_MODE !== 'cognito') return undefined

  const userPoolId = process.env.COGNITO_USER_POOL_ID
  if (!userPoolId) {
    throw new Error('COGNITO_USER_POOL_ID is required to create users in cognito mode')
  }

  const { CognitoIdentityProviderClient, AdminCreateUserCommand } = await import(
    '@aws-sdk/client-cognito-identity-provider'
  )
  const client = new CognitoIdentityProviderClient({
    region: process.env.AWS_REGION ?? 'us-east-1',
  })
  const out = await client.send(
    new AdminCreateUserCommand({
      UserPoolId: userPoolId,
      Username: email,
      DesiredDeliveryMediums: ['EMAIL'], // Cognito emails the temp password
      UserAttributes: [
        { Name: 'email', Value: email },
        { Name: 'email_verified', Value: 'true' },
        { Name: 'name', Value: name },
      ],
    }),
  )
  return out.User?.Attributes?.find((a) => a.Name === 'sub')?.Value
}
