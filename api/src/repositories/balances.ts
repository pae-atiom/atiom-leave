import {
  BatchWriteCommand,
  GetCommand,
  QueryCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb'
import type { AuditLogEntry, LeaveBalance, LeaveTypeName } from '#shared/types'
import { generateId, nowIso } from '#shared/ids'
import { SEED_YEAR } from '#shared/seed'
import { ddb, TableNames } from '../db'
import { balanceSk, fromBalanceItem, toAuditItem, toBalanceItem } from './_mappers'
import { transactWrite } from './_tx'
import { getLeavePolicies } from './policies'

export const CURRENT_YEAR = SEED_YEAR

export async function getBalances(): Promise<LeaveBalance[]> {
  const out = await ddb.send(
    new ScanCommand({ TableName: TableNames.balances }),
  )
  return (out.Items ?? []).map(fromBalanceItem)
}

export async function getBalancesByUser(
  userId: string,
  year = CURRENT_YEAR,
): Promise<LeaveBalance[]> {
  const out = await ddb.send(
    new QueryCommand({
      TableName: TableNames.balances,
      KeyConditionExpression: 'userId = :u AND begins_with(sk, :y)',
      ExpressionAttributeValues: { ':u': userId, ':y': `${year}#` },
    }),
  )
  return (out.Items ?? []).map(fromBalanceItem)
}

export async function getBalance(
  userId: string,
  leaveType: LeaveTypeName,
  year = CURRENT_YEAR,
): Promise<LeaveBalance | undefined> {
  const out = await ddb.send(
    new GetCommand({
      TableName: TableNames.balances,
      Key: { userId, sk: balanceSk(year, leaveType) },
    }),
  )
  return out.Item ? fromBalanceItem(out.Item) : undefined
}

function balanceAuditItem(
  userId: string,
  leaveType: LeaveTypeName,
  actorId: string,
  note: string,
): Record<string, unknown> {
  const entry: AuditLogEntry = {
    id: generateId('audit'),
    requestId: `balance:${userId}:${leaveType}`,
    action: 'balance_adjusted',
    actorId,
    timestamp: nowIso(),
    note,
    fromStatus: null,
    toStatus: 'approved',
  }
  return toAuditItem(entry)
}

/** Upsert one numeric field on a balance, defaulting the rest on first write. */
function upsertBalanceUpdate(
  userId: string,
  leaveType: LeaveTypeName,
  year: number,
  field: 'totalEntitled' | 'manualAdjustment',
  value: number,
) {
  const other = field === 'totalEntitled' ? 'manualAdjustment' : 'totalEntitled'
  return {
    Update: {
      TableName: TableNames.balances,
      Key: { userId, sk: balanceSk(year, leaveType) },
      UpdateExpression:
        `SET #f = :v, ` +
        `id = if_not_exists(id, :id), ` +
        `leaveType = if_not_exists(leaveType, :lt), ` +
        `#yr = if_not_exists(#yr, :yr), ` +
        `used = if_not_exists(used, :zero), ` +
        `#o = if_not_exists(#o, :zero)`,
      ExpressionAttributeNames: { '#f': field, '#o': other, '#yr': 'year' },
      ExpressionAttributeValues: {
        ':v': value,
        ':id': generateId('bal'),
        ':lt': leaveType,
        ':yr': year,
        ':zero': 0,
      },
    },
  }
}

export async function setEntitlement(
  userId: string,
  leaveType: LeaveTypeName,
  totalEntitled: number,
  actorId: string,
  year = CURRENT_YEAR,
): Promise<LeaveBalance> {
  const previous = (await getBalance(userId, leaveType, year))?.totalEntitled ?? 0
  await transactWrite([
    upsertBalanceUpdate(userId, leaveType, year, 'totalEntitled', totalEntitled),
    {
      Put: {
        TableName: TableNames.requests,
        Item: balanceAuditItem(
          userId,
          leaveType,
          actorId,
          `Set ${leaveType} entitlement to ${totalEntitled} day(s) (was ${previous})`,
        ),
      },
    },
  ])
  return (await getBalance(userId, leaveType, year))!
}

/**
 * Seed a fresh set of balances (one per leave policy) for a newly-created user.
 * `used` starts at 0 and `totalEntitled` defaults to each policy's company
 * entitlement — HR can override per-user later via setEntitlement.
 */
export async function seedUserBalances(
  userId: string,
  year = CURRENT_YEAR,
): Promise<void> {
  const policies = await getLeavePolicies()
  const items = policies.map((policy) =>
    toBalanceItem({
      id: generateId('bal'),
      userId,
      leaveType: policy.leaveType,
      year,
      totalEntitled: policy.annualEntitlementDays,
      used: 0,
      manualAdjustment: 0,
    }),
  )
  for (let i = 0; i < items.length; i += 25) {
    await ddb.send(
      new BatchWriteCommand({
        RequestItems: {
          [TableNames.balances]: items
            .slice(i, i + 25)
            .map((Item) => ({ PutRequest: { Item } })),
        },
      }),
    )
  }
}

export async function adjustBalance(
  userId: string,
  leaveType: LeaveTypeName,
  manualAdjustment: number,
  actorId: string,
  year = CURRENT_YEAR,
): Promise<LeaveBalance> {
  await transactWrite([
    upsertBalanceUpdate(
      userId,
      leaveType,
      year,
      'manualAdjustment',
      manualAdjustment,
    ),
    {
      Put: {
        TableName: TableNames.requests,
        Item: balanceAuditItem(
          userId,
          leaveType,
          actorId,
          `Set manual adjustment to ${manualAdjustment} day(s) for ${leaveType}`,
        ),
      },
    },
  ])
  return (await getBalance(userId, leaveType, year))!
}
