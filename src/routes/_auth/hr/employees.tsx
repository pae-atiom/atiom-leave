import { Link, createFileRoute } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
import type { UserRole } from '#/types'
import { useDepartments, useUsers } from '#/queries/directory'
import { getUserById } from '#/store/users'
import { PageHeader, PageLoader } from '#/components/ui/Feedback'
import { Card } from '#/components/ui/Card'
import { Pill } from '#/components/ui/Badge'

export const Route = createFileRoute('/_auth/hr/employees')({
  component: Employees,
})

const ROLE_LABEL: Record<UserRole, string> = {
  employee: 'Employee',
  manager: 'Manager',
  hr: 'HR / Admin',
}

function Employees() {
  const users = useUsers()
  const departments = useDepartments()

  if (users.isPending || departments.isPending) return <PageLoader />
  const deptName = new Map(
    (departments.data ?? []).map((d) => [d.id, d.name]),
  )

  return (
    <div>
      <PageHeader
        title="Employees"
        description="Profiles, reporting lines and balances."
      />
      <Card className="overflow-hidden">
        <ul className="divide-y divide-slate-100">
          {(users.data ?? []).map((u) => (
            <li key={u.id}>
              <Link
                to="/hr/employees/$id"
                params={{ id: u.id }}
                className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-slate-50"
              >
                <span className="flex size-9 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
                  {u.avatarInitials}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-900">{u.name}</p>
                  <p className="truncate text-sm text-slate-500">
                    {deptName.get(u.departmentId)} ·{' '}
                    {u.managerId
                      ? `Reports to ${getUserById(u.managerId)?.name}`
                      : 'No manager'}
                  </p>
                </div>
                <Pill>{ROLE_LABEL[u.role]}</Pill>
                <ChevronRight className="size-4 text-slate-300" />
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
