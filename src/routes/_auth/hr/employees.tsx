import { useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { ChevronRight, UserPlus } from 'lucide-react'
import type { UserInput, UserRole } from '#/types'
import { useCreateUser, useDepartments, useUsers } from '#/queries/directory'
import { ApiError } from '#/lib/api'
import { PageHeader, PageLoader } from '#/components/ui/Feedback'
import { Card } from '#/components/ui/Card'
import { Pill } from '#/components/ui/Badge'
import { Button } from '#/components/ui/Button'
import { Modal } from '#/components/ui/Modal'
import { FieldGroup, Input, Select } from '#/components/ui/Field'

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
  const [adding, setAdding] = useState(false)

  if (users.isPending || departments.isPending) return <PageLoader />
  const deptName = new Map(
    (departments.data ?? []).map((d) => [d.id, d.name]),
  )
  const nameById = new Map((users.data ?? []).map((u) => [u.id, u.name]))

  return (
    <div>
      <PageHeader
        title="Employees"
        description="Profiles, reporting lines and balances."
        action={
          <Button icon={<UserPlus className="size-4" />} onClick={() => setAdding(true)}>
            Add employee
          </Button>
        }
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
                      ? `Reports to ${nameById.get(u.managerId)}`
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

      {adding && <AddEmployeeModal onClose={() => setAdding(false)} />}
    </div>
  )
}

function AddEmployeeModal({ onClose }: { onClose: () => void }) {
  const users = useUsers()
  const departments = useDepartments()
  const createUser = useCreateUser()

  const managers = (users.data ?? []).filter(
    (u) => u.role === 'manager' || u.role === 'hr',
  )
  const [form, setForm] = useState<UserInput>({
    name: '',
    email: '',
    role: 'employee',
    managerId: managers[0]?.id ?? null,
    departmentId: departments.data?.[0]?.id ?? '',
  })
  const [error, setError] = useState<string | null>(null)

  const canSubmit =
    form.name.trim().length > 0 &&
    form.email.trim().length > 0 &&
    form.departmentId.length > 0

  function submit() {
    setError(null)
    createUser.mutate(form, {
      onSuccess: onClose,
      onError: (err) =>
        setError(err instanceof ApiError ? err.message : 'Could not create user.'),
    })
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Add employee"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!canSubmit || createUser.isPending} onClick={submit}>
            {createUser.isPending ? 'Creating…' : 'Create employee'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <FieldGroup label="Full name" htmlFor="name">
          <Input
            id="name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Jordan Lee"
          />
        </FieldGroup>
        <FieldGroup label="Email" htmlFor="email">
          <Input
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="jordan@atiom.app"
          />
        </FieldGroup>
        <FieldGroup label="Role" htmlFor="role">
          <Select
            id="role"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
          >
            <option value="employee">Employee</option>
            <option value="manager">Manager</option>
            <option value="hr">HR / Admin</option>
          </Select>
        </FieldGroup>
        <FieldGroup label="Department" htmlFor="department">
          <Select
            id="department"
            value={form.departmentId}
            onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
          >
            {(departments.data ?? []).map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
        </FieldGroup>
        <FieldGroup label="Reports to" htmlFor="manager">
          <Select
            id="manager"
            value={form.managerId ?? ''}
            onChange={(e) =>
              setForm({ ...form, managerId: e.target.value || null })
            }
          >
            <option value="">No manager</option>
            {managers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({ROLE_LABEL[m.role]})
              </option>
            ))}
          </Select>
        </FieldGroup>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </Modal>
  )
}
