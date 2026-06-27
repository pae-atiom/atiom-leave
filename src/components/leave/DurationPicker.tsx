import { Sun, SunDim, Sunrise, Sunset } from 'lucide-react'
import type { DayDuration } from '#/types'
import { cn, formatDate } from '#/lib/utils'

const OPTIONS: Array<{ value: DayDuration; label: string; icon: typeof Sun }> = [
  { value: 'full', label: 'Full day', icon: Sun },
  { value: 'morning_half', label: 'Morning', icon: Sunrise },
  { value: 'afternoon_half', label: 'Afternoon', icon: Sunset },
]

/** Per-date Full / Morning / Afternoon segmented control. */
export function DurationPicker({
  dates,
  durations,
  onChange,
}: {
  dates: string[]
  durations: Record<string, DayDuration>
  onChange: (date: string, duration: DayDuration) => void
}) {
  if (dates.length === 0) {
    return (
      <p className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-3 text-sm text-slate-400">
        <SunDim className="size-4" />
        Select one or more dates first.
      </p>
    )
  }

  return (
    <ul className="flex flex-col gap-2">
      {dates.map((date) => {
        const current = durations[date] ?? 'full'
        return (
          <li
            key={date}
            className="flex flex-col gap-2 rounded-lg bg-slate-50 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
          >
            <span className="text-sm font-medium text-slate-700">
              {formatDate(date)}
            </span>
            <div className="inline-flex items-center gap-1 rounded-lg bg-surface p-1 ring-1 ring-slate-200">
              {OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onChange(date, opt.value)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                    current === opt.value
                      ? 'bg-brand-600 text-white'
                      : 'text-slate-500 hover:bg-slate-100',
                  )}
                >
                  <opt.icon className="size-3.5" />
                  {opt.label}
                </button>
              ))}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
