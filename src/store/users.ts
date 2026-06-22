import type { User } from '#/types'
import { getStore, mutateStore } from './index'

export function getUsers(): User[] {
  return getStore().users
}

export function getUserById(id: string): User | undefined {
  return getStore().users.find((u) => u.id === id)
}

export function getDirectReports(managerId: string): User[] {
  return getStore().users.filter((u) => u.managerId === managerId)
}

export function getDepartments() {
  return getStore().departments
}

export function updateUser(id: string, patch: Partial<User>): User {
  return mutateStore((store) => {
    const idx = store.users.findIndex((u) => u.id === id)
    if (idx === -1) throw new Error(`Unknown user ${id}`)
    store.users[idx] = { ...store.users[idx], ...patch, id }
    return store.users[idx]
  })
}
