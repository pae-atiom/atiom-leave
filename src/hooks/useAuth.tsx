import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { User, UserRole } from '#/types'
import { api } from '#/lib/api'
import {
  hasSession as providerHasSession,
  signIn as providerSignIn,
  signOut as providerSignOut,
} from '#/lib/auth'

type AuthStatus = 'loading' | 'authed' | 'anon'

interface AuthContextValue {
  user: User | null
  role: UserRole | null
  status: AuthStatus
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient()
  // null = still checking for a stored session; true/false once resolved.
  const [sessionPresent, setSessionPresent] = useState<boolean | null>(null)

  useEffect(() => {
    providerHasSession().then(setSessionPresent)
  }, [])

  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: () => api.me(),
    enabled: sessionPresent === true,
    retry: false,
    staleTime: Infinity,
  })

  // A stored-but-invalid session (e.g. unknown email / expired token) must not
  // trap the user on a loader — drop it and fall back to the login screen.
  useEffect(() => {
    if (meQuery.isError) {
      providerSignOut().finally(() => setSessionPresent(false))
    }
  }, [meQuery.isError])

  const signIn = useCallback(
    async (email: string, password: string) => {
      await providerSignIn(email, password)
      setSessionPresent(true)
      await qc.fetchQuery({ queryKey: ['me'], queryFn: () => api.me() })
    },
    [qc],
  )

  const signOut = useCallback(async () => {
    await providerSignOut()
    setSessionPresent(false)
    qc.clear()
  }, [qc])

  const status: AuthStatus =
    sessionPresent === null
      ? 'loading'
      : sessionPresent === false
        ? 'anon'
        : meQuery.data
          ? 'authed'
          : meQuery.isError
            ? 'anon'
            : 'loading'

  const value = useMemo<AuthContextValue>(
    () => ({
      user: meQuery.data?.user ?? null,
      role: meQuery.data?.role ?? null,
      status,
      signIn,
      signOut,
    }),
    [meQuery.data, status, signIn, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}

/** Convenience for routes that require a signed-in user (rendered inside _auth). */
export function useCurrentUser(): User {
  const { user } = useAuth()
  if (!user) throw new Error('No authenticated user')
  return user
}
