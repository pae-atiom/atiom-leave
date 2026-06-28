// Client runtime config from Vite env. Kept dependency-free so both the API
// client and the auth layer can import it without a circular reference.

export const API_URL =
  import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

export type AuthMode = 'local' | 'cognito'

export const AUTH_MODE: AuthMode =
  import.meta.env.VITE_AUTH_MODE === 'cognito' ? 'cognito' : 'local'
