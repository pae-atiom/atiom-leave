import {
  Ban,
  Check,
  CircleDot,
  FilePen,
  RotateCcw,
  Send,
  Settings2,
  X,
} from 'lucide-react'
import type { AuditAction, AuditLogEntry } from '#/types'
import { formatDateTime } from '#/lib/utils'
import { AUDIT_LABEL } from '#/lib/labels'
import { getUserById } from '#/store/users'

const ICON: Record<AuditAction, typeof Send> = {
  submitted: Send,
  approved: Check,
  rejected: X,
  edited: FilePen,
  cancel_requested: RotateCcw,
  cancel_approved: Ban,
  cancel_denied: CircleDot,
  balance_adjusted: Settings2,
}

const TONE: Record<AuditAction, string> = {
  submitted: 'bg-brand-100 text-brand-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  edited: 'bg-amber-100 text-amber-700',
  cancel_requested: 'bg-orange-100 text-orange-700',
  cancel_approved: 'bg-slate-200 text-slate-600',
  cancel_denied: 'bg-slate-200 text-slate-600',
  balance_adjusted: 'bg-purple-100 text-purple-700',
}

export function AuditTrail({ entries }: { entries: AuditLogEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-sm text-slate-400">No activity recorded.</p>
  }
  return (
    <ol className="flex flex-col">
      {entries.map((entry, i) => {
        const Icon = ICON[entry.action]
        const actor = getUserById(entry.actorId)
        return (
          <li key={entry.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={`flex size-7 items-center justify-center rounded-full ${TONE[entry.action]}`}
              >
                <Icon className="size-3.5" />
              </span>
              {i < entries.length - 1 && (
                <span className="w-px flex-1 bg-slate-200" />
              )}
            </div>
            <div className="pb-5">
              <p className="text-sm font-medium text-slate-800">
                {AUDIT_LABEL[entry.action]}
                <span className="font-normal text-slate-500">
                  {' '}
                  by {actor?.name ?? 'Unknown'}
                </span>
              </p>
              <p className="text-xs text-slate-400">
                {formatDateTime(entry.timestamp)}
              </p>
              {entry.note && (
                <p className="mt-1 rounded-md bg-slate-50 px-2.5 py-1.5 text-sm text-slate-600">
                  “{entry.note}”
                </p>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
