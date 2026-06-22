import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import type { AuthSession, User, UserRole } from '#/types'
import { clearAuth, getAuth, setAuth } from '#/lib/auth'
import { getUserById } from '#/store/users'

interface AuthContextValue {
  session: AuthSession | null
  user: User | null
  role: UserRole | null
  login: (user: User) => void
  switchUser: (user: User) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() => getAuth())

  const apply = useCallback((next: AuthSession | null) => {
    if (next) setAuth(next)
    else clearAuth()
    setSession(next)
  }, [])

  const login = useCallback(
    (user: User) => apply({ userId: user.id, role: user.role }),
    [apply],
  )
  const switchUser = useCallback(
    (user: User) => apply({ userId: user.id, role: user.role }),
    [apply],
  )
  const logout = useCallback(() => apply(null), [apply])

  const user = session ? (getUserById(session.userId) ?? null) : null

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user,
      role: session?.role ?? null,
      login,
      switchUser,
      logout,
    }),
    [session, user, login, switchUser, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}

/** Convenience for routes that require a signed-in user. */
export function useCurrentUser(): User {
  const { user } = useAuth()
  if (!user) throw new Error('No authenticated user')
  return user
}
