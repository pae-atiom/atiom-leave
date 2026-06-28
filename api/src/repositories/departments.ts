import { ScanCommand } from '@aws-sdk/lib-dynamodb'
import type { Department } from '#shared/types'
import { ddb, TableNames } from '../db'

export async function getDepartments(): Promise<Department[]> {
  const out = await ddb.send(
    new ScanCommand({ TableName: TableNames.departments }),
  )
  return (out.Items ?? []) as Department[]
}
