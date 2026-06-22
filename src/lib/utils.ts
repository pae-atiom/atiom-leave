// Small shared utilities: classNames, id/time helpers, date formatting, CSV export.

/** Join class names, dropping falsy values. Tiny clsx replacement. */
export function cn(
  ...classes: Array<string | false | null | undefined>
): string {
  return classes.filter(Boolean).join(' ')
}

let idCounter = 0
/** Monotonic-ish unique id with a prefix. Good enough for a client-only POC. */
export function generateId(prefix = 'id'): string {
  idCounter += 1
  return `${prefix}_${Date.now().toString(36)}_${idCounter.toString(36)}`
}

export function nowIso(): string {
  return new Date().toISOString()
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export const CURRENT_YEAR = new Date().getFullYear()

// ─── Date formatting ──────────────────────────────────────────────────────────

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

/** "2026-06-22" → "22 Jun 2026". Accepts ISO date or datetime. */
export function formatDate(iso: string): string {
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso)
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

/** "22 Jun 2026, 14:30" for audit timestamps. */
export function formatDateTime(iso: string): string {
  const d = new Date(iso)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${formatDate(iso)}, ${hh}:${mm}`
}

/** Compact range label for a list of ISO dates, e.g. "22–24 Jun 2026". */
export function formatDateRange(dates: string[]): string {
  if (dates.length === 0) return '—'
  const sorted = [...dates].sort()
  if (sorted.length === 1) return formatDate(sorted[0])
  return `${formatDate(sorted[0])} → ${formatDate(sorted[sorted.length - 1])}`
}

/** Inclusive list of ISO dates between two ISO dates. */
export function eachDateInclusive(startIso: string, endIso: string): string[] {
  const out: string[] = []
  const start = new Date(`${startIso}T00:00:00`)
  const end = new Date(`${endIso}T00:00:00`)
  for (let d = start; d <= end; d.setDate(d.getDate() + 1)) {
    out.push(d.toISOString().slice(0, 10))
  }
  return out
}

/** Format a day count: 1 → "1 day", 0.5 → "0.5 days", 2 → "2 days". */
export function formatDays(n: number): string {
  return `${n} ${n === 1 ? 'day' : 'days'}`
}

// ─── CSV export ───────────────────────────────────────────────────────────────

function csvCell(value: unknown): string {
  const s = String(value ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** Build a CSV string from a header row and matching value rows. */
export function toCsv(headers: string[], rows: Array<Array<unknown>>): string {
  const lines = [headers.map(csvCell).join(',')]
  for (const row of rows) lines.push(row.map(csvCell).join(','))
  return lines.join('\n')
}

/** Trigger a browser download of text content. No-op outside the browser. */
export function downloadFile(
  filename: string,
  content: string,
  mime = 'text/csv;charset=utf-8',
): void {
  if (typeof document === 'undefined') return
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
