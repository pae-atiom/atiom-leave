import type { AppStore, AuditLogEntry } from '#/types'
import { getStore } from './index'

export function getAuditLog(): AuditLogEntry[] {
  return getStore().auditLog
}

export function getAuditByRequest(requestId: string): AuditLogEntry[] {
  return getStore()
    .auditLog.filter((e) => e.requestId === requestId)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
}

/** Append an entry to an already-held store (used inside other mutations). */
export function appendAudit(store: AppStore, entry: AuditLogEntry): void {
  store.auditLog.push(entry)
}
