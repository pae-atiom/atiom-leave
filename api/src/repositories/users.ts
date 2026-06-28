import {
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb'
import type { User, UserInput } from '#shared/types'
import { generateId } from '#shared/ids'
import { ddb, TableNames } from '../db'
import { fromUserItem, toUserItem } from './_mappers'
import { provisionIdentity } from '../identity'
import { seedUserBalances } from './balances'

export async function getUsers(): Promise<User[]> {
  const out = await ddb.send(new ScanCommand({ TableName: TableNames.users }))
  return (out.Items ?? []).map(fromUserItem)
}

export async function getUserById(id: string): Promise<User | undefined> {
  const out = await ddb.send(
    new GetCommand({ TableName: TableNames.users, Key: { id } }),
  )
  return out.Item ? fromUserItem(out.Item) : undefined
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  const out = await ddb.send(
    new QueryCommand({
      TableName: TableNames.users,
      IndexName: 'byEmail',
      KeyConditionExpression: 'email = :e',
      ExpressionAttributeValues: { ':e': email },
      Limit: 1,
    }),
  )
  return out.Items?.[0] ? fromUserItem(out.Items[0]) : undefined
}

export async function getDirectReports(managerId: string): Promise<User[]> {
  const out = await ddb.send(
    new QueryCommand({
      TableName: TableNames.users,
      IndexName: 'byManager',
      KeyConditionExpression: 'managerId = :m',
      ExpressionAttributeValues: { ':m': managerId },
    }),
  )
  return (out.Items ?? []).map(fromUserItem)
}

const MUTABLE_USER_FIELDS = [
  'name',
  'email',
  'role',
  'managerId',
  'departmentId',
  'avatarInitials',
  'isActive',
  'cognitoSub',
] as const

export async function updateUser(
  id: string,
  patch: Partial<User>,
): Promise<User> {
  const sets: string[] = []
  const removes: string[] = []
  const names: Record<string, string> = {}
  const values: Record<string, unknown> = {}
  for (const field of MUTABLE_USER_FIELDS) {
    if (!(field in patch)) continue
    const value = patch[field]
    names[`#${field}`] = field
    // null clears the attribute — required for indexed `managerId` (no NULL on a
    // GSI key) and consistent for optional fields.
    if (value === null || value === undefined) {
      removes.push(`#${field}`)
    } else {
      sets.push(`#${field} = :${field}`)
      values[`:${field}`] = value
    }
  }
  if (sets.length === 0 && removes.length === 0) {
    const existing = await getUserById(id)
    if (!existing) throw new Error(`Unknown user ${id}`)
    return existing
  }
  const expr = [
    sets.length ? `SET ${sets.join(', ')}` : '',
    removes.length ? `REMOVE ${removes.join(', ')}` : '',
  ]
    .filter(Boolean)
    .join(' ')
  const out = await ddb.send(
    new UpdateCommand({
      TableName: TableNames.users,
      Key: { id },
      UpdateExpression: expr,
      ExpressionAttributeNames: names,
      ...(Object.keys(values).length
        ? { ExpressionAttributeValues: values }
        : {}),
      ConditionExpression: 'attribute_exists(id)',
      ReturnValues: 'ALL_NEW',
    }),
  )
  return fromUserItem(out.Attributes as Record<string, unknown>)
}

/** "Alice Kaur" → "AK"; single word → first two letters. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '??'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/**
 * HR creates a new employee: provision the sign-in identity (Cognito in prod,
 * no-op locally), write the Users profile, and seed an empty balance row per
 * leave policy. The email must be unique.
 */
export async function createUser(input: UserInput): Promise<User> {
  const email = input.email.trim().toLowerCase()
  // Defence-in-depth; the handler also prechecks for a clean 409.
  const existing = await getUserByEmail(email)
  if (existing) throw new Error(`A user with email ${email} already exists`)

  const cognitoSub = await provisionIdentity(email, input.name.trim())

  const user: User = {
    id: generateId('usr'),
    name: input.name.trim(),
    email,
    role: input.role,
    managerId: input.managerId,
    departmentId: input.departmentId,
    avatarInitials: initials(input.name),
    isActive: true,
    ...(cognitoSub ? { cognitoSub } : {}),
  }

  await ddb.send(
    new PutCommand({
      TableName: TableNames.users,
      Item: toUserItem(user),
      ConditionExpression: 'attribute_not_exists(id)',
    }),
  )
  await seedUserBalances(user.id)
  return user
}
