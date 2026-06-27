import {
  CalendarDays,
  CalendarPlus,
  ClipboardList,
  FileSpreadsheet,
  LayoutDashboard,
  ListChecks,
  Settings2,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { UserRole } from '#/types'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

export const NAV_BY_ROLE: Record<UserRole, NavItem[]> = {
  employee: [
    { to: '/employee/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/employee/request/new', label: 'Request leave', icon: CalendarPlus },
    { to: '/employee/history', label: 'My requests', icon: ClipboardList },
    { to: '/employee/calendar', label: 'Company calendar', icon: CalendarDays },
  ],
  manager: [
    { to: '/manager/dashboard', label: 'Approvals', icon: ListChecks },
    { to: '/manager/team', label: 'Team balances', icon: Users },
    { to: '/manager/calendar', label: 'Team calendar', icon: CalendarDays },
  ],
  hr: [
    { to: '/hr/dashboard', label: 'Overview', icon: LayoutDashboard },
    { to: '/hr/employees', label: 'Employees', icon: Users },
    { to: '/hr/policies', label: 'Leave policies', icon: Settings2 },
    { to: '/hr/records', label: 'All records', icon: FileSpreadsheet },
    { to: '/hr/calendar', label: 'Company calendar', icon: CalendarDays },
  ],
}
