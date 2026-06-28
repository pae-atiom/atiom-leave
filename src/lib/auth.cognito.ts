// Cognito auth provider via AWS Amplify. Lazy-loaded by src/lib/auth.ts when
// VITE_AUTH_MODE=cognito, so the local build never bundles Amplify at runtime.

import {
  fetchAuthSession,
  signIn as amplifySignIn,
  signOut as amplifySignOut,
} from 'aws-amplify/auth'
import type { AuthProvider } from './auth'
import { configureAmplify } from './amplify'

configureAmplify()

export const cognitoProvider: AuthProvider = {
  async hasSession() {
    try {
      const session = await fetchAuthSession()
      return !!session.tokens?.idToken
    } catch {
      return false
    }
  },
  async getIdToken() {
    try {
      const session = await fetchAuthSession()
      return session.tokens?.idToken?.toString() ?? null
    } catch {
      return null
    }
  },
  async signIn(email, password) {
    await amplifySignIn({ username: email, password })
  },
  async signOut() {
    await amplifySignOut()
  },
}
