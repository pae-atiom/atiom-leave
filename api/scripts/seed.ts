// Write the demo dataset to DynamoDB via BatchWrite.
//   bun run api:seed   (run after `bun run api:tables`)
// Reuses the exact seed data from `shared/seed.ts` so local mirrors the old POC.

import { BatchWriteCommand } from '@aws-sdk/lib-dynamodb'
import { buildSeedDataset } from '#shared/seed'
import { ddb, TableNames } from '../src/db'
import {
  toAuditItem,
  toBalanceItem,
  toNotificationItem,
  toReqItem,
  toUserItem,
} from '../src/repositories/_mappers'

type PutRequest = { PutRequest: { Item: Record<string, unknown> } }

async function batchWrite(table: string, items: Record<string, unknown>[]) {
  for (let i = 0; i < items.length; i += 25) {
    const chunk = items.slice(i, i + 25)
    const requests: PutRequest[] = chunk.map((Item) => ({ PutRequest: { Item } }))
    let unprocessed: Record<string, PutRequest[]> = { [table]: requests }
    // Retry any unprocessed items a few times (BatchWrite is best-effort).
    for (let attempt = 0; attempt < 5 && unprocessed[table]?.length; attempt++) {
      const out = await ddb.send(
        new BatchWriteCommand({ RequestItems: unprocessed }),
      )
      unprocessed = (out.UnprocessedItems ?? {}) as Record<string, PutRequest[]>
    }
    if (unprocessed[table]?.length) {
      throw new Error(`Failed to write ${unprocessed[table].length} items to ${table}`)
    }
  }
}

async function main() {
  if (!process.env.DYNAMODB_ENDPOINT) {
    console.warn('⚠  DYNAMODB_ENDPOINT not set — refusing to seed real AWS.')
    process.exit(1)
  }

  const data = buildSeedDataset()

  await batchWrite(TableNames.users, data.users.map(toUserItem))
  await batchWrite(TableNames.departments, data.departments)
  await batchWrite(TableNames.policies, data.leavePolicies)
  await batchWrite(TableNames.balances, data.leaveBalances.map(toBalanceItem))
  await batchWrite(TableNames.notifications, data.notifications.map(toNotificationItem))
  // Requests table holds both REQ items and co-located AUDIT items.
  await batchWrite(TableNames.requests, [
    ...data.leaveRequests.map(toReqItem),
    ...data.auditLog.map(toAuditItem),
  ])

  console.log(
    `Seeded: ${data.users.length} users, ${data.leaveRequests.length} requests, ` +
      `${data.auditLog.length} audit, ${data.leaveBalances.length} balances, ` +
      `${data.notifications.length} notifications.`,
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
