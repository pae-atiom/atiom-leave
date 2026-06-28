// Transaction helpers. Multi-entity mutations use TransactWriteCommand to keep
// the all-or-nothing semantics of the old `mutateStore`. Balance updates carry
// an optimistic condition on the prior `used`, so we retry the whole
// transaction a few times on ConditionalCheckFailed.

import {
  TransactWriteCommand,
  type TransactWriteCommandInput,
} from '@aws-sdk/lib-dynamodb'
import { ddb } from '../db'

type TxItem = NonNullable<TransactWriteCommandInput['TransactItems']>[number]

export async function transactWrite(items: TxItem[]): Promise<void> {
  await ddb.send(new TransactWriteCommand({ TransactItems: items }))
}

function isConditionalFailure(err: unknown): boolean {
  const e = err as { name?: string; CancellationReasons?: Array<{ Code?: string }> }
  if (e?.name === 'ConditionalCheckFailedException') return true
  if (e?.name === 'TransactionCanceledException') {
    return (e.CancellationReasons ?? []).some(
      (r) => r?.Code === 'ConditionalCheckFailed',
    )
  }
  return false
}

/** Run `fn` (which reads then transacts), retrying on optimistic-lock failure. */
export async function withRetry<T>(fn: () => Promise<T>, attempts = 5): Promise<T> {
  let lastErr: unknown
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn()
    } catch (err) {
      if (!isConditionalFailure(err)) throw err
      lastErr = err
    }
  }
  throw lastErr
}
