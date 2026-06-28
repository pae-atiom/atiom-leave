// Create the seed users in a Cognito User Pool with permanent passwords.
//   COGNITO_USER_POOL_ID=… AWS_REGION=… bun run api:seed:cognito
//
// There is no local Cognito emulator, so for pure-local dev (AUTH_MODE=local)
// this is a no-op — the local API trusts the dev token instead. Point it at a
// real (free-tier) dev pool when you want to exercise the Cognito path.

import {
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  CognitoIdentityProviderClient,
  UsernameExistsException,
} from '@aws-sdk/client-cognito-identity-provider'
import { buildSeedDataset } from '#shared/seed'

const PASSWORD = process.env.SEED_PASSWORD ?? 'Atiom!2026'

async function main() {
  const userPoolId = process.env.COGNITO_USER_POOL_ID
  if (!userPoolId) {
    console.log(
      'COGNITO_USER_POOL_ID not set — skipping (local dev uses AUTH_MODE=local).',
    )
    return
  }

  const client = new CognitoIdentityProviderClient({
    region: process.env.AWS_REGION ?? 'us-east-1',
  })
  const { users } = buildSeedDataset()

  for (const user of users) {
    try {
      await client.send(
        new AdminCreateUserCommand({
          UserPoolId: userPoolId,
          Username: user.email,
          MessageAction: 'SUPPRESS', // don't email a temp password
          UserAttributes: [
            { Name: 'email', Value: user.email },
            { Name: 'email_verified', Value: 'true' },
            { Name: 'name', Value: user.name },
          ],
        }),
      )
    } catch (err) {
      if (!(err instanceof UsernameExistsException)) throw err
      console.log(`· ${user.email} already exists`)
    }
    await client.send(
      new AdminSetUserPasswordCommand({
        UserPoolId: userPoolId,
        Username: user.email,
        Password: PASSWORD,
        Permanent: true,
      }),
    )
    console.log(`✓ ${user.email} (${user.role}) — password: ${PASSWORD}`)
  }
  console.log(`Seeded ${users.length} Cognito users into ${userPoolId}.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
