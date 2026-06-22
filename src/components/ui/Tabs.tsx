import { cn } from '#/lib/utils'

export interface TabItem<T extends string = string> {
  value: T
  label: string
  count?: number
}

export function Tabs<T extends string>({
  items,
  value,
  onChange,
  className,
}: {
  items: TabItem<T>[]
  value: T
  onChange: (value: T) => void
  className?: string
}) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-lg bg-slate-100 p-1',
        className,
      )}
    >
      {items.map((item) => (
        <button
          key={item.value}
          onClick={() => onChange(item.value)}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
            value === item.value
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700',
          )}
        >
          {item.label}
          {item.count !== undefined && (
            <span
              className={cn(
                'rounded-full px-1.5 text-xs',
                value === item.value
                  ? 'bg-brand-100 text-brand-700'
                  : 'bg-slate-200 text-slate-600',
              )}
            >
              {item.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
