// Auth abstraction with two interchangeable providers chosen by VITE_AUTH_MODE:
//   - local  : email-only sign-in for dev (no AWS). Issues a `dev.<email>` token
//              the local API trusts; password is ignored.
//   - cognito: real Cognito email+password via AWS Amplify (lazy-loaded so the
//              local build never pulls Amplify at runtime).
// The current user's profile/role comes from `GET /me`, not from here.

import type { UserRole } from '#/types'
import { API_URL, AUTH_MODE } from './config'

export interface AuthProvider {
  hasSession(): Promise<boolean>
  getIdToken(): Promise<string | null>
  signIn(email: string, password: string): Promise<void>
  signOut(): Promise<void>
}

// ─── Local (dev) provider ──────────────────────────────────────────────────────

const LS_SESSION_KEY = 'atiom_leave_session'

function toBase64Url(s: string): string {
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

const localProvider: AuthProvider = {
  async hasSession() {
    return (
      typeof localStorage !== 'undefined' &&
      !!localStorage.getItem(LS_SESSION_KEY)
    )
  },
  async getIdToken() {
    const email = localStorage.getItem(LS_SESSION_KEY)
    return email ? `dev.${toBase64Url(email)}` : null
  },
  async signIn(email) {
    const normalized = email.trim().toLowerCase()
    // Validate the email maps to a seeded profile before persisting the session.
    const res = await fetch(`${API_URL}/me`, {
      headers: { Authorization: `Bearer dev.${toBase64Url(normalized)}` },
    })
    if (!res.ok) throw new Error('No account found for that email.')
    localStorage.setItem(LS_SESSION_KEY, normalized)
  },
  async signOut() {
    localStorage.removeItem(LS_SESSION_KEY)
  },
}

// ─── Provider dispatch ──────────────────────────────────────────────────────────

async function provider(): Promise<AuthProvider> {
  if (AUTH_MODE === 'cognito') {
    return (await import('./auth.cognito')).cognitoProvider
  }
  return localProvider
}

export const hasSession = (): Promise<boolean> =>
  provider().then((p) => p.hasSession())
export const getIdToken = (): Promise<string | null> =>
  provider().then((p) => p.getIdToken())
export const signIn = (email: string, password: string): Promise<void> =>
  provider().then((p) => p.signIn(email, password))
export const signOut = (): Promise<void> => provider().then((p) => p.signOut())

/** Default landing path for a role. */
export function homePathForRole(role: UserRole): string {
  switch (role) {
    case 'employee':
      return '/employee/dashboard'
    case 'manager':
      return '/manager/dashboard'
    case 'hr':
      return '/hr/dashboard'
  }
}
