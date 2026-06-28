import { RemovalPolicy } from 'aws-cdk-lib'
import {
  AttributeType,
  BillingMode,
  Table,
} from 'aws-cdk-lib/aws-dynamodb'
import type { Construct } from 'constructs'

export interface Tables {
  users: Table
  departments: Table
  policies: Table
  requests: Table
  balances: Table
  notifications: Table
}

/**
 * Mirrors api/src/tables.ts so the deployed schema matches the local one.
 * `${prefix}` is e.g. `atiom-leave-dev`.
 */
export function createTables(scope: Construct, prefix: string): Tables {
  const common = {
    billingMode: BillingMode.PAY_PER_REQUEST,
    removalPolicy: RemovalPolicy.DESTROY, // POC: tear down with the stack
  }

  const users = new Table(scope, 'Users', {
    tableName: `${prefix}-Users`,
    partitionKey: { name: 'id', type: AttributeType.STRING },
    ...common,
  })
  users.addGlobalSecondaryIndex({
    indexName: 'byEmail',
    partitionKey: { name: 'email', type: AttributeType.STRING },
  })
  users.addGlobalSecondaryIndex({
    indexName: 'byManager',
    partitionKey: { name: 'managerId', type: AttributeType.STRING },
    sortKey: { name: 'name', type: AttributeType.STRING },
  })

  const departments = new Table(scope, 'Departments', {
    tableName: `${prefix}-Departments`,
    partitionKey: { name: 'id', type: AttributeType.STRING },
    ...common,
  })

  const policies = new Table(scope, 'LeavePolicies', {
    tableName: `${prefix}-LeavePolicies`,
    partitionKey: { name: 'id', type: AttributeType.STRING },
    ...common,
  })

  const requests = new Table(scope, 'LeaveRequests', {
    tableName: `${prefix}-LeaveRequests`,
    partitionKey: { name: 'pk', type: AttributeType.STRING },
    sortKey: { name: 'sk', type: AttributeType.STRING },
    ...common,
  })
  requests.addGlobalSecondaryIndex({
    indexName: 'byEmployee',
    partitionKey: { name: 'employeeId', type: AttributeType.STRING },
    sortKey: { name: 'createdAt', type: AttributeType.STRING },
  })
  requests.addGlobalSecondaryIndex({
    indexName: 'byManager',
    partitionKey: { name: 'managerId', type: AttributeType.STRING },
    sortKey: { name: 'createdAt', type: AttributeType.STRING },
  })
  requests.addGlobalSecondaryIndex({
    indexName: 'byStatus',
    partitionKey: { name: 'status', type: AttributeType.STRING },
    sortKey: { name: 'updatedAt', type: AttributeType.STRING },
  })

  const balances = new Table(scope, 'LeaveBalances', {
    tableName: `${prefix}-LeaveBalances`,
    partitionKey: { name: 'userId', type: AttributeType.STRING },
    sortKey: { name: 'sk', type: AttributeType.STRING },
    ...common,
  })

  const notifications = new Table(scope, 'Notifications', {
    tableName: `${prefix}-Notifications`,
    partitionKey: { name: 'recipientId', type: AttributeType.STRING },
    sortKey: { name: 'sk', type: AttributeType.STRING },
    ...common,
  })

  return { users, departments, policies, requests, balances, notifications }
}
