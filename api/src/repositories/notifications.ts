import { QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import type { Notification, NotificationType } from '#shared/types'
import { generateId, nowIso } from '#shared/ids'
import { ddb, TableNames } from '../db'
import { fromNotificationItem, notificationSk } from './_mappers'

export async function getNotificationsForUser(
  userId: string,
): Promise<Notification[]> {
  const out = await ddb.send(
    new QueryCommand({
      TableName: TableNames.notifications,
      KeyConditionExpression: 'recipientId = :r',
      ExpressionAttributeValues: { ':r': userId },
      ScanIndexForward: false, // sk = "<createdAt>#<id>" → newest first
    }),
  )
  return (out.Items ?? []).map(fromNotificationItem)
}

/** Build a fresh Notification (used inside request transactions). */
export function newNotification(params: {
  recipientId: string
  type: NotificationType
  requestId: string | null
  message: string
}): Notification {
  return {
    id: generateId('notif'),
    recipientId: params.recipientId,
    type: params.type,
    requestId: params.requestId,
    message: params.message,
    isRead: false,
    createdAt: nowIso(),
  }
}

export async function markNotificationRead(
  recipientId: string,
  id: string,
): Promise<void> {
  // sk embeds createdAt which the client doesn't send, so locate the row first.
  const out = await ddb.send(
    new QueryCommand({
      TableName: TableNames.notifications,
      KeyConditionExpression: 'recipientId = :r',
      FilterExpression: 'id = :id',
      ExpressionAttributeValues: { ':r': recipientId, ':id': id },
    }),
  )
  const item = out.Items?.[0]
  if (!item) return
  await ddb.send(
    new UpdateCommand({
      TableName: TableNames.notifications,
      Key: { recipientId, sk: item.sk },
      UpdateExpression: 'SET isRead = :t',
      ExpressionAttributeValues: { ':t': true },
    }),
  )
}

export async function markAllNotificationsRead(
  recipientId: string,
): Promise<void> {
  const out = await ddb.send(
    new QueryCommand({
      TableName: TableNames.notifications,
      KeyConditionExpression: 'recipientId = :r',
      FilterExpression: 'isRead = :f',
      ExpressionAttributeValues: { ':r': recipientId, ':f': false },
    }),
  )
  await Promise.all(
    (out.Items ?? []).map((item) =>
      ddb.send(
        new UpdateCommand({
          TableName: TableNames.notifications,
          Key: { recipientId, sk: item.sk },
          UpdateExpression: 'SET isRead = :t',
          ExpressionAttributeValues: { ':t': true },
        }),
      ),
    ),
  )
}

export { notificationSk }
