// Caller identity derivation. Every route runs behind this middleware: it reads
// the bearer token, resolves the email, maps it to a Users profile, and stashes
// the caller on the Hono context. The API never trusts a client-supplied actor.
//
// Two modes (single code path so local dev and Lambda behave identically):
//   - local   : token is `dev.<base64url(email)>` (or `x-dev-email` header).
//   - cognito : token is a Cognito **ID token**, verified against the pool JWKS.

import type { Context, MiddlewareHandler } from 'hono'
import type { LeaveRequest, User } from '#shared/types'
import { getUserByEmail } from './repositories/users'

export type AppEnv = { Variables: { caller: User } }

const AUTH_MODE =
  process.env.AUTH_MODE ?? (process.env.STAGE === 'prod' ? 'cognito' : 'local')

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

function bearer(c: Context): string | null {
  const header = c.req.header('authorization') ?? c.req.header('Authorization')
  if (!header) return null
  const [scheme, token] = header.split(' ')
  return scheme?.toLowerCase() === 'bearer' && token ? token : null
}

function decodeLocalEmail(c: Context): string | null {
  const devHeader = c.req.header('x-dev-email')
  if (devHeader) return devHeader
  const token = bearer(c)
  if (!token || !token.startsWith('dev.')) return null
  try {
    return Buffer.from(token.slice(4), 'base64url').toString('utf8')
  } catch {
    return null
  }
}

// Lazily-built Cognito verifier (only loaded in cognito mode).
let verifierPromise: Promise<{ verify: (t: string) => Promise<{ email?: string }> }> | null =
  null
function getVerifier() {
  if (!verifierPromise) {
    verifierPromise = import('aws-jwt-verify').then(({ CognitoJwtVerifier }) =>
      CognitoJwtVerifier.create({
        userPoolId: process.env.COGNITO_USER_POOL_ID!,
        tokenUse: 'id',
        clientId: process.env.COGNITO_CLIENT_ID!,
      }),
    )
  }
  return verifierPromise
}

async function resolveEmail(c: Context): Promise<string> {
  if (AUTH_MODE === 'local') {
    const email = decodeLocalEmail(c)
    if (!email) throw new HttpError(401, 'Missing dev credentials')
    return email
  }
  const token = bearer(c)
  if (!token) throw new HttpError(401, 'Missing bearer token')
  try {
    const verifier = await getVerifier()
    const payload = await verifier.verify(token)
    if (!payload.email) throw new HttpError(401, 'Token has no email claim')
    return payload.email
  } catch (err) {
    if (err instanceof HttpError) throw err
    throw new HttpError(401, 'Invalid token')
  }
}

/** Hono middleware: resolves the caller and sets `c.var.caller`. */
export const authMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
  const email = await resolveEmail(c)
  const user = await getUserByEmail(email)
  if (!user) throw new HttpError(401, `No profile for ${email}`)
  c.set('caller', user)
  await next()
}

// ─── Authorization helpers ─────────────────────────────────────────────────────

export const isHr = (u: User): boolean => u.role === 'hr'

/** Employees see themselves; managers see direct reports; HR sees everyone. */
export function canViewEmployee(caller: User, employee: User): boolean {
  if (isHr(caller)) return true
  if (caller.id === employee.id) return true
  return caller.role === 'manager' && employee.managerId === caller.id
}

/** Who may approve/reject/decide a request: its denormalised manager, or HR. */
export function canDecideRequest(caller: User, request: LeaveRequest): boolean {
  return isHr(caller) || request.managerId === caller.id
}

/** Who may edit/withdraw/cancel a request: its owner, or HR. */
export function isOwnerOrHr(caller: User, request: LeaveRequest): boolean {
  return isHr(caller) || request.employeeId === caller.id
}

export function assert(condition: unknown, status: number, message: string): asserts condition {
  if (!condition) throw new HttpError(status, message)
}
