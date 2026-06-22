// Mock auth session, persisted in localStorage. No passwords — the login screen
// just picks a seeded user. The dev role switcher can override the active role
// without changing the underlying User record.

import type { AuthSession, UserRole } from '#/types'

const LS_AUTH_KEY = 'atiom_leave_auth'

export function getAuth(): AuthSession | null {
  if (typeof localStorage === 'undefined') return null
  const raw = localStorage.getItem(LS_AUTH_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as AuthSession
  } catch {
    return null
  }
}

export function setAuth(session: AuthSession): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(LS_AUTH_KEY, JSON.stringify(session))
}

export function clearAuth(): void {
  if (typeof localStorage === 'undefined') return
  localStorage.removeItem(LS_AUTH_KEY)
}

export function setActiveRole(role: UserRole): void {
  const current = getAuth()
  if (!current) return
  setAuth({ ...current, role })
}

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
