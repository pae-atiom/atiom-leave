import { DayPicker } from 'react-day-picker'
import 'react-day-picker/style.css'

function dateToIso(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function isoToDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Multi-select calendar. Emits a sorted list of ISO date strings. */
export function MultiDatePicker({
  value,
  onChange,
}: {
  value: string[]
  onChange: (dates: string[]) => void
}) {
  const selected = value.map(isoToDate)

  return (
    <div className="rounded-xl bg-white p-2 ring-1 ring-slate-200">
      <DayPicker
        mode="multiple"
        selected={selected}
        onSelect={(days) =>
          onChange((days ?? []).map(dateToIso).sort())
        }
        showOutsideDays
        styles={{
          day: { borderRadius: '8px' },
        }}
        modifiersClassNames={{
          selected: 'rdp-selected-brand',
        }}
      />
      <style>{`
        .rdp-root { --rdp-accent-color: var(--color-brand-600); --rdp-accent-background-color: var(--color-brand-50); margin: 0; }
        .rdp-today:not(.rdp-selected-brand) { color: var(--color-brand-600); font-weight: 600; }
        .rdp-selected-brand .rdp-day_button {
          background-color: var(--color-brand-600);
          color: white;
          border: 2px solid var(--color-brand-600);
          border-radius: 8px;
          font-weight: 600;
        }
        .rdp-selected-brand .rdp-day_button:hover {
          background-color: var(--color-brand-700);
          border-color: var(--color-brand-700);
        }
      `}</style>
    </div>
  )
}
