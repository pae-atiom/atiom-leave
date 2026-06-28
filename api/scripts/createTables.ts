// Create (or reset) all DynamoDB tables locally from the shared schema.
//   bun run api:tables
// Drops any existing table of the same name first so it is idempotent.

import {
  CreateTableCommand,
  DeleteTableCommand,
  ListTablesCommand,
  waitUntilTableExists,
  waitUntilTableNotExists,
} from '@aws-sdk/client-dynamodb'
import { rawClient } from '../src/db'
import { TableSchemas } from '../src/tables'

async function existingTables(): Promise<Set<string>> {
  const names = new Set<string>()
  let start: string | undefined
  do {
    const out = await rawClient.send(
      new ListTablesCommand({ ExclusiveStartTableName: start }),
    )
    for (const n of out.TableNames ?? []) names.add(n)
    start = out.LastEvaluatedTableName
  } while (start)
  return names
}

async function main() {
  if (!process.env.DYNAMODB_ENDPOINT) {
    console.warn(
      '⚠  DYNAMODB_ENDPOINT not set — refusing to run against real AWS. ' +
        'Set it (e.g. http://localhost:8000) for local dev.',
    )
    process.exit(1)
  }

  const existing = await existingTables()
  for (const schema of TableSchemas) {
    const name = schema.TableName!
    if (existing.has(name)) {
      console.log(`↺ dropping ${name}`)
      await rawClient.send(new DeleteTableCommand({ TableName: name }))
      await waitUntilTableNotExists(
        { client: rawClient, maxWaitTime: 30 },
        { TableName: name },
      )
    }
    await rawClient.send(new CreateTableCommand(schema))
    await waitUntilTableExists(
      { client: rawClient, maxWaitTime: 30 },
      { TableName: name },
    )
    console.log(`✓ created ${name}`)
  }
  console.log('All tables ready.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
