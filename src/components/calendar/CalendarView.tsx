import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, EyeOff } from 'lucide-react'
import type { DayDuration, LeaveTypeName } from '#/types'
import { cn } from '#/lib/utils'
import { LEAVE_TYPE_LABEL } from '#/lib/labels'
import { Tabs } from '#/components/ui/Tabs'

export interface CalendarLeave {
  requestId: string
  employeeName: string
  leaveType: LeaveTypeName
  date: string // ISO YYYY-MM-DD
  duration: DayDuration
  showType?: boolean // false = viewer may see name only, not the leave type
}

const COLORS: Record<LeaveTypeName, string> = {
  annual: 'bg-brand-100 text-brand-700',
  sick: 'bg-rose-100 text-rose-700',
  birthday: 'bg-pink-100 text-pink-700',
  bereavement: 'bg-slate-200 text-slate-700',
  maternity: 'bg-purple-100 text-purple-700',
  paternity: 'bg-cyan-100 text-cyan-700',
  lwop: 'bg-amber-100 text-amber-700',
  personal: 'bg-emerald-100 text-emerald-700',
}

const DURATION_LABEL: Record<DayDuration, string> = {
  full: 'Full day',
  morning_half: 'Morning (half day)',
  afternoon_half: 'Afternoon (half day)',
}

const DOT: Record<LeaveTypeName, string> = {
  annual: 'bg-brand-500',
  sick: 'bg-rose-500',
  birthday: 'bg-pink-500',
  bereavement: 'bg-slate-500',
  maternity: 'bg-purple-500',
  paternity: 'bg-cyan-500',
  lwop: 'bg-amber-500',
  personal: 'bg-emerald-500',
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function isoOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function startOfWeek(d: Date): Date {
  const out = new Date(d)
  out.setDate(d.getDate() - d.getDay())
  return out
}

export function CalendarView({
  leaves,
  privacy = false,
  onTogglePrivacy,
  initialMonth,
}: {
  leaves: CalendarLeave[]
  privacy?: boolean
  onTogglePrivacy?: () => void
  initialMonth?: Date
}) {
  const [view, setView] = useState<'month' | 'week'>('month')
  const [cursor, setCursor] = useState(() => initialMonth ?? new Date())
  const [hover, setHover] = useState<{
    name: string
    typeLabel: string | null
    durationLabel: string | null
    dateLabel: string
    dot: string | null
    x: number
    y: number
  } | null>(null)

  const byDate = useMemo(() => {
    const map = new Map<string, CalendarLeave[]>()
    for (const l of leaves) {
      const arr = map.get(l.date) ?? []
      arr.push(l)
      map.set(l.date, arr)
    }
    return map
  }, [leaves])

  const days = useMemo(() => {
    if (view === 'week') {
      const start = startOfWeek(cursor)
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(start)
        d.setDate(start.getDate() + i)
        return d
      })
    }
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
    const gridStart = startOfWeek(first)
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(gridStart)
      d.setDate(gridStart.getDate() + i)
      return d
    })
  }, [cursor, view])

  function shift(delta: number) {
    setCursor((prev) => {
      const next = new Date(prev)
      if (view === 'week') next.setDate(prev.getDate() + delta * 7)
      else next.setMonth(prev.getMonth() + delta)
      return next
    })
  }

  const todayIso = isoOf(new Date())

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => shift(-1)}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            aria-label="Previous"
          >
            <ChevronLeft className="size-5" />
          </button>
          <span className="min-w-44 text-center text-base font-semibold text-slate-900">
            {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
          </span>
          <button
            onClick={() => shift(1)}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            aria-label="Next"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          {onTogglePrivacy && (
            <button
              onClick={onTogglePrivacy}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium ring-1 ring-inset',
                privacy
                  ? 'bg-brand-600 text-white ring-brand-600'
                  : 'bg-surface text-slate-600 ring-slate-200 hover:bg-slate-50',
              )}
            >
              <EyeOff className="size-4" /> Hide details
            </button>
          )}
          <Tabs<'month' | 'week'>
            value={view}
            onChange={setView}
            items={[
              { value: 'month', label: 'Month' },
              { value: 'week', label: 'Week' },
            ]}
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl bg-surface ring-1 ring-slate-200">
        <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/60">
          {WEEKDAYS.map((w) => (
            <div
              key={w}
              className="px-2 py-2 text-center text-xs font-medium text-slate-400"
            >
              {w}
            </div>
          ))}
        </div>
        <div
          className={cn(
            'grid grid-cols-7',
            view === 'month' ? 'grid-rows-6' : 'grid-rows-1',
          )}
        >
          {days.map((d) => {
            const iso = isoOf(d)
            const events = byDate.get(iso) ?? []
            const inMonth = d.getMonth() === cursor.getMonth() || view === 'week'
            return (
              <div
                key={iso}
                className={cn(
                  'min-h-24 border-b border-r border-slate-100 p-1.5',
                  !inMonth && 'bg-slate-50/40',
                )}
              >
                <div
                  className={cn(
                    'mb-1 flex size-6 items-center justify-center rounded-full text-xs',
                    iso === todayIso
                      ? 'bg-brand-600 font-semibold text-white'
                      : inMonth
                        ? 'text-slate-600'
                        : 'text-slate-300',
                  )}
                >
                  {d.getDate()}
                </div>
                <div className="flex flex-col gap-1">
                  {events.slice(0, 3).map((e, i) => {
                    const hideType = privacy || e.showType === false
                    const dateLabel = d.toLocaleDateString(undefined, {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })
                    const showCard = (ev: { clientX: number; clientY: number }) =>
                      setHover({
                        name: e.employeeName,
                        typeLabel: hideType ? null : LEAVE_TYPE_LABEL[e.leaveType],
                        durationLabel: hideType ? null : DURATION_LABEL[e.duration],
                        dateLabel,
                        dot: hideType ? null : DOT[e.leaveType],
                        x: ev.clientX,
                        y: ev.clientY,
                      })
                    return (
                      <div
                        key={`${e.requestId}-${i}`}
                        onMouseEnter={showCard}
                        onMouseMove={showCard}
                        onMouseLeave={() => setHover(null)}
                        className={cn(
                          'cursor-default truncate rounded px-1.5 py-0.5 text-[11px] font-medium',
                          hideType ? 'bg-slate-100 text-slate-500' : COLORS[e.leaveType],
                        )}
                      >
                        {privacy
                          ? `${e.employeeName.split(' ')[0]} · off`
                          : e.employeeName.split(' ')[0]}
                        {e.duration !== 'full' && !hideType && ' ½'}
                      </div>
                    )
                  })}
                  {events.length > 3 && (
                    <span className="px-1 text-[11px] text-slate-400">
                      +{events.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {hover && (
        <div
          className="pointer-events-none fixed z-50 max-w-xs -translate-x-1/2 -translate-y-full space-y-1 rounded-lg bg-surface px-3 py-2 text-xs shadow-lg ring-1 ring-slate-200"
          style={{ left: hover.x, top: hover.y - 8 }}
        >
          <div className="font-semibold text-slate-900">{hover.name}</div>
          {hover.typeLabel && (
            <div className="flex items-center gap-1.5 text-slate-700">
              {hover.dot && (
                <span className={cn('size-2 rounded-full', hover.dot)} />
              )}
              {hover.typeLabel}
            </div>
          )}
          {hover.durationLabel && (
            <div className="text-slate-500">{hover.durationLabel}</div>
          )}
          <div className="text-slate-400">{hover.dateLabel}</div>
        </div>
      )}
    </div>
  )
}
