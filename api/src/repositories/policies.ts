import { ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import type { LeavePolicy } from '#shared/types'
import { ddb, TableNames } from '../db'

export async function getLeavePolicies(): Promise<LeavePolicy[]> {
  const out = await ddb.send(
    new ScanCommand({ TableName: TableNames.policies }),
  )
  return (out.Items ?? []) as LeavePolicy[]
}

const MUTABLE_POLICY_FIELDS = [
  'label',
  'annualEntitlementDays',
  'maxPerYearDays',
  'requiresDocument',
  'requiresManagerApproval',
  'isPaid',
  'notes',
] as const

export async function updateLeavePolicy(
  id: string,
  patch: Partial<LeavePolicy>,
): Promise<LeavePolicy> {
  const sets: string[] = []
  const names: Record<string, string> = {}
  const values: Record<string, unknown> = {}
  for (const field of MUTABLE_POLICY_FIELDS) {
    if (field in patch && patch[field] !== undefined) {
      sets.push(`#${field} = :${field}`)
      names[`#${field}`] = field
      values[`:${field}`] = patch[field]
    }
  }
  if (sets.length === 0) {
    const all = await getLeavePolicies()
    const existing = all.find((p) => p.id === id)
    if (!existing) throw new Error(`Unknown policy ${id}`)
    return existing
  }
  const out = await ddb.send(
    new UpdateCommand({
      TableName: TableNames.policies,
      Key: { id },
      UpdateExpression: `SET ${sets.join(', ')}`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
      ConditionExpression: 'attribute_exists(id)',
      ReturnValues: 'ALL_NEW',
    }),
  )
  return out.Attributes as LeavePolicy
}
