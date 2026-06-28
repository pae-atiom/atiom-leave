import { useEffect, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { CalendarCheck2 } from 'lucide-react'
import { AUTH_MODE } from '#/lib/config'
import { useAuth } from '#/hooks/useAuth'
import { Button } from '#/components/ui/Button'
import { FieldGroup, Input } from '#/components/ui/Field'
import { ThemeToggle } from '#/components/layout/ThemeToggle'

export const Route = createFileRoute('/login')({ component: LoginPage })

function LoginPage() {
  const { signIn, status } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Already signed in → leave the login screen.
  useEffect(() => {
    if (status === 'authed') navigate({ to: '/' })
  }, [status, navigate])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await signIn(email, password)
      navigate({ to: '/' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-canvas via-canvas to-slate-100 px-4 py-10">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-brand-600 text-white shadow-lg shadow-brand-600/30">
            <CalendarCheck2 className="size-6" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Atiom Leave
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Sign in with your work email and password.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 rounded-2xl bg-surface p-6 shadow-sm ring-1 ring-slate-200"
        >
          <FieldGroup label="Email" htmlFor="email">
            <Input
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@atiom.app"
              required
            />
          </FieldGroup>
          <FieldGroup label="Password" htmlFor="password">
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </FieldGroup>

          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>

        {AUTH_MODE === 'local' && (
          <p className="mt-6 text-center text-xs text-slate-400">
            Local dev — any password works. Try{' '}
            <span className="font-medium text-slate-500">alice@atiom.app</span>{' '}
            (employee), <span className="font-medium text-slate-500">dana@atiom.app</span>{' '}
            (manager) or{' '}
            <span className="font-medium text-slate-500">frank@atiom.app</span> (HR).
          </p>
        )}
      </div>
    </div>
  )
}
