// Canonical DynamoDB table definitions — the single source of truth shared by
// the local create-tables script and (mirrored) by the CDK stack. Names are
// prefixed per environment, e.g. `atiom-leave-local-Users`.

import type { CreateTableCommandInput } from '@aws-sdk/client-dynamodb'

export const STAGE = process.env.STAGE ?? 'local'
export const TABLE_PREFIX = process.env.TABLE_PREFIX ?? `atiom-leave-${STAGE}`

export const TableNames = {
  users: process.env.TABLE_USERS ?? `${TABLE_PREFIX}-Users`,
  departments: process.env.TABLE_DEPARTMENTS ?? `${TABLE_PREFIX}-Departments`,
  policies: process.env.TABLE_POLICIES ?? `${TABLE_PREFIX}-LeavePolicies`,
  requests: process.env.TABLE_REQUESTS ?? `${TABLE_PREFIX}-LeaveRequests`,
  balances: process.env.TABLE_BALANCES ?? `${TABLE_PREFIX}-LeaveBalances`,
  notifications:
    process.env.TABLE_NOTIFICATIONS ?? `${TABLE_PREFIX}-Notifications`,
} as const

const PAY_PER_REQUEST = 'PAY_PER_REQUEST' as const
const PROJECT_ALL = { ProjectionType: 'ALL' as const }

/** CreateTable inputs for every table + GSI. Used by `scripts/createTables.ts`. */
export const TableSchemas: CreateTableCommandInput[] = [
  {
    TableName: TableNames.users,
    BillingMode: PAY_PER_REQUEST,
    AttributeDefinitions: [
      { AttributeName: 'id', AttributeType: 'S' },
      { AttributeName: 'email', AttributeType: 'S' },
      { AttributeName: 'managerId', AttributeType: 'S' },
      { AttributeName: 'name', AttributeType: 'S' },
    ],
    KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'byEmail',
        KeySchema: [{ AttributeName: 'email', KeyType: 'HASH' }],
        Projection: PROJECT_ALL,
      },
      {
        IndexName: 'byManager',
        KeySchema: [
          { AttributeName: 'managerId', KeyType: 'HASH' },
          { AttributeName: 'name', KeyType: 'RANGE' },
        ],
        Projection: PROJECT_ALL,
      },
    ],
  },
  {
    TableName: TableNames.departments,
    BillingMode: PAY_PER_REQUEST,
    AttributeDefinitions: [{ AttributeName: 'id', AttributeType: 'S' }],
    KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
  },
  {
    TableName: TableNames.policies,
    BillingMode: PAY_PER_REQUEST,
    AttributeDefinitions: [{ AttributeName: 'id', AttributeType: 'S' }],
    KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
  },
  {
    TableName: TableNames.requests,
    BillingMode: PAY_PER_REQUEST,
    AttributeDefinitions: [
      { AttributeName: 'pk', AttributeType: 'S' },
      { AttributeName: 'sk', AttributeType: 'S' },
      { AttributeName: 'employeeId', AttributeType: 'S' },
      { AttributeName: 'managerId', AttributeType: 'S' },
      { AttributeName: 'status', AttributeType: 'S' },
      { AttributeName: 'createdAt', AttributeType: 'S' },
      { AttributeName: 'updatedAt', AttributeType: 'S' },
    ],
    KeySchema: [
      { AttributeName: 'pk', KeyType: 'HASH' },
      { AttributeName: 'sk', KeyType: 'RANGE' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'byEmployee',
        KeySchema: [
          { AttributeName: 'employeeId', KeyType: 'HASH' },
          { AttributeName: 'createdAt', KeyType: 'RANGE' },
        ],
        Projection: PROJECT_ALL,
      },
      {
        IndexName: 'byManager',
        KeySchema: [
          { AttributeName: 'managerId', KeyType: 'HASH' },
          { AttributeName: 'createdAt', KeyType: 'RANGE' },
        ],
        Projection: PROJECT_ALL,
      },
      {
        IndexName: 'byStatus',
        KeySchema: [
          { AttributeName: 'status', KeyType: 'HASH' },
          { AttributeName: 'updatedAt', KeyType: 'RANGE' },
        ],
        Projection: PROJECT_ALL,
      },
    ],
  },
  {
    TableName: TableNames.balances,
    BillingMode: PAY_PER_REQUEST,
    AttributeDefinitions: [
      { AttributeName: 'userId', AttributeType: 'S' },
      { AttributeName: 'sk', AttributeType: 'S' },
    ],
    KeySchema: [
      { AttributeName: 'userId', KeyType: 'HASH' },
      { AttributeName: 'sk', KeyType: 'RANGE' },
    ],
  },
  {
    TableName: TableNames.notifications,
    BillingMode: PAY_PER_REQUEST,
    AttributeDefinitions: [
      { AttributeName: 'recipientId', AttributeType: 'S' },
      { AttributeName: 'sk', AttributeType: 'S' },
    ],
    KeySchema: [
      { AttributeName: 'recipientId', KeyType: 'HASH' },
      { AttributeName: 'sk', KeyType: 'RANGE' },
    ],
  },
]
