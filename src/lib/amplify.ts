// AWS Amplify Auth configuration (Cognito user pool). Only imported on the
// cognito auth path; the local dev path never loads Amplify.

import { Amplify } from 'aws-amplify'

let configured = false

export function configureAmplify(): void {
  if (configured) return
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID as string,
        userPoolClientId: import.meta.env.VITE_COGNITO_CLIENT_ID as string,
        loginWith: { email: true },
      },
    },
  })
  configured = true
}
